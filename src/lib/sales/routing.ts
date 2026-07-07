import type { Region } from "./types"

export const REPORT_LOCALES = [
  "ja",
  "en",
  "ko",
  "zh",
  "de",
  "fr",
  "es",
  "pt",
  "ru",
  "ar",
  "vi",
  "id",
] as const

export type ReportLocale = (typeof REPORT_LOCALES)[number]

/** Canonical array of all 12 report locales (alias for REPORT_LOCALES) */
export const ALL_REPORT_LOCALES: readonly ReportLocale[] = REPORT_LOCALES

export const TEMPLATE_VARIANTS = [
  "website_diagnostic",
  "meo",
  "security",
  "japan_entry",
  "video_subscription",
  "subsidy",
  "outreach",
  "dx_ai_package",
] as const

export type TemplateVariant = (typeof TEMPLATE_VARIANTS)[number]

const DEFAULT_SITE_URL = "https://paradigmjp.com"

const LOCALE_COUNTRY: Record<ReportLocale, string> = {
  ja: "JP",
  en: "US",
  ko: "KR",
  zh: "CN",
  de: "DE",
  fr: "FR",
  es: "ES",
  pt: "BR",
  ru: "RU",
  ar: "AE",
  vi: "VN",
  id: "ID",
}

const COUNTRY_BY_DOMAIN_SUFFIX: Record<string, string> = {
  jp: "JP",
  "co.jp": "JP",
  za: "ZA",
  "co.za": "ZA",
  capetown: "ZA",
  uk: "GB",
  "co.uk": "GB",
  us: "US",
  ca: "CA",
  au: "AU",
  "com.au": "AU",
  nz: "NZ",
  kr: "KR",
  "co.kr": "KR",
  cn: "CN",
  tw: "TW",
  hk: "HK",
  sg: "SG",
  in: "IN",
  id: "ID",
  vn: "VN",
  th: "TH",
  my: "MY",
  ph: "PH",
  de: "DE",
  fr: "FR",
  es: "ES",
  pt: "PT",
  br: "BR",
  it: "IT",
  nl: "NL",
  se: "SE",
  no: "NO",
  dk: "DK",
  fi: "FI",
  pl: "PL",
  ru: "RU",
  ae: "AE",
  sa: "SA",
  mx: "MX",
  ar: "AR",
  cl: "CL",
}

export function isReportLocale(value: unknown): value is ReportLocale {
  return typeof value === "string" && (REPORT_LOCALES as readonly string[]).includes(value)
}

export function isTemplateVariant(value: unknown): value is TemplateVariant {
  return typeof value === "string" && (TEMPLATE_VARIANTS as readonly string[]).includes(value)
}

export function normalizeReportLocale(value: unknown, region: Region = "jp"): ReportLocale {
  if (isReportLocale(value)) return value
  return region === "jp" ? "ja" : "en"
}

export function countryForLocale(locale: ReportLocale): string {
  return LOCALE_COUNTRY[locale]
}

export function normalizeTargetCountry(value: unknown, locale: ReportLocale): string {
  if (typeof value === "string" && /^[A-Z]{2}$/.test(value.trim().toUpperCase())) {
    return value.trim().toUpperCase()
  }
  return countryForLocale(locale)
}

export function normalizeCountryCode(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().toUpperCase().replace(/[^A-Z]/g, "")
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null
}

export function inferTargetCountryFromDomain(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null
  const raw = value.trim().toLowerCase()
  let host = raw
  try {
    host = new URL(raw.startsWith("http") ? raw : `https://${raw}`).hostname.toLowerCase()
  } catch (error) {
    console.error("[sales-routing] invalid domain while inferring country:", { value, error })
    host = raw
  }
  const domain = host.replace(/^www\./, "").replace(/\.$/, "")
  if (!domain.includes(".")) return null
  const parts = domain.split(".").filter(Boolean)
  for (let i = 0; i < parts.length; i += 1) {
    const suffix = parts.slice(i).join(".")
    const country = COUNTRY_BY_DOMAIN_SUFFIX[suffix]
    if (country) return country
  }
  return null
}

export function normalizeTemplateVariant(value: unknown): TemplateVariant {
  return isTemplateVariant(value) ? value : "website_diagnostic"
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/$/, "")
}

function stableHash(input: string): string {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0
  }
  return hash.toString(36).slice(0, 6)
}

export function slugifyCompanyName(name: string): string {
  const slug = name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\w\u3040-\u30ff\u3400-\u9fff\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50)
  return slug || "company"
}

export function buildCompanySlug(companyName: string, _domain: string): string {
  // Use company name only (clean, human-readable). Hash removed per user request.
  // Uniqueness is enforced at the DB level with ON CONFLICT handling.
  return slugifyCompanyName(companyName)
}

export function buildReportUrl(locale: ReportLocale, slug: string): string {
  return `${siteUrl()}/${locale}/report/${slug}`
}

export function inferVariant(input: {
  templateVariant?: unknown
  targetCountry?: unknown
  reportLocale?: unknown
  issues?: readonly string[] | null
  meta?: Record<string, unknown> | null
}): TemplateVariant {
  if (isTemplateVariant(input.templateVariant)) return input.templateVariant

  const locale = normalizeReportLocale(input.reportLocale, "global")
  const country = normalizeTargetCountry(input.targetCountry, locale)
  const issues = input.issues ?? []
  const meta = input.meta ?? {}
  const place = meta.place as { found?: boolean; review_count?: number | null } | undefined

  if (issues.includes("ssl_expired") || issues.includes("wp_outdated")) return "security"
  if (place?.found || issues.includes("no_sns") || issues.includes("no_ogp")) return "meo"
  if (country !== "JP" && locale !== "ja") return "japan_entry"
  return "website_diagnostic"
}

export function getRoutingMeta(meta: Record<string, unknown> | null | undefined): {
  report_locale?: ReportLocale
  target_country?: string
  template_variant?: TemplateVariant
} {
  const routing = meta?.routing as Record<string, unknown> | undefined
  const reportLocale = isReportLocale(routing?.report_locale) ? routing.report_locale : undefined
  const targetCountry =
    typeof routing?.target_country === "string" && /^[A-Z]{2}$/.test(routing.target_country)
      ? routing.target_country
      : undefined
  const templateVariant = isTemplateVariant(routing?.template_variant)
    ? routing.template_variant
    : undefined
  return {
    report_locale: reportLocale,
    target_country: targetCountry,
    template_variant: templateVariant,
  }
}
