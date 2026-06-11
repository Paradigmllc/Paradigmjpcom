import { getServiceSalesSupabase } from "@/lib/supabase"
import localeData from "./content-template-locales.json"
import { countryForLocale } from "./routing"
import type { Industry, Region, ReportLocale, TemplateVariant } from "./types"
import { INDUSTRIES } from "./types"
import { DB_TABLES } from "@/lib/sales/db-tables"

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

type LocaleText = Record<ReportLocale, string>

const CONTENT_TEMPLATE_LOCALES = localeData as {
  industries: Record<Industry, LocaleText>
  assets: Record<ContentAssetType, LocaleText>
  appeals: Record<ContentAppealAngle, LocaleText>
  purpose: Record<ContentAssetType | "sales_video_retention", LocaleText>
  quality: Record<ContentAssetType, LocaleText>
  selection: Record<"language" | "country" | "industry" | "asset" | "appeal" | "priority" | "guard", LocaleText>
  prompt: {
    intro: LocaleText
    evidence: LocaleText
    tone: LocaleText
    claimGuard: LocaleText
    appealPrefix: LocaleText
    urlGuard: LocaleText
    assetInstruction: Record<ContentAssetType, LocaleText>
  }
  sample: LocaleText
}

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

export const INDUSTRY_LABELS: Record<Industry, LocaleText> = CONTENT_TEMPLATE_LOCALES.industries

export const CONTENT_ASSET_LABELS: Record<ContentAssetType, LocaleText> = CONTENT_TEMPLATE_LOCALES.assets

export const CONTENT_APPEAL_LABELS: Record<ContentAppealAngle, LocaleText> = CONTENT_TEMPLATE_LOCALES.appeals

export const CONTENT_TEMPLATE_VARIANT_LABELS: Record<TemplateVariant, string> = {
  website_diagnostic: "Web診断",
  meo: "MEO",
  security: "セキュリティ",
  japan_entry: "日本参入",
  video_subscription: "動画サブスク",
  subsidy: "補助金",
  outreach: "アウトリーチ",
  dx_ai_package: "DX・AI",
}

