import type { JapanEntryProjection } from "./japan-entry-projection"
import type { FormDiscoveryResult } from "./sources/form-discovery"
import type { JapanMarketAudit } from "./sources/japan-market-audit"
import type { ManualCommercialSignal } from "./manual-japan-entry-types"

export const MANUAL_SOURCE_ROLES = [
  "discovery",
  "intent_trigger",
  "commercial_proof",
  "japan_fit",
  "legal_verification",
  "contact_route",
] as const

export type ManualSourceRole = (typeof MANUAL_SOURCE_ROLES)[number]

export const MANUAL_SOURCE_ROLE_LABELS: Record<ManualSourceRole, string> = {
  discovery: "企業発見",
  intent_trigger: "成長タイミング",
  commercial_proof: "支払力・事業成立",
  japan_fit: "Japan Fit",
  legal_verification: "法人確認",
  contact_route: "問い合わせ経路",
}

export interface ManualLeadSourceCatalogRow {
  slug: string
  name: string
  tier: "s_plus" | "s" | "a" | "b" | "verification"
  roles: ManualSourceRole[]
  sectors: string[]
  source_url: string | null
  access_mode: "api" | "directory" | "marketplace" | "registry" | "dataset" | "manual_review"
  priority: number
  active: boolean
  notes: string
}

export interface ManualWorkSourceAttribution {
  id: string
  work_id: string
  source_slug: string
  source_page_url: string
  observed_on: string
  created_at: string
}

export interface ManualWorkSourceInput {
  sourceSlug: string
  sourcePageUrl?: string | null
  observedOn?: string | null
}

export type QualificationStageStatus = "verified" | "pending" | "not_applicable"

export interface QualificationStage {
  status: QualificationStageStatus
  evidence: string[]
}

export interface ManualQualificationLedger {
  discovery: QualificationStage
  intent_trigger: QualificationStage
  commercial_proof: QualificationStage
  japan_fit: QualificationStage
  legal_verification: QualificationStage
  contact_route: QualificationStage
}

export interface ManualMasterLeadLedger {
  company_name: string
  domain: string
  legal_entity: null
  country: string | null
  city: null
  industry: string
  subindustry: string
  source_name: string
  source_url: string | null
  source_type: ManualSourceRole[]
  source_date: string
  trigger_event: null
  trigger_date: null
  founder_led: boolean | null
  employee_range: string | null
  funding_signal: string | null
  revenue_signal: string | null
  pricing: null
  commercial_product: boolean
  japan_category_demand: null
  japan_brand_signal: null
  japanese_page: boolean | null
  jpy_pricing: boolean | null
  local_payment: boolean | null
  local_competitors: null
  localization_friction: string[]
  estimated_opportunity_low: number | null
  estimated_opportunity_base: number | null
  estimated_opportunity_high: number | null
  confidence: number
  contact_form_url: string | null
  contact_form_type: string
  no_solicitation: null
  lead_score: null
  human_approved: false
  submitted_at: null
  status: "manual_review"
  evidence_classes: {
    observed: string[]
    modeled: string[]
    hypothesis: string[]
  }
}

interface SourceLedgerCompanyProfile {
  companyName: string
  countryCode: string | null
  isJapaneseCompany: boolean
  smbStatus: "qualified" | "review_required" | "rejected"
  smbConfidence: number
  smbEvidence: string[]
  japanEntryFitStatus: "qualified" | "review_required" | "rejected"
  japanEntryFitConfidence: number
  japanEntryFitEvidence: string[]
  businessModel: "ecommerce" | "saas" | "service"
  industry: string
  productContext: string
  observedFacts: string[]
  outreachPlaybook: string
  positioningConcept: unknown
  commercialSignals?: ManualCommercialSignal[]
}

function signalPhrase(profile: SourceLedgerCompanyProfile, kind: ManualCommercialSignal["kind"]): string | null {
  return profile.commercialSignals?.find((signal) => signal.kind === kind)?.sourcePhrase ?? null
}

function annualScenario(projection: JapanEntryProjection | null, scenario: "conservative" | "base" | "upside"): number | null {
  const row = projection?.scenarios.find((item) => item.scenario === scenario)
  if (!row) return null
  const value = row.months.slice(0, 12).reduce((sum, month) => sum + month.incrementalRevenueUsd, 0)
  return value > 0 ? value : null
}

