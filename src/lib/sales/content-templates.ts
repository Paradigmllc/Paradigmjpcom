import { getServiceSalesSupabase } from "@/lib/supabase"
import type { Industry, Region, ReportLocale, TemplateVariant } from "./types"
import { INDUSTRIES } from "./types"

export const CONTENT_ASSET_TYPES = [
  "diagnostic_report",
  "astro_demo_site",
  "sales_deck",
  "sales_video",
] as const
export type ContentAssetType = (typeof CONTENT_ASSET_TYPES)[number]

export const CONTENT_APPEAL_ANGLES = [
  "revenue_recovery",
  "trust_authority",
  "speed_conversion",
  "automation_dx",
  "japan_entry",
  "video_retention",
] as const
export type ContentAppealAngle = (typeof CONTENT_APPEAL_ANGLES)[number]

export interface SalesContentTemplate {
  id?: string
  region: Region
  report_locale: ReportLocale
  target_country: string
  industry: Industry
  offer_code: string
  asset_type: ContentAssetType
  appeal_angle: ContentAppealAngle
  template_variant: TemplateVariant
  title: string
  purpose: string
  quality_bar: string
  dify_selection_rule: string
  structure: Record<string, unknown>
  prompt_template: string
  output_contract: Record<string, unknown>
  toolchain: Record<string, unknown>
  sample_copy: string
  is_active: boolean
  version: number
}

export interface ContentTemplateCoverage {
  total: number
  byLocale: Record<string, number>
  byAssetType: Record<string, number>
  byIndustry: Record<string, number>
  fallbackUsed: boolean
}

export interface ContentTemplateMatchInput {
  reportLocale?: string | null
  targetCountry?: string | null
  industry?: string | null
  offerCode?: string | null
  assetType?: string | null
  appealAngle?: string | null
  templateVariant?: string | null
}

const LOCALE_REGION: Record<ReportLocale, Region> = {
  ja: "jp",
  en: "global",
  ko: "global",
  zh: "global",
  de: "global",
  fr: "global",
  es: "global",
  pt: "global",
  ru: "global",
  ar: "global",
  vi: "global",
  id: "global",
}

const INDUSTRY_LABELS: Record<Industry, { ja: string; en: string }> = {
  beauty_salon: { ja: "美容サロン", en: "beauty salon" },
  dental: { ja: "歯科", en: "dental clinic" },
  restaurant: { ja: "飲食店", en: "restaurant" },
  construction: { ja: "建設・工務店", en: "construction company" },
  accounting: { ja: "会計事務所", en: "accounting firm" },
  retail: { ja: "小売・店舗", en: "retail business" },
  cleaning: { ja: "清掃・メンテナンス", en: "cleaning service" },
  consulting: { ja: "コンサルティング", en: "consulting firm" },
}

const OFFER_BY_ANGLE: Record<ContentAppealAngle, { code: string; variant: TemplateVariant }> = {
  revenue_recovery: { code: "jp_web_production", variant: "website_diagnostic" },
  trust_authority: { code: "jp_web_production", variant: "website_diagnostic" },
  speed_conversion: { code: "jp_web_production", variant: "website_diagnostic" },
  automation_dx: { code: "jp_dx_package", variant: "outreach" },
  japan_entry: { code: "global_jaas", variant: "japan_entry" },
  video_retention: { code: "global_video_subscription", variant: "video_subscription" },
}

const ANGLES_BY_LOCALE: Record<ReportLocale, ContentAppealAngle[]> = {
  ja: ["revenue_recovery", "trust_authority", "speed_conversion", "automation_dx"],
  en: ["japan_entry", "trust_authority", "speed_conversion", "video_retention"],
  ko: ["japan_entry"],
  zh: ["japan_entry"],
  de: ["japan_entry"],
  fr: ["japan_entry"],
  es: ["japan_entry"],
  pt: ["japan_entry"],
  ru: ["japan_entry"],
  ar: ["japan_entry"],
  vi: ["japan_entry"],
  id: ["japan_entry"],
}

const ASSET_TOOLCHAIN: Record<ContentAssetType, Record<string, unknown>> = {
  diagnostic_report: {
    primary: "Next.js",
    support: ["Dify", "DeepSeek V4", "PageSpeed", "Wappalyzer", "gBizInfo", "Google Places"],
  },
  astro_demo_site: {
    primary: "Astro",
    support: ["Dify", "Next.js preview", "Cloudflare R2"],
  },
  sales_deck: {
    primary: "Slidev",
    support: ["Gotenberg", "Dify", "Tavily", "Serp API"],
  },
  sales_video: {
    primary: "HyperFrames",
    support: ["ComfyUI", "Remotion", "Faster Whisper", "MoviePy", "Cloudflare R2"],
  },
}

