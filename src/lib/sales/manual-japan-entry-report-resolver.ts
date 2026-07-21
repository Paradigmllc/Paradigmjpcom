import type { JapanEntryProjection } from "./japan-entry-projection"
import type { ManualCompanyProfile, ManualJapanEntryWorkRow } from "./manual-japan-entry-types"
import type { ContactFormInspection } from "./sources/contact-form-inspection"
import type { DiscoveryMethod, FormDiscoveryResult } from "./sources/form-discovery"
import type { JapanMarketAudit } from "./sources/japan-market-audit"
import { parseManualCompanyProfile } from "./manual-japan-entry-profile"
import { buildManualJapanEntryReport } from "./manual-japan-entry-report"
import {
  isManualJapanEntryReportData,
  type ManualJapanEntryReportData,
} from "./manual-japan-entry-report-types"

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function booleanValue(value: unknown): boolean {
  return value === true
}

function boundedScore(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : 0
}

function fallbackProfile(item: ManualJapanEntryWorkRow): ManualCompanyProfile {
  try {
    return parseManualCompanyProfile(item.profile)
  } catch (error) {
    console.warn("[manual-work-report] stored profile required normalization:", {
      workId: item.id,
      error: error instanceof Error ? error.message : String(error),
    })
  }
  const raw = record(item.profile)
  return {
    companyName: item.company_name ?? item.domain,
    countryCode: item.country_code,
    isJapaneseCompany: item.is_japanese_company === true,
    smbStatus: item.smb_status ?? "review_required",
    smbConfidence: item.smb_confidence ?? 0,
    smbEvidence: stringArray(raw.smbEvidence),
    japanEntryFitStatus: item.japan_entry_fit_status ?? "review_required",
    japanEntryFitConfidence: item.japan_entry_fit_confidence ?? 0,
    japanEntryFitEvidence: stringArray(raw.japanEntryFitEvidence),
    businessModel: item.business_model ?? "service",
    industry: item.industry ?? "Technology / IT",
    productContext: item.product_context ?? `Public company website for ${item.domain}.`,
    observedFacts: stringArray(raw.observedFacts).length
      ? stringArray(raw.observedFacts)
      : [item.product_context ?? `Public company website for ${item.domain}.`],
    outreachPlaybook: item.outreach_playbook,
    positioningConcept: null,
    commercialSignals: [],
  }
}

function storedAudit(item: ManualJapanEntryWorkRow): JapanMarketAudit {
  const evidence = record(item.evidence)
  const raw = record(evidence.audit)
  const status = record(raw.status)
  const signals = record(raw.signals)
  return {
    engine: "local_heuristic",
    generated_at: typeof raw.generated_at === "string" ? raw.generated_at : item.updated_at,
    score: boundedScore(raw.score),
    status: {
      tokushoho_missing: booleanValue(status.tokushoho_missing),
      appi_missing: booleanValue(status.appi_missing),
      local_payments_missing: booleanValue(status.local_payments_missing),
      japanese_language_missing: booleanValue(status.japanese_language_missing),
      jpy_currency_missing: booleanValue(status.jpy_currency_missing),
      japan_shipping_missing: booleanValue(status.japan_shipping_missing),
    },
    signals: {
      tokushoho: stringArray(signals.tokushoho),
      appi: stringArray(signals.appi),
      local_payments: stringArray(signals.local_payments),
      japanese_language: stringArray(signals.japanese_language),
      jpy_currency: stringArray(signals.jpy_currency),
      japan_shipping: stringArray(signals.japan_shipping),
    },
    pages_checked: stringArray(raw.pages_checked),
    sales_pitch_context: typeof raw.sales_pitch_context === "string"
      ? raw.sales_pitch_context
      : "Stored public-page evidence reconstructed for the current report.",
    human_review_required: true,
    legal_disclaimer: typeof raw.legal_disclaimer === "string"
      ? raw.legal_disclaimer
      : "This is a bounded public-page screen, not legal advice or proof of Japan readiness.",
  }
}

