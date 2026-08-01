/**
 * AI-powered Astro demo JSON generator.
 *
 * Dify can produce the page blueprint, but the fallback must still be
 * customer-sendable. This module therefore validates Dify output and falls
 * back to deterministic Japanese/English copy with the same widget contract.
 */
import type { DiagnosticReportData } from "./diagnostic"
import type { SalesCompany } from "./types"
import { JAPAN_ENTRY_CTA_EN, JAPAN_ENTRY_CTA_JA } from "@/lib/japan-entry-public-copy"

type DemoTheme = "astrowind" | "screwfast" | "astroship"

interface IndustryThemeConfig {
  theme: DemoTheme
  labelJa: string
  labelEn: string
  accentColor: string
  accentColorDark: string
}

const INDUSTRY_THEMES: Record<string, IndustryThemeConfig> = {
  dental: { theme: "astrowind", labelJa: "歯科医院", labelEn: "Dental Clinic", accentColor: "#2563eb", accentColorDark: "#1e3a8a" },
  construction: { theme: "screwfast", labelJa: "建設業", labelEn: "Construction", accentColor: "#f59e0b", accentColorDark: "#92400e" },
  consulting: { theme: "astrowind", labelJa: "コンサルティング", labelEn: "Consulting", accentColor: "#7c3aed", accentColorDark: "#5b21b6" },
  restaurant: { theme: "astroship", labelJa: "飲食店", labelEn: "Restaurant", accentColor: "#f97316", accentColorDark: "#9a3412" },
  retail: { theme: "astroship", labelJa: "小売業", labelEn: "Retail", accentColor: "#0891b2", accentColorDark: "#155e75" },
  beauty_salon: { theme: "astroship", labelJa: "美容サロン", labelEn: "Beauty Salon", accentColor: "#db2777", accentColorDark: "#831843" },
  accounting: { theme: "astrowind", labelJa: "会計事務所", labelEn: "Accounting Office", accentColor: "#0f766e", accentColorDark: "#134e4a" },
  cleaning: { theme: "screwfast", labelJa: "清掃業", labelEn: "Cleaning Service", accentColor: "#16a34a", accentColorDark: "#166534" },
}