const OUTPUT_CONTRACT: Record<ContentAssetType, Record<string, unknown>> = {
  diagnostic_report: {
    format: "json",
    required: ["hero", "evidence", "pain_points", "offer", "cta"],
  },
  astro_demo_site: {
    format: "astro_sections",
    required: ["hero", "proof", "service", "case", "cta"],
  },
  sales_deck: {
    format: "slidev_markdown",
    required: ["title", "problem", "evidence", "proposal", "timeline", "cta"],
  },
  sales_video: {
    format: "video_brief",
    required: ["hook", "scenes", "voiceover", "asset_prompts", "cta"],
  },
}

function isIndustry(value: unknown): value is Industry {
  return typeof value === "string" && (INDUSTRIES as readonly string[]).includes(value)
}

function isAssetType(value: unknown): value is ContentAssetType {
  return typeof value === "string" && (CONTENT_ASSET_TYPES as readonly string[]).includes(value)
}

function isAppealAngle(value: unknown): value is ContentAppealAngle {
  return typeof value === "string" && (CONTENT_APPEAL_ANGLES as readonly string[]).includes(value)
}

function isReportLocale(value: unknown): value is ReportLocale {
  return typeof value === "string" && ["ja", "en", "ko", "zh", "de", "fr", "es", "pt", "ru", "ar", "vi", "id"].includes(value)
}

function localeLanguage(locale: ReportLocale): "ja" | "en" {
  return locale === "ja" ? "ja" : "en"
}

function titleFor(locale: ReportLocale, industry: Industry, assetType: ContentAssetType, angle: ContentAppealAngle): string {
  const lang = localeLanguage(locale)
  const industryName = INDUSTRY_LABELS[industry][lang]
  const assetLabel = {
    diagnostic_report: lang === "ja" ? "診断レポート" : "diagnostic report",
    astro_demo_site: lang === "ja" ? "Astro差し替えデモ" : "Astro replacement demo",
    sales_deck: lang === "ja" ? "営業資料" : "sales deck",
    sales_video: lang === "ja" ? "営業動画" : "sales video",
  }[assetType]
  const angleLabel = {
    revenue_recovery: lang === "ja" ? "売上回復" : "revenue recovery",
    trust_authority: lang === "ja" ? "信頼強化" : "trust building",
    speed_conversion: lang === "ja" ? "速度・CV改善" : "speed and conversion",
    automation_dx: lang === "ja" ? "DX自動化" : "automation",
    japan_entry: lang === "ja" ? "日本進出" : "Japan entry",
    video_retention: lang === "ja" ? "動画継続納品" : "video retention",
  }[angle]
  return `${industryName} / ${angleLabel} / ${assetLabel}`
}

function purposeFor(locale: ReportLocale, assetType: ContentAssetType, angle: ContentAppealAngle): string {
  const ja = locale === "ja"
  if (assetType === "diagnostic_report") {
    return ja
      ? "公開データから痛み、機会損失、優先施策を可視化し、初回接触の信頼を作る。"
      : "Turn public evidence into pains, opportunity loss, and prioritized actions for the first touch."
  }
  if (assetType === "astro_demo_site") {
    return ja
      ? "診断結果をもとに、改善後のファーストビューと導線を即座に体験できるデモへ変換する。"
      : "Convert the diagnostic insight into a fast replacement demo with a clearer first view and CTA path."
  }
  if (assetType === "sales_deck") {
    return ja
      ? "商談前後に共有できる提案資料として、根拠、施策、費用感、次アクションを整理する。"
      : "Package evidence, plan, pricing logic, and next steps into a shareable proposal deck."
  }
  return angle === "video_retention"
    ? "Create a reusable short-form video package that can be delivered monthly and embedded in proposals."
    : ja
      ? "診断の要点を60秒前後の営業動画にし、資料内やフォローで視聴されやすくする。"
      : "Create a short diagnostic video that can be embedded in the deck and used in follow-ups."
}