export function buildManualSourceLedgers(input: {
  domain: string
  source: ManualLeadSourceCatalogRow
  sourcePageUrl: string | null
  sourceDate: string
  profile: SourceLedgerCompanyProfile
  audit: JapanMarketAudit
  form: FormDiscoveryResult
  projection: JapanEntryProjection | null
}): { qualification: ManualQualificationLedger; master: ManualMasterLeadLedger } {
  const sourceReference = input.sourcePageUrl ?? input.source.source_url
  const auditEvidence = input.audit.pages_checked.map((url) => `Observed public page: ${url}`)
  const formVerified = input.form.verification === "form" && input.form.confidence >= 90 && Boolean(input.form.formUrl)
  const localizationFriction = [
    input.audit.status.japanese_language_missing ? "Japanese-language customer path not observed" : null,
    input.profile.businessModel !== "service" && input.audit.status.jpy_currency_missing ? "Customer-facing JPY pricing not observed" : null,
    input.profile.businessModel === "ecommerce" && input.audit.status.japan_shipping_missing ? "Japan delivery terms not observed" : null,
    input.profile.businessModel === "ecommerce" && input.audit.status.local_payments_missing ? "Japan-local payment references not observed" : null,
  ].filter((value): value is string => Boolean(value))
  const discoveryEvidence = sourceReference
    ? [`${input.source.name}: ${sourceReference}`]
    : input.source.slug === "manual_input" ? [`Operator-entered company URL: https://${input.domain}`] : []
  const commercialSignals = input.profile.commercialSignals ?? []
  const observedCommercialEvidence = commercialSignals.map((signal) => `Observed on company public page: ${signal.sourcePhrase}`)
  const revenueEvidence = signalPhrase(input.profile, "foreign_currency_revenue")

  return {
    qualification: {
      discovery: {
        status: discoveryEvidence.length > 0 ? "verified" : "pending",
        evidence: discoveryEvidence.length > 0 ? discoveryEvidence : ["A catalog source was selected, but its company listing URL was not recorded."],
      },
      intent_trigger: {
        status: "pending",
        evidence: [input.source.roles.includes("intent_trigger")
          ? "This source can expose growth triggers, but no company-specific dated event has been verified."
          : "No company-specific funding, launch, hiring, release, or expansion event was supplied."],
      },
      commercial_proof: {
        status: "pending",
        evidence: [...observedCommercialEvidence, input.source.roles.includes("commercial_proof")
          ? "This source can provide commercial proof, but pricing, revenue, fees, reviews, or installs still require company-specific verification."
          : "Final payment capacity and business traction still require separate verification."],
      },
      japan_fit: {
        status: input.audit.pages_checked.length > 0 && input.profile.japanEntryFitStatus === "qualified" ? "verified" : "pending",
        evidence: auditEvidence.length > 0
          ? [...auditEvidence, `Japan Entry fit=${input.profile.japanEntryFitStatus} (${input.profile.japanEntryFitConfidence}/100).`]
          : ["Japan public-page evidence was not collected."],
      },
      legal_verification: {
        status: "pending",
        evidence: ["Country classification is not legal-entity verification; an official company registry check is still required."],
      },
      contact_route: {
        status: formVerified ? "verified" : "pending",
        evidence: formVerified
          ? [`Verified public form: ${input.form.formUrl}; confidence=${input.form.confidence}/100.`]
          : ["A high-confidence public inquiry form was not verified."],
      },
    },
    master: {
      company_name: input.profile.companyName,
      domain: input.domain,
      legal_entity: null,
      country: input.profile.countryCode,
      city: null,
      industry: input.profile.industry,
      subindustry: input.profile.outreachPlaybook,
      source_name: input.source.name,
      source_url: sourceReference,
      source_type: input.source.roles,
      source_date: input.sourceDate,
      trigger_event: null,
      trigger_date: null,
      founder_led: signalPhrase(input.profile, "founder_led") ? true : null,
      employee_range: signalPhrase(input.profile, "employee_range"),
      funding_signal: signalPhrase(input.profile, "funding"),
      revenue_signal: revenueEvidence,
      pricing: null,
      commercial_product: input.profile.productContext.length >= 12,
      japan_category_demand: null,
      japan_brand_signal: null,
      japanese_page: typeof input.audit.status.japanese_language_missing === "boolean" ? !input.audit.status.japanese_language_missing : null,
      jpy_pricing: input.profile.businessModel === "service" || typeof input.audit.status.jpy_currency_missing !== "boolean" ? null : !input.audit.status.jpy_currency_missing,
      local_payment: input.profile.businessModel !== "ecommerce" || typeof input.audit.status.local_payments_missing !== "boolean" ? null : !input.audit.status.local_payments_missing,
      local_competitors: null,
      localization_friction: localizationFriction,
      estimated_opportunity_low: annualScenario(input.projection, "conservative"),
      estimated_opportunity_base: annualScenario(input.projection, "base"),
      estimated_opportunity_high: annualScenario(input.projection, "upside"),
      confidence: Math.min(input.profile.smbConfidence, input.profile.japanEntryFitConfidence),
      contact_form_url: input.form.formUrl,
      contact_form_type: input.form.verification,
      no_solicitation: null,
      lead_score: null,
      human_approved: false,
      submitted_at: null,
      status: "manual_review",
      evidence_classes: {
        observed: [...input.profile.observedFacts, ...commercialSignals.map((signal) => signal.sourcePhrase), ...localizationFriction, ...(input.form.formUrl ? [input.form.formUrl] : [])],
        modeled: input.projection ? [input.projection.modelVersion] : [],
        hypothesis: ["Category demand, final payment capacity, legal entity, and local competitors require separate verification."],
      },
    },
  }
}
