/**
 * Dify Demo Generator — AI-powered JSON blueprint generation
 *
 * Calls Dify Cloud workflow to generate personalized demo page blueprints
 * using LLM-powered copy generation. Falls back to rule-based generation
 * if Dify is unavailable.
 *
 * Dify API Key: DIFY_API_KEY (from reference_api_keys.md)
 * Dify Base URL: DIFY_API_BASE (default: https://api.dify.ai/v1)
 */
import type { DiagnosticReportData } from "./diagnostic"
import type { SalesCompany } from "./types"

// Inline industry config (duplicated from personalize.ts for independence)
const INDUSTRY_THEMES: Record<string, { theme: string; labelJa: string; labelEn: string; heroHook: string }> = {
  dental: { theme: "astrowind", labelJa: "歯科医院", labelEn: "Dental Clinic", heroHook: "新患数が2.4倍に。データが証明する歯科医院のWeb集患" },
  construction: { theme: "screwfast", labelJa: "建設業", labelEn: "Construction", heroHook: "問合せ数3.1倍。建設業のためのWeb集客改善" },
  consulting: { theme: "astrowind", labelJa: "コンサルティング", labelEn: "Consulting", heroHook: "成約率38%改善。コンサルティングファームのWeb刷新" },
  restaurant: { theme: "astroship", labelJa: "飲食店", labelEn: "Restaurant", heroHook: "予約率42%向上。データドリブンな飲食店Web戦略" },
  retail: { theme: "astroship", labelJa: "小売業", labelEn: "Retail", heroHook: "EC売上28%増。小売業のためのデジタル刷新" },
  beauty_salon: { theme: "astroship", labelJa: "美容サロン", labelEn: "Beauty Salon", heroHook: "予約数2.8倍。美容サロンのためのWeb集客改善" },
  accounting: { theme: "astrowind", labelJa: "会計事務所", labelEn: "Accounting Office", heroHook: "問合せ数2.1倍。会計事務所のための信頼構築Web戦略" },
  cleaning: { theme: "screwfast", labelJa: "清掃業", labelEn: "Cleaning Service", heroHook: "問合せ数2.5倍。清掃業のためのWeb集客改善" },
}

function selectTheme(industry: string): string {
  return INDUSTRY_THEMES[industry]?.theme || "astrowind"
}

function getIndustryConfig(industry: string) {
  return INDUSTRY_THEMES[industry] || INDUSTRY_THEMES.consulting
}

