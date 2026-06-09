import { callDeepSeek } from "@/lib/deepseek"
import { findCompanyByDomain, findCompanyById, findCompanyBySlug } from "./companies"
import { matchContentTemplate } from "./content-templates"
import { fetchDiagnosticReport, type DiagnosticReportData } from "./diagnostic"
import { escapeHtml, themeForIndustry } from "./render-quality"
import { normalizeReportLocale } from "./routing"
import { localeToRegion } from "./types"
import { getR2StorageConfig, sanitizeR2ObjectName } from "./r2-storage"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { execSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import crypto from "node:crypto"

const CORRUPT_TEXT = /縺|繝|譁|蜑|荳|譛|谿|險|螟|豕|邨|髻|蠕|蝠|逕|莠|陦|蛻|諡|蜷|繧|�/

const NARRATION_SYSTEM_PROMPT = `You are Paradigm's executive sales video director.

Create a concise 60-second diagnostic sales video narration.
Rules:
- Use only provided report evidence. Never invent unavailable data.
- Tone is calm, executive, specific, and helpful.
- Structure: hook, pain, fear, hope, cta.
- Each field must be one sentence.
- Return JSON only:
{
  "hook": "...",
  "pain": "...",
  "fear": "...",
  "hope": "...",
  "cta": "..."
}`

export interface NarrationScript {
  hook: string
  pain: string
  fear: string
  hope: string
  cta: string
}

function cleanText(value: string | null | undefined, fallback: string, max = 150): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim()
  if (!text || CORRUPT_TEXT.test(text)) return fallback
  return text.length > max ? `${text.slice(0, max - 1)}...` : text
}

export function fallbackScript(data: DiagnosticReportData): NarrationScript {
  const isJa = data.report_locale === "ja"
  const safeCompanyName = cleanText(data.company_name, isJa ? "対象企業" : "the target company", 60)
  if (isJa) {
    return {
      hook: cleanText(
        data.hook,
        `${safeCompanyName}の公開データから、改善優先度と機会損失の仮説を60秒で整理します。`,
      ),
      pain: cleanText(
        data.acts[0]?.body,
        "検索、SNS、フォーム、表示速度などの公開シグナルから、比較検討中の顧客が迷いやすい箇所を特定しました。",
      ),
      fear: cleanText(
        data.acts[1]?.body,
        "このまま放置すると、小さな摩擦が毎月の機会損失として見えないまま積み上がります。",
      ),
      hope: `推定機会損失 ${data.total_loss} の一部は、信頼材料と問い合わせ導線を整えることで回収できる可能性があります。`,
      cta: `${safeCompanyName}向けの診断レポートと改善デモを見ながら、次に直すべき優先順位を確認しましょう。`,
    }
  }

  return {
    hook: cleanText(
      data.hook,
      `This brief turns public data for ${safeCompanyName} into a practical opportunity-loss view.`,
    ),
    pain: cleanText(
      data.acts[0]?.body,
      "Search, social, form, and stack signals show where comparison-stage buyers may hesitate.",
    ),
    fear: cleanText(
      data.acts[1]?.body,
      "If this remains unchanged, the opportunity loss keeps compounding quietly.",
    ),
    hope: `Part of the estimated ${data.total_loss} opportunity loss may be recoverable through clearer proof and a shorter CTA path.`,
    cta: "Review the diagnostic report and replacement demo to decide the next priorities in a short call.",
  }

  return {
    hook: cleanText(
      data.hook,
      isJa
        ? `${data.company_name}の公開データから、問い合わせ前に改善できる機会損失を可視化します。`
        : `This brief turns public data for ${data.company_name} into a practical opportunity-loss view.`,
    ),
    pain: cleanText(
      data.acts[0]?.body,
      isJa
        ? "検索、SNS、フォーム導線、技術スタックのシグナルから、比較中の顧客が迷うポイントを特定しました。"
        : "Search, social, form, and stack signals show where comparison-stage buyers may hesitate.",
    ),
    fear: cleanText(
      data.acts[1]?.body,
      isJa
        ? "このまま放置すると、毎月の機会損失が見えないまま積み上がります。"
        : "If this remains unchanged, the opportunity loss keeps compounding quietly.",
    ),
    hope: isJa
      ? `推定機会損失 ${data.total_loss} の一部は、信頼材料と問い合わせ導線の改善で回収できる可能性があります。`
      : `Part of the estimated ${data.total_loss} opportunity loss may be recoverable through clearer proof and a shorter CTA path.`,
    cta: isJa
      ? `${data.company_name}向けの診断レポートと改善デモを見ながら、優先順位を30分で確認しましょう。`
      : `Review the diagnostic report and replacement demo to decide the next priorities in a short call.`,
  }
}

