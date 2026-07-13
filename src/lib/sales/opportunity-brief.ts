import { fetchDiagnosticReport, type DiagnosticReportData } from "./diagnostic"
import type { JapanEntryProjection } from "./japan-entry-projection"
import { normalizeReportLocale, type ReportLocale } from "./routing"
import { localeToRegion } from "./types"

type JsonRecord = Record<string, unknown>

export interface OpportunityFinding {
  id: string
  title: string
  detail: string
  status: "observed" | "gap" | "unknown"
  evidence: string[]
}

export interface CompetitorEvidence {
  label: string
  sourceUrl: string
  observedAt: string | null
}

export interface VerifiedCompetitor {
  name: string
  domain: string
  category: "direct" | "adjacent" | "substitute"
  summary: string
  strengths: string[]
  gaps: string[]
  evidence: CompetitorEvidence[]
}

export interface CompetitiveLandscape {
  status: "verified" | "pending_verification"
  reviewedAt: string | null
  methodology: string
  competitors: VerifiedCompetitor[]
}

export interface VerifiedDemandSignal {
  label: string
  statement: string
  sourceUrl: string
  observedAt: string | null
  confidence: number
}

export interface OpportunityBriefData {
  report: DiagnosticReportData
  projection: JapanEntryProjection
  findings: OpportunityFinding[]
  competition: CompetitiveLandscape
  demandSignals: VerifiedDemandSignal[]
  generatedAt: string
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : []
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null
  try {
    const url = new URL(value)
    return url.protocol === "https:" ? url.toString() : null
  } catch (error) {
    console.error("[opportunity-brief] invalid competitor evidence URL:", { value, error })
    return null
  }
}

export function readOpportunityProjection(meta: JsonRecord | undefined): JapanEntryProjection | null {
  const candidate = asRecord(meta?.japan_entry_projection)
  if (!candidate || candidate.modelVersion !== "public-opportunity-v1") return null
  const range = asRecord(candidate.monthlyVisitRange)
  const assumptions = asRecord(candidate.assumptions)
  if (
    candidate.classification !== "modeled-estimate" || typeof candidate.generatedAt !== "string" ||
    !finiteNumber(candidate.estimatedMonthlyVisits) || !finiteNumber(candidate.monthlyOpportunityGapUsd) ||
    !range || !finiteNumber(range.low) || !finiteNumber(range.high) ||
    !assumptions || !["ecommerce", "saas", "service"].includes(String(assumptions.businessModel)) ||
    !["averageOrderValueUsd", "conversionRate", "grossMargin", "currentJapanShare", "targetJapanShareMonth24", "monthlyManagedFeeUsdAfterMonth6", "setupFeeUsd"]
      .every((key) => finiteNumber(assumptions[key]))
  ) return null
  const markets = Array.isArray(candidate.markets) ? candidate.markets : []
  const scenarios = Array.isArray(candidate.scenarios) ? candidate.scenarios : []
  if (
    markets.length === 0 ||
    !markets.every((value) => {
      const market = asRecord(value)
      return market && typeof market.code === "string" && typeof market.label === "string" &&
        finiteNumber(market.estimatedMonthlyVisits) && finiteNumber(market.share) && finiteNumber(market.confidence)
    }) ||
    scenarios.length === 0 ||
    !["conservative", "base", "upside"].every((name) => scenarios.some((value) => asRecord(value)?.scenario === name)) ||
    !Array.isArray(candidate.evidence) || !Array.isArray(candidate.limitations) || !candidate.limitations.every((item) => typeof item === "string")
  ) return null
  const base = scenarios.map(asRecord).find((scenario) => scenario?.scenario === "base")
  const horizons = Array.isArray(base?.horizons) ? base.horizons.map(asRecord) : []
  if (![6, 12, 24].every((month) => horizons.some((row) =>
    row?.horizon === month &&
    ["month", "japanVisits", "incrementalRevenueUsd", "incrementalGrossProfitUsd", "cumulativeGrossProfitUsd", "cumulativeCostUsd", "cumulativeNetBenefitUsd", "roiPercent"]
      .every((key) => finiteNumber(row[key])),
  ))) return null
  return candidate as unknown as JapanEntryProjection
}

function competitorEvidence(value: unknown): CompetitorEvidence[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item): CompetitorEvidence[] => {
    const row = asRecord(item)
    const sourceUrl = httpsUrl(row?.source_url)
    if (!row || typeof row.label !== "string" || !sourceUrl) return []
    return [{
      label: row.label.trim(),
      sourceUrl,
      observedAt: typeof row.observed_at === "string" ? row.observed_at : null,
    }]
  })
}

