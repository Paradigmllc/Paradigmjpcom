import type { SourceCoverageSnapshot } from "./source-coverage"
import type {
  ManualCommercialEvidenceStatus,
  ManualCommercialSignal,
  ManualMarketPriority,
  QualificationStatus,
} from "./manual-japan-entry-types"

export const MANUAL_JAPAN_ENTRY_REPORT_SCHEMA = "manual_japan_entry_customer_v3" as const

export type ManualReportDecisionStatus = "qualified" | "review_required" | "rejected"
export type ManualReportContactStatus = "verified" | "review_required" | "missing"

export interface ManualReportGap {
  id: string
  title: string
  observation: string
  source: string
  confidence: number
}

export interface ManualCustomerReportPriority {
  title: string
  finding: string
  recommendation: string
  decisionValue: string
}

export interface ManualCustomerReportRoadmapStep {
  phase: string
  objective: string
  deliverable: string
}

export interface ManualCustomerReportSource {
  label: string
  url: string
}

export interface ManualJapanEntryReportData {
  schemaVersion: typeof MANUAL_JAPAN_ENTRY_REPORT_SCHEMA
  reportKind: "customer_japan_entry_opportunity_report"
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
  customerView: {
    title: "Japan Entry Opportunity Report"
    executiveSummary: string
    productSnapshot: string
    observedSignals: string[]
    opportunityHypothesis: {
      headline: string
      targetSegment: string
      rationale: string
      whyNow: string
      evidenceBoundary: string
    }
    projection: null | {
      monthlyVisitRange: string
      firstYearOpportunityRange: string
      basis: string
      disclaimer: string
    }
    priorities: ManualCustomerReportPriority[]
    roadmap: ManualCustomerReportRoadmapStep[]
    evidenceSources: ManualCustomerReportSource[]
    recommendedDecision: string
    methodology: string
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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0)
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isCustomerPriority(value: unknown): value is ManualCustomerReportPriority {
  return isRecord(value)
    && isText(value.title)
    && isText(value.finding)
    && isText(value.recommendation)
    && isText(value.decisionValue)
}

function isCustomerRoadmapStep(value: unknown): value is ManualCustomerReportRoadmapStep {
  return isRecord(value)
    && isText(value.phase)
    && isText(value.objective)
    && isText(value.deliverable)
}

function isCustomerSource(value: unknown): value is ManualCustomerReportSource {
  if (!isRecord(value) || !isText(value.label) || !isText(value.url)) return false
  try {
    return ["http:", "https:"].includes(new URL(value.url).protocol)
  } catch (error) {
    console.warn("[manual-work-report] invalid customer evidence URL:", error)
    return false
  }
}

function isCustomerView(value: unknown): value is ManualJapanEntryReportData["customerView"] {
  if (!isRecord(value) || !isRecord(value.opportunityHypothesis)) return false
  const hypothesis = value.opportunityHypothesis
  const projectionValid = value.projection === null || (
    isRecord(value.projection)
    && isText(value.projection.monthlyVisitRange)
    && isText(value.projection.firstYearOpportunityRange)
    && isText(value.projection.basis)
    && isText(value.projection.disclaimer)
  )
  return value.title === "Japan Entry Opportunity Report"
    && isText(value.executiveSummary)
    && isText(value.productSnapshot)
    && isStringArray(value.observedSignals)
    && value.observedSignals.length > 0
    && value.observedSignals.length <= 4
    && isText(hypothesis.headline)
    && isText(hypothesis.targetSegment)
    && isText(hypothesis.rationale)
    && isText(hypothesis.whyNow)
    && isText(hypothesis.evidenceBoundary)
    && projectionValid
    && Array.isArray(value.priorities)
    && value.priorities.length > 0
    && value.priorities.length <= 3
    && value.priorities.every(isCustomerPriority)
    && Array.isArray(value.roadmap)
    && value.roadmap.length === 3
    && value.roadmap.every(isCustomerRoadmapStep)
    && Array.isArray(value.evidenceSources)
    && value.evidenceSources.length > 0
    && value.evidenceSources.length <= 6
    && value.evidenceSources.every(isCustomerSource)
    && isText(value.recommendedDecision)
    && isText(value.methodology)
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
  return value.reportKind === "customer_japan_entry_opportunity_report"
    && typeof value.generatedAt === "string"
    && typeof value.reportUrl === "string"
    && isRecord(company)
    && typeof company.name === "string"
    && isCustomerView(value.customerView)
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
