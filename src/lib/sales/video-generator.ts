import { callDeepSeek } from "@/lib/deepseek"
import { findCompanyByDomain, findCompanyById, findCompanyBySlug } from "./companies"
import { matchContentTemplate } from "./content-templates"
import { fetchDiagnosticReport, type DiagnosticReportData } from "./diagnostic"
import { escapeHtml, themeForIndustry } from "./render-quality"
import { normalizeReportLocale } from "./routing"
import { localeToRegion } from "./types"

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

function fallbackScript(data: DiagnosticReportData): NarrationScript {
  const isJa = data.report_locale === "ja"
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

  if (!api) {
    return {
      ok: !!previewUrl,
      video_url: previewUrl ?? undefined,
      ...baseResult,
      ...(previewUrl ? {} : { error: "company.slug not set; preview URL unavailable" }),
    }
  }
  if (!apiKey) {
    console.error("[video-generator] HYPERFRAMES_API_URL is configured but HYPERFRAMES_API_KEY is missing")
    return {
      ok: !!previewUrl,
      video_url: previewUrl ?? undefined,
      ...baseResult,
      error: "HYPERFRAMES_API_KEY is not configured; HTML preview returned",
    }
  }

  try {
    const res = await fetch(`${api}/render`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ html, format: "mp4", width: 1920, height: 1080, fps: 30, duration_sec: 60 }),
      signal: AbortSignal.timeout(180_000),
    })
    if (!res.ok) {
      const text = await res.text().catch((error) => {
        console.error("[video-generator] failed to read HyperFrames error body:", error)
        return ""
      })
      return {
        ok: !!previewUrl,
        video_url: previewUrl ?? undefined,
        ...baseResult,
        error: `HyperFrames API ${res.status}: ${(text || res.statusText).slice(0, 240)}; HTML preview returned`,
      }
    }
    const result = (await res.json()) as { video_url?: string }
    return { ok: true, video_url: result.video_url ?? previewUrl ?? undefined, ...baseResult }
  } catch (error) {
    console.error("[video-generator] HyperFrames render failed:", error)
    const { captureException } = await import("@/lib/error-monitor")
    await captureException(error, {
      source: "video-generator/hyperframes-render-failed",
      context: { companyIdOrSlugOrDomain, reportLocale, api },
    })
    return {
      ok: !!previewUrl,
      video_url: previewUrl ?? undefined,
      ...baseResult,
      error: error instanceof Error ? error.message : String(error),
    }
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
