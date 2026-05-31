import { getServiceSalesSupabase } from "@/lib/supabase"
import { countryForLocale } from "./routing"
import type { Industry, Region, ReportLocale, TemplateVariant } from "./types"
import { INDUSTRIES } from "./types"

export const CONTENT_ASSET_TYPES = ["diagnostic_report", "astro_demo_site", "sales_deck", "sales_video"] as const
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

export interface ContentTemplateListInput {
  reportLocale?: string | null
  industry?: string | null
  assetType?: string | null
  appealAngle?: string | null
  q?: string | null
  limit?: number
}

export interface ContentTemplateUpdateInput {
  id: string
  report_locale?: string
  target_country?: string
  industry?: string
  offer_code?: string
  asset_type?: string
  appeal_angle?: string
  template_variant?: string
  title?: string
  purpose?: string
  quality_bar?: string
  dify_selection_rule?: string
  prompt_template?: string
  sample_copy?: string
  is_active?: boolean
}

export const REPORT_LOCALES = ["ja", "en", "ko", "zh", "de", "fr", "es", "pt", "ru", "ar", "vi", "id"] as const

const REGION_BY_LOCALE: Record<ReportLocale, Region> = {
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

export const INDUSTRY_LABELS: Record<Industry, { ja: string; en: string }> = {
  beauty_salon: { ja: "美容サロン", en: "beauty salon" },
  dental: { ja: "歯科医院", en: "dental clinic" },
  restaurant: { ja: "飲食店", en: "restaurant" },
  construction: { ja: "建設・工務店", en: "construction company" },
  accounting: { ja: "会計事務所", en: "accounting firm" },
  retail: { ja: "小売・店舗", en: "retail business" },
  cleaning: { ja: "清掃・メンテナンス", en: "cleaning service" },
  consulting: { ja: "コンサルティング", en: "consulting firm" },
}

export const CONTENT_ASSET_LABELS: Record<ContentAssetType, { ja: string; en: string }> = {
  diagnostic_report: { ja: "診断レポート", en: "diagnostic report" },
  astro_demo_site: { ja: "Astroデモサイト", en: "Astro replacement demo" },
  sales_deck: { ja: "営業資料", en: "sales deck" },
  sales_video: { ja: "営業動画", en: "sales video" },
}

export const CONTENT_APPEAL_LABELS: Record<ContentAppealAngle, { ja: string; en: string }> = {
  revenue_recovery: { ja: "売上機会の回収", en: "revenue recovery" },
  trust_authority: { ja: "信頼・権威づけ", en: "trust and authority" },
  speed_conversion: { ja: "速度・CV改善", en: "speed and conversion" },
  automation_dx: { ja: "DX・自動化", en: "automation and DX" },
  japan_entry: { ja: "日本市場参入", en: "Japan market entry" },
  video_retention: { ja: "動画継続納品", en: "video retention" },
}

export const CONTENT_TEMPLATE_VARIANT_LABELS: Record<TemplateVariant, string> = {
  website_diagnostic: "Web診断",
  meo: "MEO",
  security: "セキュリティ",
  japan_entry: "日本参入",
  video_subscription: "動画サブスク",
  subsidy: "補助金",
  outreach: "アウトリーチ",
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
  diagnostic_report: { primary: "Next.js", support: ["Dify", "DeepSeek V4", "PageSpeed", "Wappalyzer", "gBizInfo", "Google Places"] },
  astro_demo_site: { primary: "Astro", support: ["Dify", "Playwright screenshot", "Cloudflare R2"] },
  sales_deck: { primary: "Slidev", support: ["Gotenberg", "Dify", "Tavily", "Serp API"] },
  sales_video: { primary: "HyperFrames", support: ["ComfyUI", "Remotion", "Faster Whisper", "MoviePy", "Cloudflare R2"] },
}

const OUTPUT_CONTRACT: Record<ContentAssetType, Record<string, unknown>> = {
  diagnostic_report: { format: "json", required: ["executive_summary", "evidence", "business_impact", "proposal", "cta"] },
  astro_demo_site: { format: "astro_sections", required: ["hero", "proof_bar", "service_path", "case_preview", "booking_cta"] },
  sales_deck: { format: "slidev_markdown", required: ["title", "why_now", "evidence", "proposal", "timeline", "price_logic", "cta"] },
  sales_video: { format: "video_brief", required: ["hook", "scenes", "voiceover", "visual_prompts", "cta"] },
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
  return typeof value === "string" && (REPORT_LOCALES as readonly string[]).includes(value)
}

function isTemplateVariant(value: unknown): value is TemplateVariant {
  return typeof value === "string" && value in CONTENT_TEMPLATE_VARIANT_LABELS
}

function language(locale: ReportLocale): "ja" | "en" {
  return locale === "ja" ? "ja" : "en"
}

function titleFor(locale: ReportLocale, industry: Industry, assetType: ContentAssetType, angle: ContentAppealAngle): string {
  const lang = language(locale)
  return `${INDUSTRY_LABELS[industry][lang]} | ${CONTENT_APPEAL_LABELS[angle][lang]} | ${CONTENT_ASSET_LABELS[assetType][lang]}`
}

function purposeFor(locale: ReportLocale, assetType: ContentAssetType, angle: ContentAppealAngle): string {
  const ja = locale === "ja"
  if (assetType === "diagnostic_report") {
    return ja
      ? "公開データと実測値を、相手がすぐ理解できる損失仮説・改善優先度・提案導線へ変換する。"
      : "Turn public evidence into a clear loss hypothesis, prioritized actions, and a proposal path."
  }
  if (assetType === "astro_demo_site") {
    return ja
      ? "診断で見つけた弱点を、改善後のファーストビューとCTA導線として体験できるデモにする。"
      : "Convert diagnostic weaknesses into a tangible improved first view and CTA journey."
  }
  if (assetType === "sales_deck") {
    return ja
      ? "商談前後に共有できる、根拠・提案・費用感・進行計画が揃った意思決定用資料にする。"
      : "Package proof, proposal, pricing logic, and rollout into a decision-ready deck."
  }
  if (angle === "video_retention") {
    return ja
      ? "月次で量産できる動画納品サブスクの価値を、初回提案から具体的に見せる。"
      : "Show the value of a recurring short-video production subscription from the first proposal."
  }
  return ja
    ? "診断の要点を短い営業動画にして、資料内やフォローで視聴されやすくする。"
    : "Create a compact sales video that makes the diagnostic story easy to watch and share."
}

function qualityBarFor(locale: ReportLocale, assetType: ContentAssetType): string {
  const ja = locale === "ja"
  if (assetType === "diagnostic_report") {
    return ja
      ? "1画面目で結論・根拠・損失仮説・次アクションが読める。脅しではなく、客観データと改善余地を中心にする。"
      : "The first viewport shows conclusion, evidence, loss hypothesis, and next action without hype."
  }
  if (assetType === "astro_demo_site") {
    return ja
      ? "スマホで見た瞬間に、現状サイトとの差分、信頼要素、予約・問い合わせ導線が分かる。装飾より速度と明瞭さを優先する。"
      : "On mobile, the visitor immediately sees the improved difference, trust proof, and CTA path."
  }
  if (assetType === "sales_deck") {
    return ja
      ? "10枚以内。問題提起、実測根拠、提案、概算、導入順序、予約導線まで過不足なく入れる。"
      : "Ten slides or fewer, from problem and evidence to proposal, estimate, rollout, and booking."
  }
  return ja
    ? "冒頭15秒で相手企業固有の痛みを提示し、60秒前後で改善後の未来とCTAまで到達する。"
    : "Within 15 seconds, show the account-specific pain; around 60 seconds, reach the improved future and CTA."
}

function selectionRuleFor(locale: ReportLocale, industry: Industry, assetType: ContentAssetType, angle: ContentAppealAngle): string {
  const lang = language(locale)
  return [
    `言語=${locale}`,
    `国=${countryForLocale(locale)}`,
    `業界=${INDUSTRY_LABELS[industry][lang]}`,
    `成果物=${CONTENT_ASSET_LABELS[assetType][lang]}`,
    `訴求=${CONTENT_APPEAL_LABELS[angle][lang]}`,
    "優先順位: 完全一致 > 業界一致 > 商材一致 > 痛み根拠の強さ > 最新version",
    "Difyは企業カルテとsource_runsに存在する根拠だけを使い、未検証の法改正・罰金・市場統計・CAGRを断定しない。",
  ].join(" / ")
}

function promptFor(locale: ReportLocale, industry: Industry, assetType: ContentAssetType, angle: ContentAppealAngle): string {
  const ja = locale === "ja"
  const industryName = INDUSTRY_LABELS[industry][language(locale)]
  const base = ja
    ? [
        `あなたはParadigmの営業戦略・制作ディレクターです。対象は${industryName}です。`,
        "入力される企業カルテ、公開データ、実測値、診断レポートURL、デモURLだけを根拠にしてください。",
        "相手を煽りすぎず、経営者が次の15分商談を自然に受けたくなる温度で書いてください。",
        "法改正、罰金額、市場統計、CAGR、業界平均は一次情報URLが無い限り顧客向けに断定しないでください。",
      ]
    : [
        `You are Paradigm's sales strategist and production director. The target is a ${industryName}.`,
        "Use only the provided company dossier, public evidence, measured data, report URL, and demo URL.",
        "Keep the tone executive, specific, and helpful. Never invent unavailable evidence or overclaim results.",
        "Do not assert legal, penalty, market, CAGR, or benchmark claims without a primary-source URL.",
      ]
  const assetInstruction: Record<ContentAssetType, string> = {
    diagnostic_report: ja
      ? "Next.js診断レポート用に、hero、根拠カード、損失仮説、改善優先度、提案、CTAをJSONで出力してください。"
      : "Output JSON for a Next.js diagnostic report: hero, evidence cards, loss hypothesis, priorities, proposal, and CTA.",
    astro_demo_site: ja
      ? "Astroデモサイト用に、hero、信頼証拠、サービス導線、改善後CTA、計測イベントをセクション単位で出力してください。"
      : "Output Astro demo sections: hero, trust proof, service path, improved CTA, and tracking events.",
    sales_deck: ja
      ? "Slidev/GotenbergでPDF化できる営業資料として、10枚以内のMarkdownを出力してください。"
      : "Output Slidev-compatible Markdown for a PDF proposal deck in ten slides or fewer.",
    sales_video: ja
      ? "HyperFrames/Remotion/ComfyUI用に、60秒前後の構成、ナレーション、ビジュアル指示、字幕要約を出力してください。"
      : "Output a roughly 60-second brief for HyperFrames/Remotion/ComfyUI with scenes, narration, visuals, and captions.",
  }
  return [...base, `訴求角度: ${CONTENT_APPEAL_LABELS[angle][language(locale)]}`, assetInstruction[assetType], "URLは必ずそのまま保持してください。"].join("\n")
}

function structureFor(assetType: ContentAssetType, angle: ContentAppealAngle): Record<string, unknown> {
  const common = { angle, personalization_inputs: ["company_name", "industry", "pain_points", "source_runs", "report_url", "demo_url"] }
  if (assetType === "diagnostic_report") return { ...common, sections: ["hero", "evidence", "business_impact", "proposal", "cta"] }
  if (assetType === "astro_demo_site") return { ...common, sections: ["hero", "proof_bar", "service_path", "case_preview", "booking_cta"] }
  if (assetType === "sales_deck") return { ...common, slides: ["title", "why_now", "evidence", "demo", "proposal", "timeline", "price_logic", "next_step"] }
  return { ...common, scenes: ["personal_hook", "evidence_reveal", "pain_to_solution", "demo_glimpse", "cta"] }
}

function sampleCopyFor(locale: ReportLocale, industry: Industry, assetType: ContentAssetType, angle: ContentAppealAngle): string {
  const ja = locale === "ja"
  if (ja) {
    return `${INDUSTRY_LABELS[industry].ja}向けに「${CONTENT_APPEAL_LABELS[angle].ja}」を軸に、企業カルテと実測根拠から${CONTENT_ASSET_LABELS[assetType].ja}へ展開する。`
  }
  return `For a ${INDUSTRY_LABELS[industry].en}, turn measured evidence into a ${CONTENT_ASSET_LABELS[assetType].en} around ${CONTENT_APPEAL_LABELS[angle].en}.`
}

export function buildInitialContentTemplates(): SalesContentTemplate[] {
  const locales: ReportLocale[] = [...REPORT_LOCALES]
  return locales.flatMap((locale) =>
    INDUSTRIES.flatMap((industry) =>
      ANGLES_BY_LOCALE[locale].flatMap((angle) =>
        CONTENT_ASSET_TYPES.map((assetType) => {
          const offer = OFFER_BY_ANGLE[angle]
          return {
            region: REGION_BY_LOCALE[locale],
            report_locale: locale,
            target_country: countryForLocale(locale),
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

function normalizeMatchInput(input: ContentTemplateMatchInput): Required<ContentTemplateMatchInput> {
  const reportLocale = isReportLocale(input.reportLocale) ? input.reportLocale : "ja"
  const defaultAngle = reportLocale === "ja" ? "revenue_recovery" : "japan_entry"
  const appealAngle = isAppealAngle(input.appealAngle) ? input.appealAngle : defaultAngle
  const offer = OFFER_BY_ANGLE[appealAngle]
  return {
    reportLocale,
    targetCountry: typeof input.targetCountry === "string" && input.targetCountry ? input.targetCountry.toUpperCase() : countryForLocale(reportLocale),
    industry: isIndustry(input.industry) ? input.industry : "consulting",
    offerCode: typeof input.offerCode === "string" && input.offerCode ? input.offerCode : offer.code,
    assetType: isAssetType(input.assetType) ? input.assetType : "diagnostic_report",
    appealAngle,
    templateVariant: typeof input.templateVariant === "string" && input.templateVariant ? input.templateVariant : offer.variant,
  }
}

export function scoreContentTemplate(template: SalesContentTemplate, input: Required<ContentTemplateMatchInput>): number {
  let score = 0
  if (template.report_locale === input.reportLocale) score += 40
  if (template.target_country === input.targetCountry) score += 14
  if (template.industry === input.industry) score += 32
  if (template.asset_type === input.assetType) score += 28
  if (template.offer_code === input.offerCode) score += 18
  if (template.appeal_angle === input.appealAngle) score += 18
  if (template.template_variant === input.templateVariant) score += 12
  score += template.version
  return score
}

export function rankContentTemplates(input: ContentTemplateMatchInput, rows: SalesContentTemplate[]): SalesContentTemplate[] {
  const normalized = normalizeMatchInput(input)
  return rows
    .filter((template) => template.is_active)
    .sort((a, b) => scoreContentTemplate(b, normalized) - scoreContentTemplate(a, normalized))
}

export async function listContentTemplates(input: ContentTemplateListInput = {}): Promise<{ rows: SalesContentTemplate[]; fallbackUsed: boolean }> {
  const fallback = buildInitialContentTemplates()
  const sb = getServiceSalesSupabase()
  if (!sb) return { rows: filterTemplates(fallback, input), fallbackUsed: true }

  let query = sb.from("sales_content_templates").select("*").order("updated_at", { ascending: false }).limit(input.limit ?? 300)
  if (isReportLocale(input.reportLocale)) query = query.eq("report_locale", input.reportLocale)
  if (isIndustry(input.industry)) query = query.eq("industry", input.industry)
  if (isAssetType(input.assetType)) query = query.eq("asset_type", input.assetType)
  if (isAppealAngle(input.appealAngle)) query = query.eq("appeal_angle", input.appealAngle)

  const { data, error } = await query
  if (error) {
    console.error("[sales-content-templates] list fallback:", error.message)
    return { rows: filterTemplates(fallback, input), fallbackUsed: true }
  }
  return { rows: filterTemplates((data ?? []) as SalesContentTemplate[], input), fallbackUsed: false }
}

function filterTemplates(rows: SalesContentTemplate[], input: ContentTemplateListInput): SalesContentTemplate[] {
  const q = typeof input.q === "string" ? input.q.trim().toLowerCase() : ""
  return rows.filter((row) => !q || `${row.title} ${row.purpose} ${row.quality_bar} ${row.dify_selection_rule}`.toLowerCase().includes(q))
}

export async function updateContentTemplate(input: ContentTemplateUpdateInput): Promise<SalesContentTemplate> {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Sales Supabase is not configured")
  const patch: Partial<SalesContentTemplate> = {}
  if (isReportLocale(input.report_locale)) {
    patch.report_locale = input.report_locale
    patch.region = REGION_BY_LOCALE[input.report_locale]
  }
  if (typeof input.target_country === "string" && /^[A-Z]{2}$/i.test(input.target_country)) patch.target_country = input.target_country.toUpperCase()
  if (isIndustry(input.industry)) patch.industry = input.industry
  if (typeof input.offer_code === "string" && input.offer_code.trim()) patch.offer_code = input.offer_code.trim()
  if (isAssetType(input.asset_type)) patch.asset_type = input.asset_type
  if (isAppealAngle(input.appeal_angle)) patch.appeal_angle = input.appeal_angle
  if (isTemplateVariant(input.template_variant)) patch.template_variant = input.template_variant
  for (const key of ["title", "purpose", "quality_bar", "dify_selection_rule", "prompt_template", "sample_copy"] as const) {
    const value = input[key]
    if (typeof value === "string") patch[key] = value
  }
  if (typeof input.is_active === "boolean") patch.is_active = input.is_active
  const { data, error } = await sb.from("sales_content_templates").update(patch).eq("id", input.id).select("*").single()
  if (error) throw new Error(error.message)
  return data as SalesContentTemplate
}

export async function matchContentTemplate(input: ContentTemplateMatchInput): Promise<SalesContentTemplate> {
  const normalized = normalizeMatchInput(input)
  const fallback = rankContentTemplates(normalized, buildInitialContentTemplates())[0]
  const { rows } = await listContentTemplates({
    reportLocale: normalized.reportLocale,
    assetType: normalized.assetType,
    limit: 200,
  })
  return rankContentTemplates(normalized, rows)[0] ?? fallback
}

export async function getContentTemplateCoverage(): Promise<ContentTemplateCoverage> {
  const { rows, fallbackUsed } = await listContentTemplates({ limit: 1000 })
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