const OFFER_BY_ANGLE: Record<ContentAppealAngle, { code: string; variant: TemplateVariant }> = {
  revenue_recovery: { code: "jp_web_production", variant: "website_diagnostic" },
  trust_authority: { code: "jp_web_production", variant: "website_diagnostic" },
  speed_conversion: { code: "jp_web_production", variant: "website_diagnostic" },
  automation_dx: { code: "jp_dx_package", variant: "dx_ai_package" },
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

function titleFor(locale: ReportLocale, industry: Industry, assetType: ContentAssetType, angle: ContentAppealAngle): string {
  return `${INDUSTRY_LABELS[industry][locale]} | ${CONTENT_APPEAL_LABELS[angle][locale]} | ${CONTENT_ASSET_LABELS[assetType][locale]}`
}

function purposeFor(locale: ReportLocale, assetType: ContentAssetType, angle: ContentAppealAngle): string {
  if (assetType === "sales_video" && angle === "video_retention") {
    return CONTENT_TEMPLATE_LOCALES.purpose.sales_video_retention[locale]
  }
  return CONTENT_TEMPLATE_LOCALES.purpose[assetType][locale]
}

function qualityBarFor(locale: ReportLocale, assetType: ContentAssetType): string {
  return CONTENT_TEMPLATE_LOCALES.quality[assetType][locale]
}

function selectionRuleFor(locale: ReportLocale, industry: Industry, assetType: ContentAssetType, angle: ContentAppealAngle): string {
  const selection = CONTENT_TEMPLATE_LOCALES.selection
  return [
    `${selection.language[locale]}=${locale}`,
    `${selection.country[locale]}=${countryForLocale(locale)}`,
    `${selection.industry[locale]}=${INDUSTRY_LABELS[industry][locale]}`,
    `${selection.asset[locale]}=${CONTENT_ASSET_LABELS[assetType][locale]}`,
    `${selection.appeal[locale]}=${CONTENT_APPEAL_LABELS[angle][locale]}`,
    selection.priority[locale],
    selection.guard[locale],
  ].join(" / ")
}

function promptFor(locale: ReportLocale, industry: Industry, assetType: ContentAssetType, angle: ContentAppealAngle): string {
  const prompt = CONTENT_TEMPLATE_LOCALES.prompt
  const industryName = INDUSTRY_LABELS[industry][locale]
  const base = [
    prompt.intro[locale].replace("{industry}", industryName),
    prompt.evidence[locale],
    prompt.tone[locale],
    prompt.claimGuard[locale],
  ]
  return [
    ...base,
    `${prompt.appealPrefix[locale]}: ${CONTENT_APPEAL_LABELS[angle][locale]}`,
    prompt.assetInstruction[assetType][locale],
    prompt.urlGuard[locale],
  ].join("\n")
}

function structureFor(assetType: ContentAssetType, angle: ContentAppealAngle): Record<string, unknown> {
  const common = { angle, personalization_inputs: ["company_name", "industry", "pain_points", "source_runs", "report_url", "demo_url"] }
  if (assetType === "diagnostic_report") return { ...common, sections: ["hero", "evidence", "business_impact", "proposal", "cta"] }
  if (assetType === "astro_demo_site") return { ...common, sections: ["hero", "proof_bar", "service_path", "case_preview", "booking_cta"] }
  if (assetType === "sales_deck") return { ...common, slides: ["title", "why_now", "evidence", "demo", "proposal", "timeline", "price_logic", "next_step"] }
  return { ...common, scenes: ["personal_hook", "evidence_reveal", "pain_to_solution", "demo_glimpse", "cta"] }
}

function sampleCopyFor(locale: ReportLocale, industry: Industry, assetType: ContentAssetType, angle: ContentAppealAngle): string {
  return CONTENT_TEMPLATE_LOCALES.sample[locale]
    .replace("{industry}", INDUSTRY_LABELS[industry][locale])
    .replace("{appeal}", CONTENT_APPEAL_LABELS[angle][locale])
    .replace("{asset}", CONTENT_ASSET_LABELS[assetType][locale])
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

function limitRows(rows: SalesContentTemplate[], limit?: number): SalesContentTemplate[] {
  return rows.slice(0, Math.max(1, limit ?? 300))
}

async function listRelaxedContentTemplates(input: ContentTemplateListInput): Promise<SalesContentTemplate[]> {
  const sb = getServiceSalesSupabase()
  if (!sb) return []

  let query = sb.from(DB_TABLES.SALES_CONTENT_TEMPLATES).select("*").order("updated_at", { ascending: false }).limit(600)
  if (isReportLocale(input.reportLocale)) query = query.eq("report_locale", input.reportLocale)
  if (isAssetType(input.assetType)) query = query.eq("asset_type", input.assetType)

  const { data, error } = await query
  if (error) {
    console.error("[sales-content-templates] relaxed list failed:", error.message)
    return []
  }

  const ranked = rankContentTemplates(
    {
      reportLocale: input.reportLocale,
      industry: input.industry,
      assetType: input.assetType,
      appealAngle: input.appealAngle,
    },
    (data ?? []) as SalesContentTemplate[],
  )
  return limitRows(filterTemplates(ranked, input), input.limit)
}

export async function listContentTemplates(input: ContentTemplateListInput = {}): Promise<{ rows: SalesContentTemplate[]; fallbackUsed: boolean }> {
  const fallback = buildInitialContentTemplates()
  const sb = getServiceSalesSupabase()
  if (!sb) return { rows: limitRows(filterTemplates(rankContentTemplates(input, fallback), input), input.limit), fallbackUsed: true }

  let query = sb.from(DB_TABLES.SALES_CONTENT_TEMPLATES).select("*").order("updated_at", { ascending: false }).limit(input.limit ?? 300)
  if (isReportLocale(input.reportLocale)) query = query.eq("report_locale", input.reportLocale)
  if (isIndustry(input.industry)) query = query.eq("industry", input.industry)
  if (isAssetType(input.assetType)) query = query.eq("asset_type", input.assetType)
  if (isAppealAngle(input.appealAngle)) query = query.eq("appeal_angle", input.appealAngle)

  const { data, error } = await query
  if (error) {
    console.error("[sales-content-templates] list fallback:", error.message)
    return { rows: filterTemplates(fallback, input), fallbackUsed: true }
  }
  const rows = limitRows(filterTemplates((data ?? []) as SalesContentTemplate[], input), input.limit)
  const hasScopedFilter =
    isReportLocale(input.reportLocale) ||
    isIndustry(input.industry) ||
    isAssetType(input.assetType) ||
    isAppealAngle(input.appealAngle)
  if (rows.length === 0 && hasScopedFilter) {
    const relaxedRows = await listRelaxedContentTemplates(input)
    if (relaxedRows.length > 0) return { rows: relaxedRows, fallbackUsed: false }
    return { rows: limitRows(filterTemplates(rankContentTemplates(input, fallback), input), input.limit), fallbackUsed: true }
  }
  return { rows, fallbackUsed: false }
}

function filterTemplates(rows: SalesContentTemplate[], input: ContentTemplateListInput): SalesContentTemplate[] {
  const q = typeof input.q === "string" ? input.q.trim().toLowerCase() : ""
  return rows.filter((row) => !q || `${row.title} ${row.purpose} ${row.quality_bar} ${row.dify_selection_rule}`.toLowerCase().includes(q))
}

export async function updateContentTemplate(input: ContentTemplateUpdateInput): Promise<SalesContentTemplate> {
  const sb = getServiceSalesSupabase()
  if (!sb) {
    console.error("[content-templates] Sales Supabase is not configured")
    throw new Error("Sales Supabase is not configured")
  }
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
  const { data, error } = await sb.from(DB_TABLES.SALES_CONTENT_TEMPLATES).update(patch).eq("id", input.id).select("*").single()
  if (error) {
    console.error("[content-templates] update failed:", error.message)
    throw new Error(error.message)
  }
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
