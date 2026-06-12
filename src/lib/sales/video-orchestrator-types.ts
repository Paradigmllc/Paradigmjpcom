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
  /** GUIから入力された制作プロンプトと調整指示 */
  creativeBrief?: {
    narrativePrompt?: string | null
    visualPrompt?: string | null
    negativePrompt?: string | null
  }
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

export function elapsed(start: number): number {
  return Date.now() - start
}

export function makeStep(name: string, ok: boolean, start: number, extra?: Partial<OrchestratorStepResult>): OrchestratorStepResult {
  return {
    step: name,
    ok,
    durationMs: elapsed(start),
    ...(extra ?? {}),
  }
}

import { isUuid } from "./japan-readiness-utils"
export { isUuid }