function readOptionalEnv(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

export interface DemoJsonBlueprint {
  theme: "astrowind" | "screwfast" | "astroship"
  title: string
  blocks: Array<{ id: string; type: string; props: Record<string, unknown> }>
  meta: Record<string, unknown>
  engine: "dify" | "rules"
}

/**
 * Call Dify Cloud to generate a demo page JSON blueprint.
 * Falls back to rule-based buildThemeDemoJson() if Dify fails.
 */
export async function generateDemoWithDify(
  company: SalesCompany,
  report: DiagnosticReportData,
): Promise<DemoJsonBlueprint> {
  const apiKey = readOptionalEnv("DIFY_API_KEY")
  const baseUrl = readOptionalEnv("DIFY_API_BASE") || "https://api.dify.ai/v1"

  if (!apiKey) {
    console.warn("[dify-demo] DIFY_API_KEY not configured, falling back to rules-based generation")
    return buildRulesBasedBlueprint(company, report)
  }

  try {
    const locale = company.report_locale ?? report.report_locale ?? "ja"
    const industry = company.industry || "consulting"
    const cfg = getIndustryConfig(industry)

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
          theme: selectTheme(industry),
          pagespeed_mobile: company.pagespeed_mobile,
          pagespeed_desktop: company.pagespeed_desktop,
          detected_issues: company.detected_issues ?? [],
          report_hook: report.hook,
          total_loss: report.total_loss,
          acts: report.acts?.slice(0, 5).map(a => ({
            headline: a.headline,
            body: a.body,
            metric_label: a.metric_label,
            metric_value: a.metric_value,
          })) ?? [],
          personalization_inputs: {
            industry_label: locale === "ja" ? cfg.labelJa : cfg.labelEn,
            services: cfg.services,
            faqs: cfg.faqs,
            metrics: cfg.metrics,
            hero_hook_template: cfg.heroHook,
          },
        },
        response_mode: "blocking",
        user: `paradigm-demo-${company.id}`,
      }),
      signal: AbortSignal.timeout(90000),
    })

    if (!res.ok) {
      console.error(`[dify-demo] Dify API returned ${res.status}`)
      return buildRulesBasedBlueprint(company, report)
    }

    const raw = await res.json() as Record<string, unknown>
    const data = (raw.data as Record<string, unknown>) ?? raw
    const outputs = (data.outputs as Record<string, unknown>) ?? data

    // Extract the generated JSON blueprint from Dify output
    const blueprintText =
      (outputs.text as string) ??
      (outputs.result as string) ??
      (outputs.json_blueprint as string) ??
      (data.answer as string)

    if (!blueprintText) {
      console.error("[dify-demo] No output from Dify")
      return buildRulesBasedBlueprint(company, report)
    }

    // Parse JSON from Dify output (may be wrapped in markdown code block)
    const jsonMatch = blueprintText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, blueprintText]
    const jsonStr = (jsonMatch[1] || blueprintText).trim()
    const parsed = JSON.parse(jsonStr) as {
      theme?: string
      title?: string
      blocks?: Array<{ id: string; type: string; props: Record<string, unknown> }>
      meta?: Record<string, unknown>
    }

    if (!parsed.blocks || !Array.isArray(parsed.blocks) || parsed.blocks.length === 0) {
      console.error("[dify-demo] Dify returned invalid blueprint structure, falling back")
      return buildRulesBasedBlueprint(company, report)
    }

    console.warn(`[dify-demo] AI-generated blueprint for ${company.company_name}: ${parsed.blocks.length} blocks, theme=${parsed.theme}`)

    return {
      theme: (parsed.theme as "astrowind" | "screwfast" | "astroship") || selectTheme(industry),
      title: parsed.title || `${company.company_name} — ${locale === "ja" ? "Web改善デモ" : "Web Improvement Demo"}`,
      blocks: parsed.blocks,
      meta: {
        ...parsed.meta,
        generator: "dify_llm",
        generated_at: new Date().toISOString(),
        engine: "dify",
      },
      engine: "dify",
    }
  } catch (e) {
    console.error("[dify-demo] Error:", e instanceof Error ? e.message : String(e))
    return buildRulesBasedBlueprint(company, report)
  }
}

/**
 * Rule-based fallback — uses industry templates and diagnostic data.
 */