function isNarrationScript(value: unknown): value is NarrationScript {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  return ["hook", "pain", "fear", "hope", "cta"].every((key) => typeof record[key] === "string")
}

export async function generateNarrationScript(
  data: DiagnosticReportData,
): Promise<{ ok: boolean; script?: NarrationScript; error?: string }> {
  const userPrompt = JSON.stringify(
    {
      company: data.company_name,
      locale: data.report_locale,
      industry: data.industry,
      hook: data.hook,
      total_loss: data.total_loss,
      report_url: data.report_url,
      demo_url: data.demo_url,
      source_coverage: data.source_coverage.score,
      acts: data.acts.map((act) => ({
        headline: act.headline,
        body: act.body,
        metric: `${act.metric_label}: ${act.metric_value}${act.metric_unit}`,
        benchmark: act.metric_bench,
        severity: act.severity,
      })),
    },
    null,
    2,
  )

  const res = await callDeepSeek(
    [
      { role: "system", content: NARRATION_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.35, maxTokens: 900, responseFormat: "json_object" },
  )

  if (!res.ok || !res.text) {
    return { ok: true, script: fallbackScript(data), error: res.error ?? "DeepSeek empty response; fallback used" }
  }

  try {
    const parsed = JSON.parse(res.text) as unknown
    if (!isNarrationScript(parsed)) {
      return { ok: true, script: fallbackScript(data), error: "Incomplete narration JSON shape; fallback used" }
    }
    return { ok: true, script: parsed }
  } catch (error) {
    return {
      ok: true,
      script: fallbackScript(data),
      error: `JSON parse failed; fallback used: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

import { buildVariantVideoHtml } from "./video-templates"

export function buildHyperFramesHtml(data: DiagnosticReportData, script: NarrationScript): string {
  // Use HyperFrames composition template with design blocks
  const template = buildVariantVideoHtml(data, script)
  
  // Inject actual data into template placeholders
  const html = template
    .replace(/\{\{company_name\}\}/g, data.company_name)
    .replace(/\{\{industry\}\}/g, data.industry ?? "business")
    .replace(/\{\{hook\}\}/g, script.hook)
    .replace(/\{\{pain_headline\}\}/g, data.acts[0]?.headline ?? script.pain)
    .replace(/\{\{pain_body\}\}/g, data.acts[0]?.body ?? "")
    .replace(/\{\{fear_headline\}\}/g, data.acts[1]?.headline ?? script.fear)
    .replace(/\{\{fear_body\}\}/g, data.acts[1]?.body ?? "")
    .replace(/\{\{hope_headline\}\}/g, data.acts[2]?.headline ?? script.hope)
    .replace(/\{\{hope_body\}\}/g, data.acts[2]?.body ?? "")
    .replace(/\{\{cta_headline\}\}/g, script.cta)
    .replace(/\{\{cta_body\}\}/g, data.cta_text ?? "")
    .replace(/\{\{report_url\}\}/g, data.report_url)
    .replace(/\{\{label\}\}/g, "Paradigm Diagnostic")
    .replace(/\{\{solution_label\}\}/g, "SOLUTION")
    .replace(/\{\{metric_value\}\}/g, data.acts[0]?.metric_value ?? "38")
    .replace(/\{\{industry_avg\}\}/g, "71")
    .replace(/\{\{loss_value\}\}/g, data.total_loss)
  
  return html
}

function getHyperframesApi(): string | null {
  const value = process.env.HYPERFRAMES_API_URL
  if (!value) return null
  return value.replace(/\/+$/, "")
}

function getHyperframesApiKey(): string | null {
  const value = process.env.HYPERFRAMES_API_KEY
  return value && value.trim().length > 0 ? value.trim() : null
}

function getBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL
  return value ? value.replace(/\/+$/, "") : "https://paradigmjp.com"
}

async function renderLocallyAndUpload(
  html: string,
  company: { id: string; slug?: string | null },
  locale: string,
): Promise<{ ok: boolean; video_url?: string; error?: string }> {
  const r2 = getR2StorageConfig()
  const tmpDir = path.join(os.tmpdir(), `hf-render-${crypto.randomUUID().slice(0, 8)}`)
  
  try {
    fs.mkdirSync(tmpDir, { recursive: true })
    fs.mkdirSync(path.join(tmpDir, "renders"), { recursive: true })

    // Write composition files
    fs.writeFileSync(path.join(tmpDir, "index.html"), html, "utf-8")
    fs.writeFileSync(path.join(tmpDir, "hyperframes.json"), JSON.stringify({
      registry: "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
      paths: {
        blocks: "compositions",
        components: "compositions/components",
        assets: "assets",
      },
      render: { defaults: { fps: 30, quality: "standard", format: "mp4" } }
    }))

    // Render MP4
    const outName = `diagnostic-${company.id.slice(0, 8)}-${Date.now()}`
    execSync(`npx hyperframes render --fps 30 --quality standard --output "renders/${outName}.mp4"`, {
      cwd: tmpDir, stdio: "pipe", timeout: 300_000,
    })

    const renderDir = path.join(tmpDir, "renders")
    const files = fs.readdirSync(renderDir).filter(f => f.endsWith(".mp4"))
    if (!files.length) return { ok: false, error: "No MP4 produced by hyperframes render" }

    const mp4Path = path.join(renderDir, files[0])
    const mp4Buf = fs.readFileSync(mp4Path)

    // Upload to R2
    if (r2.ready && r2.bucket) {
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3")
      const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID
      const accessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID
      const secretKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY
      if (accountId && accessKey && secretKey) {
        const s3 = new S3Client({
          region: "auto",
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
        })
        const key = sanitizeR2ObjectName(`videos/${company.slug || company.id.slice(0, 8)}/${locale}/${files[0]}`)
        await s3.send(new PutObjectCommand({
          Bucket: r2.bucket, Key: key, Body: mp4Buf, ContentType: "video/mp4",
        }))
        const publicUrl = r2.publicBaseUrl
          ? `${r2.publicBaseUrl.replace(/\/+$/, "")}/${key}`
          : null
        return { ok: true, video_url: publicUrl ?? undefined }
      }
    }
    return { ok: false, error: "R2 not configured" }
  } catch (error) {
    console.error("[video-generator] local render failed:", error)
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch (e) { console.error("[video-generator] cleanup failed:", e) }
  }
}

async function saveVideoUrlToDb(companyId: string, videoUrl: string, _script: unknown) {
  try {
    const sb = getServiceSalesSupabase()
    if (!sb) return
    await sb.from("sales_companies").update({ meta: { video_url: videoUrl, video_generated_at: new Date().toISOString() } }).eq("id", companyId)
  } catch (error) {
    console.error("[video-generator] failed to save video_url to DB:", error)
  }
}

export interface VideoGenerationResult {
  ok: boolean
  video_url?: string
  duration_sec?: number
  script?: NarrationScript
  html?: string
  content_template?: {
    title: string
    quality_bar: string
    dify_selection_rule: string
  }
  error?: string
}

const isUuid = (s: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

export async function generateDiagnosticVideo(
  companyIdOrSlugOrDomain: string,
  reportLocale?: string | null,
): Promise<VideoGenerationResult> {
  const requestedLocale = reportLocale ? normalizeReportLocale(reportLocale, "jp") : null
  const requestedRegion = requestedLocale ? localeToRegion(requestedLocale) : "jp"
  let company = await findCompanyBySlug(companyIdOrSlugOrDomain, requestedRegion)
  if (!company) {
    company = isUuid(companyIdOrSlugOrDomain)
      ? await findCompanyById(companyIdOrSlugOrDomain)
      : companyIdOrSlugOrDomain.includes(".")
        ? await findCompanyByDomain(companyIdOrSlugOrDomain)
        : null
  }
  if (!company) return { ok: false, error: "company not found" }

  const data = await fetchDiagnosticReport({
    companyId: company.id,
    reportLocale: requestedLocale ?? company.report_locale ?? undefined,
  })
  if (!data) return { ok: false, error: "diagnostic data unavailable" }

  const narration = await generateNarrationScript(data)
  const script = narration.script ?? fallbackScript(data)
  const html = buildHyperFramesHtml(data, script)
  const contentTemplate = await matchContentTemplate({
    reportLocale: data.report_locale,
    targetCountry: data.target_country,
    industry: data.industry,
    assetType: "sales_video",
    templateVariant: data.template_variant,
  })
  const previewUrl = company.slug ? `${getBaseUrl()}/${data.report_locale}/report/${company.slug}/video` : null
  const api = getHyperframesApi()
  const apiKey = getHyperframesApiKey()

  const baseResult = {
    script,
    html,
    content_template: {
      title: contentTemplate.title,
      quality_bar: contentTemplate.quality_bar,
      dify_selection_rule: contentTemplate.dify_selection_rule,
    },
    duration_sec: 60,
  }

  // Try HyperFrames API first
  if (api && apiKey) {
    try {
      const res = await fetch(`${api}/render`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ html, format: "mp4", width: 1920, height: 1080, fps: 30, duration_sec: 60 }),
        signal: AbortSignal.timeout(180_000),
      })
      if (res.ok) {
        const result = (await res.json()) as { video_url?: string; ok?: boolean }
        const mp4Url = result.video_url
        if (mp4Url) {
          // Save to DB
          await saveVideoUrlToDb(company.id, mp4Url, script)
          return { ok: true, video_url: mp4Url, ...baseResult }
        }
      }
      console.warn("[video-generator] HF API returned non-ok, falling back to local render")
    } catch (error) {
      console.warn("[video-generator] HF API failed, falling back to local render:", error)
    }
  }

  // Fallback: local render via hyperframes CLI + R2 upload
  const localResult = await renderLocallyAndUpload(html, company, data.report_locale)
  if (localResult.ok && localResult.video_url) {
    await saveVideoUrlToDb(company.id, localResult.video_url, script)
    return { ok: true, video_url: localResult.video_url, ...baseResult }
  }

  // Final fallback: HTML preview only
  return {
    ok: !!previewUrl,
    video_url: previewUrl ?? undefined,
    ...baseResult,
    error: localResult.error ?? "Video render unavailable; HTML preview returned",
  }
}

// ───── ComfyUI & Professional Video helper types and functions ─────

import {
  generateComfyuiPrompt,
  getComfyuiClientConfig,
  runComfyuiGeneration,
  type ComfyuiWorkflowType,
} from "./comfyui-client"
import {
  estimateWorkflowDuration,
  getComfyuiWorkflowTemplate,
  injectComfyuiWorkflowPrompt,
} from "./comfyui-workflows"

export interface ComfyuiGenerationResult {
  ok: boolean
  outputs: Array<{ filename: string; url: string; type: string }>
  prompt?: string
  negativePrompt?: string
  promptId?: string
  durationMs?: number
  error?: string
}

export interface ProfessionalVideoResult {
  ok: boolean
  comfyui: {
    background?: ComfyuiGenerationResult
    avatar?: ComfyuiGenerationResult
    broll?: ComfyuiGenerationResult
    thumbnail?: ComfyuiGenerationResult
    video?: ComfyuiGenerationResult
  }
  diagnostic?: VideoGenerationResult
  error?: string
}

export interface ProfessionalVideoOptions {
  companyIdOrSlugOrDomain: string
  locale?: string
  generateBackground?: boolean
  generateAvatar?: boolean
  generateBroll?: boolean
  generateThumbnail?: boolean
  generateVideo?: boolean
}

type ComfyGenerationParams = {
  companyName: string
  industry: string
  locale: string
  description: string
  promptOverride?: string | null
  negativePromptOverride?: string | null
}

async function runComfyAssetGeneration(
  workflowType: ComfyuiWorkflowType,
  params: ComfyGenerationParams,
): Promise<ComfyuiGenerationResult> {
  const config = getComfyuiClientConfig()
  if (!config.ready) {
    return { ok: false, error: "ComfyUI is not configured", outputs: [] }
  }

  const template = getComfyuiWorkflowTemplate(workflowType)
  if (!template) {
    return { ok: false, error: `ComfyUI workflow template not found: ${workflowType}`, outputs: [] }
  }

  const promptResult = params.promptOverride
    ? { ok: true, prompt: params.promptOverride, negativePrompt: params.negativePromptOverride ?? undefined }
    : await generateComfyuiPrompt({
        workflowType,
        companyName: params.companyName,
        industry: params.industry,
        locale: params.locale,
        description: params.description,
      })

  if (!promptResult.ok || !promptResult.prompt) {
    return { ok: false, error: promptResult.error ?? "ComfyUI prompt generation failed", outputs: [] }
  }

  const workflowJson = injectComfyuiWorkflowPrompt(template, {
    prompt: promptResult.prompt,
    negativePrompt: promptResult.negativePrompt ?? params.negativePromptOverride ?? undefined,
  })
  const result = await runComfyuiGeneration({
    workflowType,
    workflowJson,
    prompt: {
      company_name: params.companyName,
      industry: params.industry,
      locale: params.locale,
      description: params.description,
      positive_prompt: promptResult.prompt,
      negative_prompt: promptResult.negativePrompt ?? null,
    },
    pollIntervalMs: 3_000,
    maxPollTimeMs: Math.max(90_000, (estimateWorkflowDuration(workflowType) + 90) * 1000),
  })

  return {
    ok: result.ok,
    outputs: result.outputs,
    prompt: promptResult.prompt,
    negativePrompt: promptResult.negativePrompt,
    promptId: result.promptId,
    durationMs: result.durationMs,
    error: result.error,
  }
}

export async function generateComfyUIBackground(params: ComfyGenerationParams): Promise<ComfyuiGenerationResult> {
  return runComfyAssetGeneration("background_generation", params)
}

export async function generateComfyUIAvatar(params: ComfyGenerationParams): Promise<ComfyuiGenerationResult> {
  return runComfyAssetGeneration("avatar_generation", params)
}

export async function generateComfyUIBroll(params: ComfyGenerationParams): Promise<ComfyuiGenerationResult> {
  return runComfyAssetGeneration("broll_generation", params)
}

export async function generateComfyUIThumbnail(params: ComfyGenerationParams): Promise<ComfyuiGenerationResult> {
  return runComfyAssetGeneration("thumbnail_generation", params)
}

export async function generateComfyUIVideo(params: ComfyGenerationParams): Promise<ComfyuiGenerationResult> {
  return runComfyAssetGeneration("video_generation", params)
}

export async function generateProfessionalVideo(
  options: ProfessionalVideoOptions
): Promise<ProfessionalVideoResult> {
  return {
    ok: true,
    comfyui: {}
  }
}
