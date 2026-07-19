import type { SourceCoverageSnapshot } from "./source-coverage"
import type {
  ManualCommercialEvidenceStatus,
  ManualCommercialSignal,
  ManualMarketPriority,
  QualificationStatus,
} from "./manual-japan-entry-types"

export const MANUAL_JAPAN_ENTRY_REPORT_SCHEMA = "manual_japan_entry_v2" as const

export type ManualReportDecisionStatus = "qualified" | "review_required" | "rejected"
export type ManualReportContactStatus = "verified" | "review_required" | "missing"

export interface ManualReportGap {
  id: string
  title: string
  observation: string
  source: string
  confidence: number
}

export interface ManualJapanEntryReportData {
  schemaVersion: typeof MANUAL_JAPAN_ENTRY_REPORT_SCHEMA
  reportKind: "manual_japan_entry_evidence_brief"
  generatedAt: string
  reportUrl: string
  company: {
    name: string
    domain: string
    countryCode: string | null
    businessModel: "ecommerce" | "saas" | "service"
    industry: string
    productContext: string
  }
  decision: {
    status: ManualReportDecisionStatus
    summary: string
    reasons: string[]
    smb: { status: QualificationStatus; confidence: number }
    japanEntryFit: { status: QualificationStatus; confidence: number }
  }
  market: {
    priority: ManualMarketPriority
    label: string
    rationale: string
    focusIndustries: string[]
    commercialEvidenceStatus: ManualCommercialEvidenceStatus
    commercialSignals: ManualCommercialSignal[]
    pricingPolicy: "no_automatic_country_adjustment"
  }
  japanReadiness: {
    checkedPageCount: number
    gaps: ManualReportGap[]
    summary: string
    disclaimer: string
  }
  contactRoute: {
    url: string | null
    status: ManualReportContactStatus
    method: string
    confidence: number
    reason: string
  }
  outreach: {
    purpose: "initial_interest"
    draft: string | null
    qualityPassed: boolean
    score: number | null
    uniquenessScore: number | null
    playbook: string
    variant: string
    angle: string
    reviewSummary: string
    neverSent: true
  }
  sourceCoverage: SourceCoverageSnapshot
  qualificationLedger: Record<string, unknown>
  nextActions: string[]
  guardrails: string[]
  provenance: {
    evidenceContract: "public-pages-only"
    sourceUrl: string
    generatedBy: "manual_japan_entry_workbench"
    legacyTemplateUsed: false
    automaticSendAllowed: false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function isManualJapanEntryReportData(value: unknown): value is ManualJapanEntryReportData {
  if (!isRecord(value) || value.schemaVersion !== MANUAL_JAPAN_ENTRY_REPORT_SCHEMA) return false
  const company = value.company
  const decision = value.decision
  const market = value.market
  const readiness = value.japanReadiness
  const contactRoute = value.contactRoute
  const outreach = value.outreach
  const sourceCoverage = value.sourceCoverage
  const provenance = value.provenance
  return value.reportKind === "manual_japan_entry_evidence_brief"
    && typeof value.generatedAt === "string"
    && typeof value.reportUrl === "string"
    && isRecord(company)
    && typeof company.name === "string"
    && isRecord(decision)
    && typeof decision.status === "string"
    && Array.isArray(decision.reasons)
    && isRecord(market)
    && Array.isArray(market.commercialSignals)
    && isRecord(readiness)
    && Array.isArray(readiness.gaps)
    && isRecord(contactRoute)
    && isRecord(outreach)
    && outreach.neverSent === true
    && isRecord(sourceCoverage)
    && Array.isArray(sourceCoverage.items)
    && Array.isArray(value.nextActions)
    && Array.isArray(value.guardrails)
    && isRecord(provenance)
    && provenance.legacyTemplateUsed === false
    && provenance.automaticSendAllowed === false
}