function qualityBarFor(locale: ReportLocale, assetType: ContentAssetType): string {
  const ja = locale === "ja"
  if (assetType === "diagnostic_report") {
    return ja
      ? "1画面目で結論、根拠、損失、次アクションが読める。煽りではなく客観データを優先する。"
      : "The first viewport must show conclusion, evidence, loss, and next action without hype."
  }
  if (assetType === "astro_demo_site") {
    return ja
      ? "既存サイトの弱点に対する差し替え提案が伝わり、スマホでもCTAまで迷わない。"
      : "The demo must make the replacement idea obvious and keep mobile CTA friction low."
  }
  if (assetType === "sales_deck") {
    return ja
      ? "10枚以内で、課題、根拠、提案、見積、導入順、予約導線まで完結する。"
      : "Stay under ten slides and cover problem, proof, proposal, estimate, rollout, and booking."
  }
  return ja
    ? "15秒以内に痛みと改善後の未来が伝わり、60秒前後でCTAまで到達する。"
    : "Show the pain and improved future within 15 seconds and reach CTA around 60 seconds."
}

function selectionRuleFor(locale: ReportLocale, industry: Industry, assetType: ContentAssetType, angle: ContentAppealAngle): string {
  const industryName = INDUSTRY_LABELS[industry][localeLanguage(locale)]
  return [
    `locale=${locale}`,
    `industry=${industryName}`,
    `asset=${assetType}`,
    `angle=${angle}`,
    "Use when the company evidence and recommended offer match this scope.",
    "If multiple templates match, prefer exact locale, then exact industry, then exact offer, then strongest pain evidence.",
  ].join(" / ")
}

function promptFor(locale: ReportLocale, industry: Industry, assetType: ContentAssetType, angle: ContentAppealAngle): string {
  const ja = locale === "ja"
  const industryName = INDUSTRY_LABELS[industry][localeLanguage(locale)]
  const base = ja
    ? `${industryName}向けに、企業カルテの公開データ、痛み、推奨商材、レポートURL、デモURLを使って生成してください。`
    : `Generate for a ${industryName} using company evidence, pains, recommended offer, report URL, and demo URL.`
  const instruction = {
    diagnostic_report: ja
      ? "診断レポートは、結論、根拠、損失、改善順、CTAの順で構成してください。"
      : "Structure the report as conclusion, evidence, loss, prioritized fixes, and CTA.",
    astro_demo_site: ja
      ? "Astroデモは、ヒーロー、信頼証拠、サービス導線、事例、CTAの順で構成してください。"
      : "Structure the Astro demo as hero, trust proof, service path, case, and CTA.",
    sales_deck: ja
      ? "営業資料はSlidev/GotenbergでPDF化できるMarkdownとして、10枚以内で作成してください。"
      : "Create Slidev-compatible Markdown that Gotenberg can render to PDF in ten slides or fewer.",
    sales_video: ja
      ? "動画はComfyUI/HyperFrames/Remotion向けに、60秒前後のシーン割りとナレーションを作成してください。"
      : "Create a 60-second video brief for ComfyUI, HyperFrames, and Remotion with scenes and voiceover.",
  }[assetType]
  return `${base}\n${instruction}\nAppeal angle: ${angle}. Keep all URLs literal and never invent unavailable evidence.`
}

function structureFor(assetType: ContentAssetType, angle: ContentAppealAngle): Record<string, unknown> {
  const common = { angle, personalization_inputs: ["company_name", "industry", "pain_points", "source_runs", "report_url", "demo_url"] }
  if (assetType === "diagnostic_report") {
    return { ...common, sections: ["hero", "evidence", "pain", "loss", "offer", "cta"] }
  }
  if (assetType === "astro_demo_site") {
    return { ...common, sections: ["hero", "proof_bar", "service_cards", "case_preview", "booking_cta"] }
  }
  if (assetType === "sales_deck") {
    return { ...common, slides: ["title", "why_now", "evidence", "demo", "proposal", "timeline", "pricing", "next_step"] }
  }
  return { ...common, scenes: ["hook", "data_reveal", "pain", "solution", "proof", "cta"] }
}

function sampleCopyFor(locale: ReportLocale, industry: Industry, assetType: ContentAssetType, angle: ContentAppealAngle): string {
  const ja = locale === "ja"
  const industryName = INDUSTRY_LABELS[industry][localeLanguage(locale)]
  if (ja) return `${industryName}の${angle}訴求として、診断データから自然に${assetType}へ接続する構成です。`
  return `A ${industryName} ${angle} pattern that turns diagnostic evidence into a ${assetType}.`
}

