import { callDeepSeek } from "@/lib/deepseek"
import { findCompanyByDomain, findCompanyById, findCompanyBySlug } from "./companies"
import { matchContentTemplate } from "./content-templates"
import { fetchDiagnosticReport, type DiagnosticReportData } from "./diagnostic"
import { escapeHtml, themeForIndustry } from "./render-quality"

const NARRATION_SYSTEM_PROMPT = `You are Paradigm's sales video director.

Create a concise 60-second diagnostic sales video narration.
Rules:
- Use only provided report evidence. Never invent unavailable data.
- Tone is calm, executive, specific, and helpful.
- Structure: hook, pain, fear, hope, cta.
- Keep URLs exact.
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

function fallbackScript(data: DiagnosticReportData): NarrationScript {
  const isJa = data.report_locale === "ja"
  return {
    hook: data.hook.slice(0, 90),
    pain: data.acts[0]?.body.slice(0, 130) ?? (isJa ? "公開データから改善余地が見つかりました。" : "The public data shows room for improvement."),
    fear: data.acts[1]?.body.slice(0, 130) ?? (isJa ? "放置すると比較検討の段階で選ばれにくくなります。" : "Left unresolved, the business can lose buyers during comparison."),
    hope: isJa
      ? `推定機会損失 ${data.total_loss} の一部は、導線と信頼要素の改善で回収できる可能性があります。`
      : `Part of the estimated ${data.total_loss} opportunity loss may be recovered by improving clarity and trust.`,
    cta: isJa
      ? `${data.company_name}様向けの診断レポートとデモをもとに、優先順位を30分で確認しましょう。`
      : `Use the report and demo to review priorities in a 30-minute call.`,
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
    { id: "hook", start: 0, duration: 8, label: "HOOK", text: script.hook, metric: data.company_name },
    { id: "pain", start: 8, duration: 14, label: "EVIDENCE", text: script.pain, metric: data.acts[0]?.metric_value ?? "" },
    { id: "fear", start: 22, duration: 14, label: "IMPACT", text: script.fear, metric: data.total_loss },
    { id: "hope", start: 36, duration: 16, label: "SOLUTION", text: script.hope, metric: data.demo_url ?? data.report_url },
    { id: "cta", start: 52, duration: 8, label: "NEXT STEP", text: script.cta, metric: data.report_url },
  ]

  return `<!doctype html>
<html lang="${escapeHtml(data.report_locale)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(data.company_name)} diagnostic video</title>
  <style>
    body { margin:0; background:${theme.ink}; color:#fff; font-family:Inter,ui-sans-serif,system-ui,sans-serif; overflow:hidden; }
    [data-composition-id="paradigm-sales-video"] { width:100vw; height:100vh; position:relative; background:${theme.ink}; }
    .scene { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; gap:26px; padding:110px 150px; box-sizing:border-box; opacity:0; }
    .scene::before { content:""; position:absolute; inset:0; background:radial-gradient(circle at 72% 18%, ${theme.accent}55, transparent 28%), linear-gradient(140deg, ${theme.ink}, ${theme.accentDark}); z-index:-1; }
    .label { font-size:22px; font-weight:800; color:${theme.signal}; }
    h1 { margin:0; max-width:1180px; font-size:72px; line-height:1.08; letter-spacing:0; }
    .metric { max-width:980px; border:1px solid rgba(255,255,255,.18); border-radius:8px; padding:22px; background:rgba(255,255,255,.09); font-size:30px; color:rgba(255,255,255,.82); overflow-wrap:anywhere; }
    .footer { position:absolute; left:150px; right:150px; bottom:72px; display:flex; justify-content:space-between; color:rgba(255,255,255,.62); font-size:20px; }
  </style>
</head>
<body>
  <div data-composition-id="paradigm-sales-video" data-width="1920" data-height="1080" data-duration="60">
    ${scenes
      .map(
        (scene) => `<section id="${scene.id}" class="scene" data-start="${scene.start}" data-duration="${scene.duration}" data-track-index="1">
      <div class="label">${escapeHtml(scene.label)}</div>
      <h1>${escapeHtml(scene.text)}</h1>
      <div class="metric">${escapeHtml(scene.metric)}</div>
    </section>`,
      )
      .join("\n")}
    <div class="footer"><span>Paradigm Sales OS</span><span>${escapeHtml(data.company_name)}</span></div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    ${scenes
      .map(
        (scene) => `tl.to("#${scene.id}", { opacity: 1, duration: 0.4 }, ${scene.start})
  .from("#${scene.id} h1", { y: 46, opacity: 0, duration: 0.75, ease: "power3.out" }, ${scene.start + 0.1})
  .from("#${scene.id} .metric", { y: 24, opacity: 0, duration: 0.55, ease: "power2.out" }, ${scene.start + 0.45})
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

export async function generateDiagnosticVideo(companyIdOrSlugOrDomain: string): Promise<VideoGenerationResult> {
  let company = await findCompanyBySlug(companyIdOrSlugOrDomain)
  if (!company) {
    company = isUuid(companyIdOrSlugOrDomain)
      ? await findCompanyById(companyIdOrSlugOrDomain)
      : companyIdOrSlugOrDomain.includes(".")
        ? await findCompanyByDomain(companyIdOrSlugOrDomain)
        : null
  }
  if (!company) return { ok: false, error: "company not found" }

  const data = await fetchDiagnosticReport({ companyId: company.id })
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

  try {
    const res = await fetch(`${api}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html, format: "mp4", width: 1920, height: 1080, fps: 30, duration_sec: 60 }),
      signal: AbortSignal.timeout(180_000),
    })
    if (!res.ok) {
      return {
        ok: !!previewUrl,
        video_url: previewUrl ?? undefined,
        ...baseResult,
        error: `HyperFrames API ${res.status}: ${res.statusText}; HTML preview returned`,
      }
    }
    const result = (await res.json()) as { video_url?: string }
    return { ok: true, video_url: result.video_url ?? previewUrl ?? undefined, ...baseResult }
  } catch (error) {
    return {
      ok: !!previewUrl,
      video_url: previewUrl ?? undefined,
      ...baseResult,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
