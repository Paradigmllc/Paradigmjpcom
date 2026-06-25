import { inferTargetCountryFromDomain, normalizeCountryCode } from "./routing"
import type { TwentyRecord } from "./twenty-sync-utils"
import { hasSourceErrors, isDataStale, sourceCoverageTooLow } from "./twenty-pull-retry"

export function plainRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

export function countryCodeFromTwentyRecord(record: TwentyRecord, domain: string | null): string | null {
  const raw = record.paradigmCountryName?.trim()
  if (!raw) return inferTargetCountryFromDomain(domain)
  const upper = raw.toUpperCase()
  const code = normalizeCountryCode(upper)
  if (code) return code

  const byLabel: Record<string, string> = {
    JAPAN: "JP", NIPPON: "JP",
    UNITED_STATES: "US", "UNITED STATES": "US", UNITED_STATES_OF_AMERICA: "US", "UNITED STATES OF AMERICA": "US", AMERICA: "US", USA: "US",
    UNITED_KINGDOM: "GB", "UNITED KINGDOM": "GB", UK: "GB", BRITAIN: "GB", GREAT_BRITAIN: "GB", "GREAT BRITAIN": "GB",
    SOUTH_AFRICA: "ZA", "SOUTH AFRICA": "ZA",
    KOREA: "KR", SOUTH_KOREA: "KR", "SOUTH KOREA": "KR",
    CHINA: "CN", TAIWAN: "TW", CANADA: "CA", AUSTRALIA: "AU", INDIA: "IN", SINGAPORE: "SG",
    GERMANY: "DE", FRANCE: "FR", SPAIN: "ES", PORTUGAL: "PT", BRAZIL: "BR", RUSSIA: "RU",
    UAE: "AE", UNITED_ARAB_EMIRATES: "AE", "UNITED ARAB EMIRATES": "AE",
    VIETNAM: "VN", INDONESIA: "ID",
  }
  return byLabel[upper] ?? inferTargetCountryFromDomain(domain)
}

export function routingNeedsRepair(input: {
  company: {
    region?: string | null
    report_locale?: string | null
    target_country?: string | null
    template_variant?: string | null
  } | null
  inferredCountry: string | null
}): boolean {
  const company = input.company
  if (!company) return true
  if (!company.report_locale || !company.target_country || !company.template_variant) return true
  if (!input.inferredCountry) return false
  if (company.target_country !== input.inferredCountry) return true
  if (input.inferredCountry !== "JP" && (company.region === "jp" || company.report_locale === "ja")) return true
  if (input.inferredCountry !== "JP" && company.template_variant === "website_diagnostic") return true
  return false
}

export function contactFormUrlFromMeta(meta: Record<string, unknown>): string | null {
  const value = meta.contact_form_url
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export function needsGenerationCheck(record: TwentyRecord, patchMeta: Record<string, unknown>, companyPipelineStatus: string | null): boolean {
  const needsGen =
    !companyPipelineStatus ||
    companyPipelineStatus !== "report_ready" ||
    !patchMeta.report_url ||
    !patchMeta.contact_form_url
  if (needsGen) return true

  return (
    sourceCoverageTooLow(record, patchMeta) ||
    hasSourceErrors(patchMeta) ||
    isDataStale(patchMeta)
  )
}
