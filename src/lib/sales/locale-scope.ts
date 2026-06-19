import { REPORT_LOCALES, countryForLocale, isReportLocale, normalizeReportLocale, type ReportLocale } from "./routing"
import { localeToRegion, type Region } from "./types"

export interface SalesLocaleScope {
  reportLocale: ReportLocale
  region: Region
  targetCountry: string
}

export interface ScopedCompanyLike {
  region?: string | null
  slug?: string | null
  reportUrl?: string | null
  report_url?: string | null
  reportLocale?: string | null
  report_locale?: string | null
  targetCountry?: string | null
  target_country?: string | null
}

export function salesScopeFromLocale(value: unknown, fallback: ReportLocale = "ja"): SalesLocaleScope {
  const reportLocale = isReportLocale(value) ? value : fallback
  return {
    reportLocale,
    region: localeToRegion(reportLocale),
    targetCountry: countryForLocale(reportLocale),
  }
}

export function salesScopeFromCountry(input: {
  reportLocale?: unknown
  targetCountry?: unknown
  fallbackLocale?: ReportLocale
}): SalesLocaleScope {
  if (isReportLocale(input.reportLocale)) return salesScopeFromLocale(input.reportLocale)
  const country = typeof input.targetCountry === "string" ? input.targetCountry.trim().toUpperCase() : ""
  const localeForCountry = REPORT_LOCALES.find((locale) => countryForLocale(locale) === country)
  if (localeForCountry) return salesScopeFromLocale(localeForCountry)
  if (country && country !== "JP") {
    const fallbackScope = salesScopeFromLocale(input.fallbackLocale ?? "en")
    return { ...fallbackScope, targetCountry: country }
  }
  return salesScopeFromLocale(input.fallbackLocale ?? "ja")
}

export function scopedReportLocale(company: ScopedCompanyLike, fallbackRegion: Region = "jp"): ReportLocale {
  const stored = company.reportLocale ?? company.report_locale
  const region = company.region === "global" ? "global" : fallbackRegion
  return normalizeReportLocale(stored, region)
}

export function scopedReportHref(company: ScopedCompanyLike): string | null {
  const locale = scopedReportLocale(company, company.region === "global" ? "global" : "jp")
  const storedUrl = company.reportUrl ?? company.report_url
  if (storedUrl && storedUrl.includes(`/${locale}/report/`)) return storedUrl
  if (company.slug) return `/${locale}/report/${company.slug}`
  return storedUrl ?? null
}

export function isCompanyInScope(company: ScopedCompanyLike, scope: SalesLocaleScope): boolean {
  const storedLocale = company.reportLocale ?? company.report_locale
  if (isReportLocale(storedLocale)) return storedLocale === scope.reportLocale
  return (company.region ?? "jp") === scope.region
}