export function buildInitialContentTemplates(): SalesContentTemplate[] {
  const locales: ReportLocale[] = ["ja", "en"]
  return locales.flatMap((locale) =>
    INDUSTRIES.flatMap((industry) =>
      ANGLES_BY_LOCALE[locale].flatMap((angle) =>
        CONTENT_ASSET_TYPES.map((assetType) => {
          const offer = OFFER_BY_ANGLE[angle]
          return {
            region: LOCALE_REGION[locale],
            report_locale: locale,
            target_country: locale === "ja" ? "JP" : "US",
            industry,
            offer_code: offer.code,
            asset_type: assetType,
            appeal_angle: angle,
            template_variant: offer.variant,
            title: titleFor(locale, industry, assetType, angle),
            purpose: purposeFor(locale, assetType, angle),
            quality_bar: qualityBarFor(locale, assetType),
            dify_selection_rule: selectionRuleFor(locale, industry, assetType, angle),
            structure: structureFor(assetType, angle),
            prompt_template: promptFor(locale, industry, assetType, angle),
            output_contract: OUTPUT_CONTRACT[assetType],
            toolchain: ASSET_TOOLCHAIN[assetType],
            sample_copy: sampleCopyFor(locale, industry, assetType, angle),
            is_active: true,
            version: 1,
          } satisfies SalesContentTemplate
        }),
      ),
    ),
  )
}

function scoreTemplate(template: SalesContentTemplate, input: Required<ContentTemplateMatchInput>): number {
  let score = 0
  if (template.report_locale === input.reportLocale) score += 40
  if (template.industry === input.industry) score += 32
  if (template.asset_type === input.assetType) score += 28
  if (template.offer_code === input.offerCode) score += 16
  if (template.appeal_angle === input.appealAngle) score += 16
  if (template.template_variant === input.templateVariant) score += 12
  return score
}

function normalizeMatchInput(input: ContentTemplateMatchInput): Required<ContentTemplateMatchInput> {
  const reportLocale = isReportLocale(input.reportLocale) ? input.reportLocale : "ja"
  const defaultAngle = reportLocale === "ja" ? "revenue_recovery" : "japan_entry"
  const appealAngle = isAppealAngle(input.appealAngle) ? input.appealAngle : defaultAngle
  const offer = OFFER_BY_ANGLE[appealAngle]
  return {
    reportLocale,
    targetCountry: typeof input.targetCountry === "string" && input.targetCountry ? input.targetCountry : reportLocale === "ja" ? "JP" : "US",
    industry: isIndustry(input.industry) ? input.industry : "consulting",
    offerCode: typeof input.offerCode === "string" && input.offerCode ? input.offerCode : offer.code,
    assetType: isAssetType(input.assetType) ? input.assetType : "diagnostic_report",
    appealAngle,
    templateVariant: typeof input.templateVariant === "string" && input.templateVariant ? input.templateVariant : offer.variant,
  }
}

export async function matchContentTemplate(input: ContentTemplateMatchInput): Promise<SalesContentTemplate> {
  const normalized = normalizeMatchInput(input)
  const fallback = buildInitialContentTemplates()
    .filter((template) => template.is_active)
    .sort((a, b) => scoreTemplate(b, normalized) - scoreTemplate(a, normalized))[0]

  const sb = getServiceSalesSupabase()
  if (!sb) return fallback

  const { data, error } = await sb
    .from("sales_content_templates")
    .select("*")
    .eq("is_active", true)
    .in("report_locale", [normalized.reportLocale, normalized.reportLocale === "ja" ? "en" : "ja"])
    .in("asset_type", [normalized.assetType])
    .limit(100)

  if (error) {
    console.error("[sales-content-templates] falling back to bundled templates:", error.message)
    return fallback
  }

  const rows = ((data ?? []) as SalesContentTemplate[]).sort(
    (a, b) => scoreTemplate(b, normalized) - scoreTemplate(a, normalized),
  )
  return rows[0] ?? fallback
}

export async function getContentTemplateCoverage(): Promise<ContentTemplateCoverage> {
  const fallback = buildInitialContentTemplates()
  const sb = getServiceSalesSupabase()
  let rows = fallback
  let fallbackUsed = true

  if (sb) {
    const { data, error } = await sb
      .from("sales_content_templates")
      .select("report_locale, asset_type, industry")
      .eq("is_active", true)
      .limit(1000)
    if (error) {
      console.error("[sales-content-templates] coverage fallback:", error.message)
    } else {
      rows = (data ?? []) as SalesContentTemplate[]
      fallbackUsed = false
    }
  }

  const byLocale: Record<string, number> = {}
  const byAssetType: Record<string, number> = {}
  const byIndustry: Record<string, number> = {}
  for (const row of rows) {
    byLocale[row.report_locale] = (byLocale[row.report_locale] ?? 0) + 1
    byAssetType[row.asset_type] = (byAssetType[row.asset_type] ?? 0) + 1
    byIndustry[row.industry] = (byIndustry[row.industry] ?? 0) + 1
  }
  return { total: rows.length, byLocale, byAssetType, byIndustry, fallbackUsed }
}
