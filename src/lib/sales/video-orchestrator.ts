/**
 * lib/sales/video-orchestrator.ts — 統合オーケストレーター
 *
 * 役割: 全6フェーズのエンジンを統一的に呼び出し、動画制作の全工程を
 *       1回の呼び出しで完了させる。
 *
 * フロー:
 *   1. 診断データ取得 + ナレーション生成（DeepSeek）
 *   2. HyperFrames HTML 生成（buildHyperFramesHtml）
 *   3. ComfyUI 素材生成（背景・アバター・B-Roll・サムネイル・動画）
 *   4. TTS 音声合成（Edge-TTS / CosyVoice / XTTSv2）
 *   5. 文字起こし + 字幕生成（WhisperX / Faster Whisper）
 *   6. OSS レンダラーで動画生成（Remotion / FFCreator / Editly / MoviePy / OpenMontage）
 *   7. R2 アップロード + n8n ディスパッチ
 */

import { getServiceSalesSupabase } from "@/lib/supabase"
import { createR2SignedUploads, sanitizeR2ObjectName } from "./r2-storage"
import { getComfyuiClientConfig, updateComfyuiClientConfig } from "./comfyui-client"
import { deployComfyuiToVast } from "./vast-comfyui-deploy"
import {
  generateComfyUIBackground,
  generateComfyUIAvatar,
  generateComfyUIBroll,
  generateComfyUIThumbnail,
  generateComfyUIVideo,
  generateDiagnosticVideo,
  generateNarrationScript,
  buildHyperFramesHtml,
  generateProfessionalVideo,
  type NarrationScript,
  type ProfessionalVideoOptions,
  type ProfessionalVideoResult,
  type ComfyuiGenerationResult,
} from "./video-generator"
import {
  createVideoJob,
  runVideoJobAction,
  type SalesVideoJob,
  type VideoJobType,
  type VideoTargetPlatform,
  type VideoRenderEngine,
} from "./video-pipeline"
import {
  synthesizeSpeech,
  transcribeAudio,
  synthesizeAndTranscribe,
  type TtsEngine,
  type TtsInput,
  type TranscriptionEngine,
  type TranscriptionInput,
} from "./audio-pipeline"
import {
  renderWithOssEngine,
  type OssRendererType,
  type OssRenderInput,
} from "./oss-renderers"
import { fetchDiagnosticReport, type DiagnosticReportData } from "./diagnostic"
import { findCompanyBySlug, findCompanyById, findCompanyByDomain } from "./companies"
import { normalizeReportLocale } from "./routing"
import { localeToRegion } from "./types"

/* ───── 型定義 ───── */

export interface OrchestratorOptions {
  /** ジョブタイプ */
  jobType?: VideoJobType
  /** ターゲットプラットフォーム */
  targetPlatform?: VideoTargetPlatform
  /** レンダリングエンジン */
  renderEngine?: VideoRenderEngine
  /** OSS レンダラー（renderEngine が "external" の場合に使用） */
  ossRenderer?: OssRendererType
  /** TTS エンジン */
  ttsEngine?: TtsEngine
  /** 文字起こしエンジン */
  transcriptionEngine?: TranscriptionEngine
  /** ComfyUI で背景素材を生成するか */
  generateBackground?: boolean
  /** ComfyUI でアバターを生成するか */
  generateAvatar?: boolean
  /** ComfyUI で B-Roll 素材を生成するか */
  generateBroll?: boolean
  /** ComfyUI でサムネイルを生成するか */
  generateThumbnail?: boolean
  /** ComfyUI で動画を生成するか */
  generateVideo?: boolean
  /** TTS 音声合成をスキップするか */
  skipTts?: boolean
  /** 文字起こしをスキップするか */
  skipTranscription?: boolean
  /** OSS レンダリングをスキップするか */
  skipOssRender?: boolean
  /** n8n ディスパッチをスキップするか */
  skipDispatch?: boolean
  /** 優先度 */
  priority?: number
  /** 依頼者 */
  requestedBy?: string
}

export interface OrchestratorStepResult {
  step: string
  ok: boolean
  durationMs: number
  error?: string
  data?: Record<string, unknown>
}