export function readCompetitiveLandscape(meta: JsonRecord | undefined): CompetitiveLandscape {
  const raw = asRecord(meta?.japan_entry_competitor_analysis)
  const competitors = Array.isArray(raw?.competitors)
    ? raw.competitors.flatMap((item): VerifiedCompetitor[] => {
      const row = asRecord(item)
      const evidence = competitorEvidence(row?.evidence)
      const category = row?.category
      if (
        !row || typeof row.name !== "string" || typeof row.domain !== "string" ||
        typeof row.summary !== "string" ||
        (category !== "direct" && category !== "adjacent" && category !== "substitute") ||
        evidence.length === 0
      ) return []
      return [{
        name: row.name.trim(),
        domain: row.domain.trim(),
        category,
        summary: row.summary.trim(),
        strengths: strings(row.strengths),
        gaps: strings(row.gaps),
        evidence,
      }]
    })
    : []

  return {
    status: competitors.length > 0 ? "verified" : "pending_verification",
    reviewedAt: typeof raw?.reviewed_at === "string" ? raw.reviewed_at : null,
    methodology: typeof raw?.methodology === "string" && raw.methodology.trim().length > 0
      ? raw.methodology.trim()
      : "Named competitors are shown only after public-source verification. No competitor is inferred from category similarity alone.",
    competitors,
  }
}

export function readJapanDemandSignals(meta: JsonRecord | undefined): VerifiedDemandSignal[] {
  const raw = asRecord(meta?.japan_entry_competitor_analysis)
  const rows = Array.isArray(raw?.demand_signals)
    ? raw.demand_signals
    : Array.isArray(raw?.japan_demand_signals) ? raw.japan_demand_signals : []
  return rows.flatMap((item): VerifiedDemandSignal[] => {
    const row = asRecord(item)
    const sourceUrl = httpsUrl(row?.evidence_url ?? row?.source_url)
    const confidence = finiteNumber(row?.confidence) ? row.confidence : 0
    if (!row || typeof row.statement !== "string" || !sourceUrl || confidence < 0.55) return []
    const statement = row.statement.trim()
    if (!statement) return []
    return [{
      label: typeof row.label === "string" && row.label.trim() ? row.label.trim() : "Verified Japan demand signal",
      statement,
      sourceUrl,
      observedAt: typeof row.observed_at === "string" ? row.observed_at : null,
      confidence,
    }]
  }).slice(0, 4)
}

function auditFindings(meta: JsonRecord | undefined): OpportunityFinding[] {
  const audit = asRecord(meta?.japan_market_audit)
  const status = asRecord(audit?.status)
  const signals = asRecord(audit?.signals)
  if (!audit || !status) {
    return [{
      id: "audit-pending",
      title: "Japan readiness scan pending",
      detail: "No current public-page audit is available. Language, pricing, payments, shipping and legal readiness remain unverified.",
      status: "unknown",
      evidence: [],
    }]
  }

  const definitions = [
    ["japanese-language", "Japanese buying journey", "japanese_language_missing", "japanese_language", "Japanese-language signals"],
    ["jpy-pricing", "JPY pricing", "jpy_currency_missing", "jpy_currency", "JPY currency signals"],
    ["local-payments", "Local payment methods", "local_payments_missing", "local_payments", "Japan-local payment signals"],
    ["japan-shipping", "Japan shipping clarity", "japan_shipping_missing", "japan_shipping", "Japan shipping signals"],
    ["commerce-disclosure", "Commerce disclosure", "tokushoho_missing", "tokushoho", "Specified Commercial Transactions signals"],
    ["privacy", "Privacy and APPI readiness", "appi_missing", "appi", "Privacy and APPI signals"],
  ] as const

  return definitions.map(([id, title, statusKey, signalKey, evidenceLabel]) => {
    const missing = status[statusKey] !== false
    const observed = strings(signals?.[signalKey])
    return {
      id,
      title,
      detail: missing
        ? `${evidenceLabel} were not found in the public pages checked. This is a screening result, not legal advice.`
        : `${evidenceLabel} were observed in the public pages checked. Human review is still required before launch.`,
      status: missing ? "gap" : "observed",
      evidence: observed,
    }
  })
}

export function buildOpportunityBrief(report: DiagnosticReportData): OpportunityBriefData | null {
  const projection = readOpportunityProjection(report.meta)
  if (!projection || report.template_variant !== "japan_entry") return null
  return {
    report,
    projection,
    findings: auditFindings(report.meta),
    competition: readCompetitiveLandscape(report.meta),
    demandSignals: readJapanDemandSignals(report.meta),
    generatedAt: projection.generatedAt,
  }
}

export async function fetchOpportunityBrief(slug: string, localeValue: string): Promise<OpportunityBriefData | null> {
  const locale: ReportLocale = normalizeReportLocale(localeValue, localeToRegion(localeValue))
  const report = await fetchDiagnosticReport({ slug, region: localeToRegion(locale), reportLocale: locale })
  return report ? buildOpportunityBrief(report) : null
}
