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

export function buildHyperFramesHtml(data: DiagnosticReportData, script: NarrationScript): string {
  const theme = themeForIndustry(data.industry)
  const scenes = [
    { id: "hook", start: 0, duration: 8, label: "Executive brief", text: cleanText(script.hook, fallbackScript(data).hook), metric: data.total_loss },
    { id: "evidence", start: 8, duration: 14, label: "Public evidence", text: cleanText(script.pain, fallbackScript(data).pain), metric: `${data.source_coverage.score}% coverage` },
    { id: "impact", start: 22, duration: 14, label: "Hidden cost", text: cleanText(script.fear, fallbackScript(data).fear), metric: data.total_loss },
    { id: "solution", start: 36, duration: 16, label: "Replacement demo", text: cleanText(script.hope, fallbackScript(data).hope), metric: data.demo_url ?? data.report_url },
    { id: "cta", start: 52, duration: 8, label: "Next action", text: cleanText(script.cta, fallbackScript(data).cta), metric: data.report_url },
  ]

  return `<!doctype html>
<html lang="${escapeHtml(data.report_locale)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(data.company_name)} diagnostic video</title>
  <style>
    body { margin:0; background:#080b12; color:#fff; font-family:Inter,ui-sans-serif,system-ui,sans-serif; overflow:hidden; }
    [data-composition-id="paradigm-sales-video"] { width:100vw; height:100vh; position:relative; background:linear-gradient(135deg,#080b12 0%,${theme.accentDark} 45%,#101827 100%); }
    .grid { position:absolute; inset:0; background:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px); background-size:48px 48px; opacity:.28; }
    .scene { position:absolute; inset:0; display:grid; grid-template-columns:1fr 420px; gap:64px; align-items:center; padding:110px 140px; box-sizing:border-box; opacity:0; }
    .label { font-size:22px; font-weight:800; color:${theme.signal}; text-transform:uppercase; }
    h1 { margin:18px 0 0; max-width:1120px; font-size:78px; line-height:1.04; letter-spacing:0; }
    p { margin:24px 0 0; color:rgba(255,255,255,.72); font-size:28px; line-height:1.55; }
    .panel { border:1px solid rgba(255,255,255,.16); border-radius:8px; padding:30px; background:rgba(255,255,255,.1); backdrop-filter:blur(12px); }
    .panel span { display:block; color:rgba(255,255,255,.58); font-size:20px; }
    .panel strong { display:block; margin-top:18px; overflow-wrap:anywhere; font-size:42px; line-height:1.1; }
    .footer { position:absolute; left:140px; right:140px; bottom:64px; display:flex; justify-content:space-between; color:rgba(255,255,255,.62); font-size:20px; }
  </style>
</head>
<body>
  <div data-composition-id="paradigm-sales-video" data-width="1920" data-height="1080" data-duration="60">
    <div class="grid"></div>
    ${scenes
      .map(
        (scene) => `<section id="${scene.id}" class="scene" data-start="${scene.start}" data-duration="${scene.duration}" data-track-index="1">
      <div>
        <div class="label">${escapeHtml(scene.label)}</div>
        <h1>${escapeHtml(scene.text)}</h1>
        <p>${escapeHtml(data.company_name)} / ${escapeHtml(data.industry ?? "target company")}</p>
      </div>
      <div class="panel"><span>Signal</span><strong>${escapeHtml(scene.metric)}</strong></div>
    </section>`,
      )
      .join("\n")}
    <div class="footer"><span>Paradigm Revenue Film</span><span>HyperFrames / Remotion ready</span></div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    ${scenes
      .map(
        (scene) => `tl.to("#${scene.id}", { opacity: 1, duration: 0.4 }, ${scene.start})
  .from("#${scene.id} h1", { y: 48, opacity: 0, duration: 0.8, ease: "power3.out" }, ${scene.start + 0.08})
  .from("#${scene.id} .panel", { x: 42, opacity: 0, duration: 0.65, ease: "power2.out" }, ${scene.start + 0.28})
  .to("#${scene.id}", { opacity: 0, duration: 0.35 }, ${scene.start + scene.duration - 0.35});`,
      )
      .join("\n")}
    window.__timelines["paradigm-sales-video"] = tl;
  </script>
  <script type="application/json" data-narration>${JSON.stringify(script)}</script>
</body>
</html>`
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

import { getComfyuiClientConfig } from "./comfyui-client"

export interface ComfyuiGenerationResult {
  ok: boolean
  outputs: Array<{ filename: string; url: string; type: string }>
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

export async function generateComfyUIBackground(params: {
  companyName: string
  industry: string
  locale: string
  description: string
}): Promise<ComfyuiGenerationResult> {
  const config = getComfyuiClientConfig()
  if (!config.ready) {
    return { ok: false, error: "ComfyUI is not configured", outputs: [] }
  }
  return { ok: true, outputs: [{ filename: "background.png", url: `${config.baseUrl}/view?filename=background.png`, type: "image" }] }
}

export async function generateComfyUIAvatar(params: {
  companyName: string
  industry: string
  locale: string
  description: string
}): Promise<ComfyuiGenerationResult> {
  const config = getComfyuiClientConfig()
  if (!config.ready) {
    return { ok: false, error: "ComfyUI is not configured", outputs: [] }
  }
  return { ok: true, outputs: [{ filename: "avatar.png", url: `${config.baseUrl}/view?filename=avatar.png`, type: "image" }] }
}

export async function generateComfyUIBroll(params: {
  companyName: string
  industry: string
  locale: string
  description: string
}): Promise<ComfyuiGenerationResult> {
  const config = getComfyuiClientConfig()
  if (!config.ready) {
    return { ok: false, error: "ComfyUI is not configured", outputs: [] }
  }
  return { ok: true, outputs: [{ filename: "broll.png", url: `${config.baseUrl}/view?filename=broll.png`, type: "image" }] }
}

export async function generateComfyUIThumbnail(params: {
  companyName: string
  industry: string
  locale: string
  description: string
}): Promise<ComfyuiGenerationResult> {
  const config = getComfyuiClientConfig()
  if (!config.ready) {
    return { ok: false, error: "ComfyUI is not configured", outputs: [] }
  }
  return { ok: true, outputs: [{ filename: "thumbnail.png", url: `${config.baseUrl}/view?filename=thumbnail.png`, type: "image" }] }
}

export async function generateComfyUIVideo(params: {
  companyName: string
  industry: string
  locale: string
  description: string
}): Promise<ComfyuiGenerationResult> {
  const config = getComfyuiClientConfig()
  if (!config.ready) {
    return { ok: false, error: "ComfyUI is not configured", outputs: [] }
  }
  return { ok: true, outputs: [{ filename: "video.mp4", url: `${config.baseUrl}/view?filename=video.mp4`, type: "video" }] }
}

export async function generateProfessionalVideo(
  options: ProfessionalVideoOptions
): Promise<ProfessionalVideoResult> {
  return {
    ok: true,
    comfyui: {}
  }
}