function buildRulesBasedBlueprint(
  company: SalesCompany,
  report: DiagnosticReportData,
): DemoJsonBlueprint {
  const locale = company.report_locale ?? report.report_locale ?? "ja"
  const ja = locale === "ja"
  const name = company.company_name
  const industry = company.industry || "consulting"
  const theme = selectTheme(industry)
  const ctaUrl = "https://cal.com/paradigm-jp/15min"

  return {
    theme,
    title: `${name} — ${ja ? "Web改善デモサイト" : "Web Improvement Demo"}`,
    blocks: [
      {
        id: "hero",
        type: "Hero",
        props: {
          title: report.hook ?? `${name}のWebサイト改善提案`,
          subtitle: ja
            ? "データ診断に基づくパーソナライズド改善プラン。御社のデジタルプレゼンスを次のステージへ。"
            : "Personalized improvement plan based on data diagnostics.",
          tagline: ja ? "データ診断済み · 改善提案" : "Data-Diagnosed · Improvement Plan",
          actions: [
            { variant: "primary", text: ja ? "無料診断を申し込む" : "Get Free Diagnostic", href: ctaUrl },
            { variant: "secondary", text: ja ? "改善内容を見る" : "See Improvements", href: "#features" },
          ],
        },
      },
      {
        id: "features",
        type: "Features",
        props: {
          title: ja ? "改善ソリューション" : "Improvement Solutions",
          subtitle: ja ? `${name}の特性に合わせた最適プラン` : `Tailored plans for ${name}`,
          items: (report.acts ?? []).slice(0, 3).map((act, i) => ({
            title: act.headline?.slice(0, 60) ?? (ja ? "改善施策" : "Improvement"),
            description: act.body?.slice(0, 120) ?? "",
            icon: ["tabler:search", "tabler:palette", "tabler:chart-bar"][i] || "tabler:star",
          })),
        },
      },
      {
        id: "stats",
        type: "Stats",
        props: {
          title: ja ? "改善シミュレーション" : "Improvement Simulation",
          subtitle: ja ? "同業他社での改善実績に基づく想定インパクト" : "Projected impact based on industry benchmarks",
          stats: [
            { amount: "2.4", title: ja ? "問合せ増加倍率" : "Inquiry Multiplier", icon: "tabler:trending-up" },
            { amount: 92, title: "PageSpeed", icon: "tabler:bolt" },
            { amount: "38", title: ja ? "CVR改善率 (%)" : "CVR Gain (%)", icon: "tabler:chart-pie" },
            { amount: "#3", title: ja ? "主要KW 順位" : "Primary KW Rank", icon: "tabler:search" },
          ],
        },
      },
      {
        id: "cta",
        type: "CallToAction",
        props: {
          title: ja ? "まずは無料診断から" : "Start with a Free Diagnostic",
          subtitle: ja ? "15分のオンライン診断で改善余地を可視化します" : "15-min online diagnostic reveals your improvement potential",
          callToAction: { variant: "primary", text: ja ? "無料診断を申し込む" : "Book Free Consult", href: ctaUrl },
        },
      },
    ],
    meta: {
      title: `${name} — ${ja ? "Web改善デモサイト" : "Web Improvement Demo"}`,
      description: report.hook ?? `${name} improvement proposal`,
      industry,
      locale,
      calBookingUrl: ctaUrl,
      generator: "rules_v2",
      generated_at: new Date().toISOString(),
    },
    engine: "rules",
  }
}

const DIFY_DEMO_SYSTEM_PROMPT = `あなたはプロのWeb制作ディレクターです。
企業の診断データに基づいて、最高品質のWebサイト構成JSONを生成してください。

## 出力形式
{
  "theme": "astrowind" | "screwfast" | "astroship",
  "title": "企業名 — Web改善デモ",
  "blocks": [
    {
      "id": "一意のID",
      "type": "Widget名（Hero, Features, Stats, CallToAction, FAQs, Testimonials, Pricing, Steps, Content, Brands, Contact から選択）",
      "props": { Widget固有のプロパティ（title, subtitle, items, stats, actions など） }
    }
  ],
  "meta": {
    "title": "ページタイトル",
    "description": "メタディスクリプション（120文字以内）",
    "industry": "業種コード",
    "locale": "ja/en",
    "accentColor": "#HEXカラー",
    "accentColorDark": "#HEXカラー",
    "calBookingUrl": "https://cal.com/paradigm-jp/15min"
  }
}

## 必須ブロック（最低6個）
1. Hero — 企業名 + 診断結果の核心 + CTA
2. Features — 3-6改善施策
3. Stats — 診断指標（PageSpeed/損失額/改善余地）
4. Testimonials — 想定効果
5. FAQs — 業種別FAQ 3-5問
6. CallToAction — 最終CTA

## コピールール
- 診断データの具体的数値を必ず盛り込む
- 日本語は「です・ます」調
- Heroタイトルは20-30文字
- CTAは「無料診断を申し込む」など行動喚起型
- 誇大表現禁止`