const DISCOVERY_METHODS: readonly DiscoveryMethod[] = [
  "source", "dom", "sitemap", "heuristic", "llm", "crawl4ai", "spa", "fallback", "none",
]

const INSPECTION_REASONS: readonly ContactFormInspection["reason"][] = [
  "verified_contact_fields", "contact_page_only", "no_contact_intent", "non_contact_form",
  "untrusted_action", "empty_or_soft_404", "spa_fallback_duplicate",
]

function storedInspection(value: unknown): ContactFormInspection | null {
  const raw = record(value)
  const status = raw.status
  const reason = raw.reason
  if (!(["form", "page", "missing"] as const).includes(status as ContactFormInspection["status"])) return null
  if (!INSPECTION_REASONS.includes(reason as ContactFormInspection["reason"])) return null
  return {
    status: status as ContactFormInspection["status"],
    reason: reason as ContactFormInspection["reason"],
    fields: stringArray(raw.fields).filter((field): field is ContactFormInspection["fields"][number] =>
      (["name", "email", "message", "submit"] as const).includes(field as ContactFormInspection["fields"][number]),
    ),
    formCount: typeof raw.formCount === "number" ? Math.max(0, Math.round(raw.formCount)) : 0,
    action: typeof raw.action === "string" ? raw.action : null,
    sameOrigin: raw.sameOrigin === true,
    trustedProvider: raw.trustedProvider === true,
  }
}

function storedForm(item: ManualJapanEntryWorkRow): FormDiscoveryResult {
  const raw = record(item.form_discovery)
  const rawMethod = typeof raw.method === "string" ? raw.method : "none"
  const method = DISCOVERY_METHODS.includes(rawMethod as DiscoveryMethod) ? rawMethod as DiscoveryMethod : "none"
  const verification = raw.verification === "form" || raw.verification === "page" || raw.verification === "fallback"
    ? raw.verification
    : "none"
  const outcome = ["verified_form", "contact_page_only", "no_public_form", "site_unreachable", "invalid_origin"].includes(String(raw.outcome))
    ? raw.outcome as FormDiscoveryResult["outcome"]
    : undefined
  return {
    formUrl: item.form_url,
    method,
    verification,
    confidence: boundedScore(raw.confidence),
    inspection: storedInspection(raw.inspection),
    candidates: stringArray(raw.candidates),
    traceMs: typeof raw.traceMs === "number" && Number.isFinite(raw.traceMs) ? Math.max(0, raw.traceMs) : 0,
    outcome,
    outcomeReason: typeof raw.outcomeReason === "string" ? raw.outcomeReason : undefined,
    checkedUrlCount: typeof raw.checkedUrlCount === "number" ? Math.max(0, Math.round(raw.checkedUrlCount)) : undefined,
    checkedAt: typeof raw.checkedAt === "string" ? raw.checkedAt : undefined,
  }
}

function storedProjection(item: ManualJapanEntryWorkRow): JapanEntryProjection | null {
  const candidate = record(record(item.evidence).message_projection)
  const range = record(candidate.monthlyVisitRange)
  if (
    candidate.modelVersion !== "public-opportunity-v1"
    || candidate.classification !== "modeled-estimate"
    || typeof range.low !== "number"
    || typeof range.high !== "number"
    || !Array.isArray(candidate.scenarios)
  ) return null
  return candidate as unknown as JapanEntryProjection
}

export function resolveManualJapanEntryReportData(item: ManualJapanEntryWorkRow): ManualJapanEntryReportData {
  if (isManualJapanEntryReportData(item.report_data)) return item.report_data
  const rebuilt = buildManualJapanEntryReport({
    profile: fallbackProfile(item),
    audit: storedAudit(item),
    form: storedForm(item),
    initialMessage: item.initial_message,
    messageReview: item.message_review,
    reportUrl: item.report_url ?? `https://paradigmjp.com/en/work-report/${item.report_token}`,
    sourceUrl: item.canonical_url || item.input_url,
    qualificationLedger: item.qualification_ledger,
    projection: storedProjection(item),
  })
  return { ...rebuilt, generatedAt: item.updated_at }
}