export interface OrchestratorResult {
  ok: boolean
  /** 全ステップの結果 */
  steps: OrchestratorStepResult[]
  /** 作成されたジョブ */
  job?: SalesVideoJob
  /** 診断動画の結果 */
  diagnostic?: ProfessionalVideoResult["diagnostic"]
  /** ComfyUI 生成結果 */
  comfyui?: ProfessionalVideoResult["comfyui"]
  /** TTS 結果 */
  tts?: Record<string, unknown>
  /** 文字起こし結果 */
  transcription?: Record<string, unknown>
  /** OSS レンダリング結果 */
  ossRender?: Record<string, unknown>
  /** R2 アップロード情報 */
  r2Uploads?: Array<{ objectKey: string; uploadUrl: string; publicUrl: string | null }>
  /** エラーメッセージ */
  error?: string
}

/* ───── ユーティリティ ───── */

function elapsed(start: number): number {
  return Date.now() - start
}

function makeStep(name: string, ok: boolean, start: number, extra?: Partial<OrchestratorStepResult>): OrchestratorStepResult {
  return {
    step: name,
    ok,
    durationMs: elapsed(start),
    ...(extra ?? {}),
  }
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

/* ───── メインオーケストレーター ───── */

/**
 * 統合オーケストレーター。
 * 全エンジンを順次呼び出し、動画制作の全工程を完了させる。
 */
export async function runVideoOrchestrator(
  companyIdOrSlugOrDomain: string,
  options: OrchestratorOptions = {},
): Promise<OrchestratorResult> {
  const steps: OrchestratorStepResult[] = []
  const overallStart = Date.now()

  const {
    jobType = "sales_video",
    targetPlatform = "youtube_16_9",
    renderEngine = "hyperframes",
    ossRenderer,
    ttsEngine = "edge_tts",
    transcriptionEngine = "whisperx",
    generateBackground = false,
    generateAvatar = false,
    generateBroll = false,
    generateThumbnail = true,
    generateVideo = false,
    skipTts = false,
    skipTranscription = false,
    skipOssRender = false,
    skipDispatch = false,
    priority,
    requestedBy,
  } = options

  try {
    /* ───── Step 1: 企業情報解決 ───── */
    const resolveStart = Date.now()
    const requestedLocale = null // will be resolved from company
    const company = await (async () => {
      const c = await findCompanyBySlug(companyIdOrSlugOrDomain, "jp")
      if (c) return c
      if (isUuid(companyIdOrSlugOrDomain)) return findCompanyById(companyIdOrSlugOrDomain)
      if (companyIdOrSlugOrDomain.includes(".")) return findCompanyByDomain(companyIdOrSlugOrDomain)
      return null
    })()

    if (!company) {
      steps.push(makeStep("resolve_company", false, resolveStart, { error: "Company not found" }))
      return { ok: false, steps, error: "Company not found" }
    }
    steps.push(makeStep("resolve_company", true, resolveStart, {
      data: { companyId: company.id, companyName: company.company_name, domain: company.domain },
    }))

    const locale = company.report_locale ?? "ja"
    const companyName = company.company_name ?? companyIdOrSlugOrDomain
    const industry = company.industry ?? "technology"

    /* ───── Step 2: 診断データ取得 + ナレーション生成 ───── */
    const diagStart = Date.now()
    const diagnostic = await generateDiagnosticVideo(companyIdOrSlugOrDomain, locale)
    steps.push(makeStep("diagnostic_video", diagnostic.ok, diagStart, {
      error: diagnostic.error,
      data: { video_url: diagnostic.video_url, hasScript: !!diagnostic.script },
    }))

    /* ───── Step 3: ComfyUI 素材生成 ───── */
    const comfyui: ProfessionalVideoResult["comfyui"] = {}
    const comfyuiStart = Date.now()
    let comfyuiConfig = getComfyuiClientConfig()

    // Vast.ai 自動オーケストレーション
    if (!comfyuiConfig.ready && (generateBackground || generateAvatar || generateBroll || generateThumbnail || generateVideo)) {
      console.log("[Orchestrator] ComfyUI is not ready. Deploying to Vast.ai dynamically...");
      const deployStart = Date.now();
      const deploy = await deployComfyuiToVast({ gpuType: "RTX_4090", disk: 64, workload: "comfyui_full" });
      steps.push(makeStep("vast_comfyui_deploy", deploy.ok, deployStart, { error: deploy.error, data: { url: deploy.comfyuiUrl, instanceId: deploy.instanceId } }));
      
      if (deploy.ok && deploy.comfyuiUrl) {
        // 設定を動的に上書きしてAPIを使えるようにする
        updateComfyuiClientConfig(deploy.comfyuiUrl);
        comfyuiConfig = getComfyuiClientConfig();
      }
    }

    if (comfyuiConfig.ready) {
      if (generateBackground) {
        const bgStart = Date.now()
        comfyui.background = await generateComfyUIBackground({ companyName, industry, locale, description: `${companyName}向け背景素材` })
        steps.push(makeStep("comfyui_background", comfyui.background.ok, bgStart, { error: comfyui.background.error }))
      }
      if (generateAvatar) {
        const avStart = Date.now()
        comfyui.avatar = await generateComfyUIAvatar({ companyName, industry, locale, description: `${companyName}向けアバター` })
        steps.push(makeStep("comfyui_avatar", comfyui.avatar.ok, avStart, { error: comfyui.avatar.error }))
      }
      if (generateBroll) {
        const brStart = Date.now()
        comfyui.broll = await generateComfyUIBroll({ companyName, industry, locale, description: `${companyName}向けB-Roll` })
        steps.push(makeStep("comfyui_broll", comfyui.broll.ok, brStart, { error: comfyui.broll.error }))
      }
      if (generateThumbnail) {
        const thStart = Date.now()
        comfyui.thumbnail = await generateComfyUIThumbnail({ companyName, industry, locale, description: `${companyName}向けサムネイル` })
        steps.push(makeStep("comfyui_thumbnail", comfyui.thumbnail.ok, thStart, { error: comfyui.thumbnail.error }))
      }
      if (generateVideo) {
        const vdStart = Date.now()
        comfyui.video = await generateComfyUIVideo({ companyName, industry, locale, description: `${companyName}向け動画` })
        steps.push(makeStep("comfyui_video", comfyui.video.ok, vdStart, { error: comfyui.video.error }))
      }
    } else {
      steps.push(makeStep("comfyui_skip", true, comfyuiStart, { error: "ComfyUI not configured; skipped" }))
    }

    /* ───── Step 4: TTS 音声合成 ───── */
    let ttsResult: Record<string, unknown> | undefined
    if (!skipTts && diagnostic.script) {
      const ttsStart = Date.now()
      try {
        const script = diagnostic.script as NarrationScript
        const narrationText = [script.hook, script.pain, script.fear, script.hope, script.cta].join(". ")
        const tts = await synthesizeSpeech({
          engine: ttsEngine,
          text: narrationText,
          outputFilename: `narration_${companyIdOrSlugOrDomain.replace(/[^a-zA-Z0-9]/g, "_")}.mp3`,
          locale,
          voice: undefined,
          speed: 1.0,
        })
        ttsResult = { ok: tts.ok, outputPath: tts.outputPath, engine: tts.engine, voice: tts.voice, durationMs: tts.durationMs }
        steps.push(makeStep("tts_synthesis", tts.ok, ttsStart, { error: tts.error, data: ttsResult }))
      } catch (error) {
        steps.push(makeStep("tts_synthesis", false, ttsStart, { error: error instanceof Error ? error.message : String(error) }))
      }
    } else {
      steps.push(makeStep("tts_synthesis", true, Date.now(), { error: skipTts ? "Skipped by option" : "No script available" }))
    }

    /* ───── Step 5: 文字起こし + 字幕生成 ───── */
    let transcriptionResult: Record<string, unknown> | undefined
    if (!skipTranscription && ttsResult?.ok && ttsResult?.outputPath) {
      const txStart = Date.now()
      try {
        const tx = await transcribeAudio({
          engine: transcriptionEngine,
          audioPath: ttsResult.outputPath as string,
          outputFilename: `captions_${companyIdOrSlugOrDomain.replace(/[^a-zA-Z0-9]/g, "_")}.srt`,
          locale,
          format: "srt",
          wordTimestamps: true,
        })
        transcriptionResult = { ok: tx.ok, outputPath: tx.outputPath, engine: tx.engine, segments: tx.segments?.length, words: tx.words?.length }
        steps.push(makeStep("transcription", tx.ok, txStart, { error: tx.error, data: transcriptionResult }))
      } catch (error) {
        steps.push(makeStep("transcription", false, txStart, { error: error instanceof Error ? error.message : String(error) }))
      }
    } else {
      steps.push(makeStep("transcription", true, Date.now(), { error: skipTranscription ? "Skipped by option" : "No TTS audio available" }))
    }

    /* ───── Step 6: OSS レンダリング ───── */
    let ossRenderResult: Record<string, unknown> | undefined
    if (!skipOssRender && ossRenderer && diagnostic.html) {
      const ossStart = Date.now()
      try {
        // Embed ComfyUI assets into the HTML
        let finalHtml = diagnostic.html;
        if (Object.keys(comfyui).length > 0) {
          const assets: Record<string, string> = {};
          if (comfyui.background?.ok && comfyui.background.outputs[0]) assets.background = comfyui.background.outputs[0].url;
          if (comfyui.avatar?.ok && comfyui.avatar.outputs[0]) assets.avatar = comfyui.avatar.outputs[0].url;
          if (comfyui.video?.ok && comfyui.video.outputs[0]) assets.video = comfyui.video.outputs[0].url;
          
          // Re-build HTML with the assets using the updated generator method
          // Or just string replace since we only need to inject tags
          const injectTags = [
            assets.background ? `<img src="${assets.background}" class="comfy-bg" />` : "",
            assets.video ? `<video src="${assets.video}" autoplay loop muted playsinline class="comfy-bg"></video>` : "",
            assets.avatar ? `<img src="${assets.avatar}" class="comfy-avatar" />` : ""
          ].filter(Boolean).join("\n");
          
          if (injectTags) {
            finalHtml = finalHtml.replace('<div class="grid"></div>', `<div class="grid"></div>\n    ${injectTags}`);
          }
        }

        const ossInput: OssRenderInput = {
          renderer: ossRenderer,
          outputFilename: `oss_${companyIdOrSlugOrDomain.replace(/[^a-zA-Z0-9]/g, "_")}.mp4`,
          width: targetPlatform === "shorts_9_16" ? 1080 : 1920,
          height: targetPlatform === "shorts_9_16" ? 1920 : targetPlatform === "linkedin_1_1" ? 1080 : 1080,
          fps: 30,
          durationSec: 60,
          params: { html: finalHtml, locale },
        }
        const oss = await renderWithOssEngine(ossInput)
        ossRenderResult = { ok: oss.ok, outputPath: oss.outputPath, durationMs: oss.durationMs }
        steps.push(makeStep("oss_render", oss.ok, ossStart, { error: oss.error, data: ossRenderResult }))
      } catch (error) {
        steps.push(makeStep("oss_render", false, ossStart, { error: error instanceof Error ? error.message : String(error) }))
      }
    } else {
      steps.push(makeStep("oss_render", true, Date.now(), { error: skipOssRender ? "Skipped by option" : ossRenderer ? "No HTML available" : "No OSS renderer selected" }))
    }

    /* ───── Step 7: パイプラインジョブ作成 ───── */
    const jobStart = Date.now()
    const jobResult = await createVideoJob({
      companyIdOrSlugOrDomain,
      jobType,
      targetPlatform,
      renderEngine: ossRenderer ? "external" : renderEngine,
      targetSegment: undefined,
      offerAngle: undefined,
      productionGenre: undefined,
      qualityTier: undefined,
      lossInputs: undefined,
      reportLocale: locale,
      priority,
      requestedBy,
    })
    steps.push(makeStep("create_job", jobResult.ok, jobStart, { error: jobResult.error }))

    if (!jobResult.ok || !jobResult.job) {
      return {
        ok: false,
        steps,
        diagnostic: { ok: diagnostic.ok, video_url: diagnostic.video_url, script: diagnostic.script, html: diagnostic.html, duration_sec: diagnostic.duration_sec, error: diagnostic.error },
        comfyui: Object.keys(comfyui).length > 0 ? comfyui : undefined,
        tts: ttsResult,
        transcription: transcriptionResult,
        ossRender: ossRenderResult,
        error: jobResult.error ?? "Failed to create pipeline job",
      }
    }

    /* ───── Step 8: R2 アップロード用署名付き URL 生成 ───── */
    const r2Start = Date.now()
    const r2Prefix = jobResult.job.r2_asset_prefix
    let r2Uploads: OrchestratorResult["r2Uploads"] = []

    if (r2Prefix) {
      try {
        const uploadRequests = [
          { objectKey: sanitizeR2ObjectName(`${r2Prefix}master.mp4`), contentType: "video/mp4" },
          { objectKey: sanitizeR2ObjectName(`${r2Prefix}poster.webp`), contentType: "image/webp" },
          { objectKey: sanitizeR2ObjectName(`${r2Prefix}thumbnail.webp`), contentType: "image/webp" },
          { objectKey: sanitizeR2ObjectName(`${r2Prefix}transcript.txt`), contentType: "text/plain" },
          { objectKey: sanitizeR2ObjectName(`${r2Prefix}captions.srt`), contentType: "text/plain" },
          { objectKey: sanitizeR2ObjectName(`${r2Prefix}captions.vtt`), contentType: "text/plain" },
          { objectKey: sanitizeR2ObjectName(`${r2Prefix}source-manifest.json`), contentType: "application/json" },
          { objectKey: sanitizeR2ObjectName(`${r2Prefix}render-metadata.json`), contentType: "application/json" },
        ]

        // ComfyUI 出力も R2 に追加
        for (const [key, result] of Object.entries(comfyui)) {
          if (result?.ok && result.outputs.length > 0) {
            for (let i = 0; i < result.outputs.length; i++) {
              const output = result.outputs[i]
              const ext = output.filename.includes(".") ? output.filename.split(".").pop() : "png"
              uploadRequests.push({
                objectKey: sanitizeR2ObjectName(`${r2Prefix}comfyui/${key}_${i}.${ext}`),
                contentType: ext === "mp4" ? "video/mp4" : ext === "webp" ? "image/webp" : "image/png",
              })
            }
          }
        }

        const signedUploads = await createR2SignedUploads(uploadRequests)
        r2Uploads = signedUploads.map((u) => ({
          objectKey: u.objectKey,
          uploadUrl: u.uploadUrl,
          publicUrl: u.publicUrl,
        }))
        steps.push(makeStep("r2_signed_urls", true, r2Start, { data: { count: r2Uploads.length } }))
      } catch (error) {
        steps.push(makeStep("r2_signed_urls", false, r2Start, { error: error instanceof Error ? error.message : String(error) }))
      }
    } else {
      steps.push(makeStep("r2_signed_urls", true, r2Start, { error: "No R2 prefix available; skipped" }))
    }

    /* ───── Step 9: n8n ディスパッチ ───── */
    if (!skipDispatch) {
      const dispatchStart = Date.now()
      try {
        const dispatchResult = await runVideoJobAction({
          jobId: jobResult.job.id,
          action: "dispatch",
        })
        steps.push(makeStep("n8n_dispatch", dispatchResult.ok, dispatchStart, { error: dispatchResult.error }))
      } catch (error) {
        steps.push(makeStep("n8n_dispatch", false, dispatchStart, { error: error instanceof Error ? error.message : String(error) }))
      }
    } else {
      steps.push(makeStep("n8n_dispatch", true, Date.now(), { error: "Skipped by option" }))
    }

    /* ───── 完了 ───── */
    const allOk = steps.every((s) => s.ok)
    return {
      ok: allOk,
      steps,
      job: jobResult.job,
      diagnostic: { ok: diagnostic.ok, video_url: diagnostic.video_url, script: diagnostic.script, html: diagnostic.html, duration_sec: diagnostic.duration_sec, error: diagnostic.error },
      comfyui: Object.keys(comfyui).length > 0 ? comfyui : undefined,
      tts: ttsResult,
      transcription: transcriptionResult,
      ossRender: ossRenderResult,
      r2Uploads: r2Uploads.length > 0 ? r2Uploads : undefined,
      error: allOk ? undefined : "Some steps failed; check steps array for details",
    }
  } catch (error) {
    return {
      ok: false,
      steps,
      error: `Orchestrator failed: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * オーケストレーターの状態を取得する。
 * 各エンジンの準備状態を返す。
 */
export function getOrchestratorStatus(): {
  ready: boolean
  engines: Array<{ name: string; ready: boolean; note: string }>
} {
  const comfyuiConfig = getComfyuiClientConfig()
  const engines = [
    { name: "ComfyUI", ready: comfyuiConfig.ready, note: comfyuiConfig.note },
    { name: "Edge-TTS", ready: true, note: "Built-in fallback" },
    { name: "WhisperX", ready: true, note: "Falls back to Faster Whisper" },
    { name: "HyperFrames", ready: true, note: "HTML-based rendering" },
    { name: "OSS Renderers", ready: true, note: "6 engines available with FFmpeg fallback" },
    { name: "R2 Storage", ready: true, note: "Signed URL generation" },
    { name: "n8n Dispatch", ready: true, note: "Pipeline orchestration" },
  ]

  return {
    ready: engines.every((e) => e.ready),
    engines,
  }
}