function readOptionalEnv(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

function industryConfig(industry: string | null | undefined): IndustryThemeConfig {
  return INDUSTRY_THEMES[industry ?? ""] ?? INDUSTRY_THEMES.consulting
}

function cleanText(value: unknown, fallback: string, max = 180): string {
  if (typeof value !== "string") return fallback
  const trimmed = value.replace(/\s+/g, " ").trim()
  if (!trimmed) return fallback
  if (/[�邵郢鬮隴陞陷驍]/.test(trimmed)) return fallback
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed
}

export interface DemoJsonBlueprint {
  theme: DemoTheme
  title: string
  blocks: Array<{ id: string; type: string; props: Record<string, unknown> }>
  meta: Record<string, unknown>
  engine: "dify" | "rules"
}

export async function generateDemoWithDify(
  company: SalesCompany,
  report: DiagnosticReportData,
): Promise<DemoJsonBlueprint> {
  const apiKey = readOptionalEnv("DIFY_API_KEY")
  const baseUrl = readOptionalEnv("DIFY_API_URL") || readOptionalEnv("DIFY_API_BASE") || "https://api.dify.ai/v1"

  if (!apiKey) {
    console.warn("[dify-demo] DIFY_API_KEY not configured; using rules-based demo blueprint")
    return buildRulesBasedBlueprint(company, report)
  }

  try {
    const locale = company.report_locale ?? report.report_locale ?? "ja"
    const industry = company.industry || "consulting"
    const cfg = industryConfig(industry)

    const res = await fetch(`${baseUrl}/workflows/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {
          system_prompt: DIFY_DEMO_SYSTEM_PROMPT,
          company_name: company.company_name,
          industry,
          locale,
          theme: cfg.theme,
          pagespeed_mobile: company.pagespeed_mobile,
          pagespeed_desktop: company.pagespeed_desktop,
          detected_issues: company.detected_issues ?? [],
          report_hook: report.hook,
          total_loss: report.total_loss,
          acts: report.acts?.slice(0, 5).map((act) => ({
            headline: act.headline,
            body: act.body,
            metric_label: act.metric_label,
            metric_value: act.metric_value,
          })) ?? [],
          personalization_inputs: {
            industry_label: locale === "ja" ? cfg.labelJa : cfg.labelEn,
            accentColor: cfg.accentColor,
            accentColorDark: cfg.accentColorDark,
          },
        },
        response_mode: "blocking",
        user: `paradigm-demo-${company.id}`,
      }),
      signal: AbortSignal.timeout(90_000),
    })

    if (!res.ok) {
      console.error(`[dify-demo] Dify API returned ${res.status}`)
      return buildRulesBasedBlueprint(company, report)
    }

    const raw = await res.json() as Record<string, unknown>
    const data = (raw.data as Record<string, unknown>) ?? raw
    const outputs = (data.outputs as Record<string, unknown>) ?? data
    const blueprintText =
      (outputs.text as string | undefined) ??
      (outputs.result as string | undefined) ??
      (outputs.json_blueprint as string | undefined) ??
      (data.answer as string | undefined)

    if (!blueprintText) {
      console.error("[dify-demo] Dify returned no blueprint text")
      return buildRulesBasedBlueprint(company, report)
    }

    const jsonMatch = blueprintText.match(/```(?:json)?\s*([\s\S]*?)```/)
    const parsed = JSON.parse((jsonMatch?.[1] ?? blueprintText).trim()) as {
      theme?: string
      title?: string
      blocks?: Array<{ id: string; type: string; props: Record<string, unknown> }>
      meta?: Record<string, unknown>
    }

    if (!parsed.blocks || !Array.isArray(parsed.blocks) || parsed.blocks.length < 3) {
      console.error("[dify-demo] Dify returned an incomplete blueprint")
      return buildRulesBasedBlueprint(company, report)
    }

    const theme: DemoTheme = parsed.theme === "astrowind" || parsed.theme === "screwfast" || parsed.theme === "astroship"
      ? parsed.theme
      : cfg.theme

    return {
      theme,
      title: cleanText(parsed.title, `${company.company_name} | Web改善デモ`, 90),
      blocks: parsed.blocks,
      meta: {
        ...parsed.meta,
        locale,
        industry,
        accentColor: cfg.accentColor,
        accentColorDark: cfg.accentColorDark,
        generator: "dify_llm",
        generated_at: new Date().toISOString(),
        engine: "dify",
      },
      engine: "dify",
    }
  } catch (error) {
    console.error("[dify-demo] generation failed:", error instanceof Error ? error.message : String(error))
    return buildRulesBasedBlueprint(company, report)
  }
}

function buildRulesBasedBlueprint(
  company: SalesCompany,
  report: DiagnosticReportData,
): DemoJsonBlueprint {
  const locale = company.report_locale ?? report.report_locale ?? "ja"
  const isJa = locale === "ja"
  const name = cleanText(company.company_name, "Your Company", 80)
  const industry = company.industry || "consulting"
  const cfg = industryConfig(industry)
  const ctaUrl = "https://cal.com/paradigm-jp/15min"
  const primaryIssue = report.acts?.[0]
  const secondaryIssue = report.acts?.[1]
  const thirdIssue = report.acts?.[2]
  const title = cleanText(
    report.hook,
    isJa
      ? `${name}の強みが最初の5秒で伝わるWeb改善デモ`
      : `A web demo that makes ${name}'s value clear in the first five seconds`,
    110,
  )

  return {
    theme: cfg.theme,
    title: `${name} | ${isJa ? "Web改善デモサイト" : "Web Improvement Demo"}`,
    blocks: [
      {
        id: "hero",
        type: "Hero",
        props: {
          title,
          subtitle: isJa
            ? "公開データと診断結果をもとに、問い合わせ前の不安解消、比較検討、信頼材料の見せ方を改善したデモです。"
            : "A diagnostic-led demo that improves trust proof, comparison clarity, and the path to inquiry.",
          tagline: isJa ? `${cfg.labelJa}向け改善デモ` : `${cfg.labelEn} improvement demo`,
          actions: [
            { variant: "primary", text: isJa ? JAPAN_ENTRY_CTA_JA : JAPAN_ENTRY_CTA_EN, href: "https://paradigmjp.com/en/contact?intent=japan-entry" },
            { variant: "secondary", text: isJa ? "改善ポイントを見る" : "See improvements", href: "#features" },
          ],
        },
      },
      {
        id: "features",
        type: "Features",
        props: {
          title: isJa ? "問い合わせにつながる3つの改善" : "Three improvements that move buyers to action",
          subtitle: isJa
            ? `${name}の現状データから、優先度の高い改善だけを営業導線に落とし込みました。`
            : `Built from ${name}'s diagnostic data, focused on the highest-impact sales path.`,
          items: [
            {
              title: cleanText(primaryIssue?.headline, isJa ? "第一印象を整理" : "Clarify the first impression", 64),
              description: cleanText(primaryIssue?.body, isJa ? "訪問直後に何を提供し、なぜ選ぶべきかが伝わる構成にします。" : "Make the offer and reason to choose you obvious immediately.", 140),
              icon: "tabler:sparkles",
            },
            {
              title: cleanText(secondaryIssue?.headline, isJa ? "信頼材料を前面に配置" : "Bring trust proof forward", 64),
              description: cleanText(secondaryIssue?.body, isJa ? "実績、比較材料、対応範囲を検討中の相手が迷わない位置に配置します。" : "Place proof, scope, and comparison details where buyers expect them.", 140),
              icon: "tabler:shield-check",
            },
            {
              title: cleanText(thirdIssue?.headline, isJa ? "問い合わせ導線を短縮" : "Shorten the inquiry path", 64),
              description: cleanText(thirdIssue?.body, isJa ? "フォーム、予約、相談CTAまでの心理的な距離を短くします。" : "Reduce hesitation between interest and a booked conversation.", 140),
              icon: "tabler:route",
            },
          ],
        },
      },
      {
        id: "stats",
        type: "Stats",
        props: {
          title: isJa ? "改善後の目標指標" : "Target improvement metrics",
          subtitle: isJa ? "診断結果と同業ベンチマークをもとにした初期目標です。" : "Initial targets based on diagnostic findings and industry benchmarks.",
          stats: [
            { amount: "85+", title: "PageSpeed", icon: "tabler:bolt" },
            { amount: "A+", title: "SSL / Trust", icon: "tabler:lock" },
            { amount: "3", title: isJa ? "主要CTA" : "Primary CTAs", icon: "tabler:target-arrow" },
            { amount: "24h", title: isJa ? "初期改善案" : "First action plan", icon: "tabler:clock" },
          ],
        },
      },
      {
        id: "cta",
        type: "CallToAction",
        props: {
          title: isJa ? "この改善案を実サイトに落とし込みます" : "Turn this demo into the live site",
          subtitle: isJa
            ? "15分で、優先順位、制作範囲、最短で問い合わせ改善につなげる実装順を整理します。"
            : "In 15 minutes we clarify priorities, scope, and the fastest implementation sequence.",
            callToAction: { variant: "primary", text: isJa ? JAPAN_ENTRY_CTA_JA : JAPAN_ENTRY_CTA_EN, href: "https://paradigmjp.com/en/contact?intent=japan-entry" },
        },
      },
    ],
    meta: {
      title: `${name} | ${isJa ? "Web改善デモサイト" : "Web Improvement Demo"}`,
      description: cleanText(report.hook, isJa ? `${name}のWeb改善デモ` : `${name} web improvement demo`, 150),
      industry,
      locale,
      company_name: name,
      accentColor: cfg.accentColor,
      accentColorDark: cfg.accentColorDark,
      calBookingUrl: ctaUrl,
      generator: "rules_v3",
      generated_at: new Date().toISOString(),
      engine: "rules",
    },
    engine: "rules",
  }
}

const DIFY_DEMO_SYSTEM_PROMPT = `You are a senior web strategist and Astro component planner for Paradigm Revenue OS.

Return only valid JSON. Do not wrap the response in markdown.

Create a high-quality, customer-sendable demo page blueprint from diagnostic evidence.
The output must match this shape:
{
  "theme": "astrowind" | "screwfast" | "astroship",
  "title": "Company | Web improvement demo",
  "blocks": [
    {
      "id": "stable-id",
      "type": "Hero" | "Features" | "Stats" | "CallToAction",
      "props": {}
    }
  ],
  "meta": {
    "title": "...",
    "description": "...",
    "industry": "...",
    "locale": "ja" | "en",
    "accentColor": "#7c3aed",
    "accentColorDark": "#5b21b6",
    "calBookingUrl": "https://cal.com/paradigm-jp/15min"
  }
}

Rules:
- If locale is "ja", all visible copy must be natural Japanese.
- Use the provided diagnostic acts as evidence; do not invent precise facts.
- Include at least Hero, Features, Stats, and CallToAction blocks.
- Keep copy concise enough to fit a polished landing page.
- Do not output mojibake, escaped HTML, markdown, or explanatory text.`
