import type { SalesCompany } from "../types"

type JsonRecord = Record<string, unknown>

export interface VerifiedOutreachMetric {
  id: string
  label: string
  value: number
  unit: string
  source: string
  sourceUrl: string | null
  measuredAt: string | null
  confidence: number
  calculation?: string
}

export interface VerifiedOutreachContext {
  metrics: VerifiedOutreachMetric[]
  unknowns: string[]
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null
}

function numberAt(record: JsonRecord, path: string[]): number | null {
  let cursor: unknown = record
  for (const key of path) {
    const current = asRecord(cursor)
    if (!current) return null
    cursor = current[key]
  }
  return typeof cursor === "number" && Number.isFinite(cursor) ? cursor : null
}

function stringAt(record: JsonRecord, paths: string[][]): string | null {
  for (const path of paths) {
    let cursor: unknown = record
    for (const key of path) {
      const current = asRecord(cursor)
      if (!current) {
        cursor = null
        break
      }
      cursor = current[key]
    }
    if (typeof cursor === "string" && cursor.trim().length > 0) return cursor.trim()
  }
  return null
}

function sourceContext(meta: JsonRecord, key: string): { record: JsonRecord; source: string; sourceUrl: string | null; measuredAt: string | null; trusted: boolean } {
  const record = asRecord(meta[key]) ?? {}
  const provider = stringAt(record, [["provider"], ["source"], ["engine"]])
  const source = key === "dataforseo"
    ? "DataForSEO API"
    : key === "similarweb"
      ? "Similarweb API"
      : provider ?? "verified API data"
  const sourceUrl = stringAt(record, [["source_url"], ["url"], ["report_url"], ["endpoint"]])
  const trusted = (key === "dataforseo" || key === "similarweb") && (
    sourceUrl !== null || record.verified === true
  )
  return {
    record,
    source,
    sourceUrl,
    measuredAt: stringAt(record, [["measured_at"], ["captured_at"], ["collected_at"], ["generated_at"]]),
    trusted,
  }
}

function addMetric(metrics: VerifiedOutreachMetric[], metric: VerifiedOutreachMetric | null): void {
  if (!metric || !Number.isFinite(metric.value)) return
  if (metrics.some((item) => item.id === metric.id)) return
  metrics.push(metric)
}

export function buildVerifiedOutreachContext(company: SalesCompany): VerifiedOutreachContext {
  const meta = asRecord(company.meta) ?? {}
  const metrics: VerifiedOutreachMetric[] = []
  const unknowns: string[] = []

  const dataforseo = sourceContext(meta, "dataforseo")
  const similarweb = sourceContext(meta, "similarweb")
  const monthlyCandidates = [
    { value: dataforseo.trusted ? numberAt(dataforseo.record, ["traffic", "monthly_visits"]) : null, context: dataforseo },
    { value: dataforseo.trusted ? numberAt(dataforseo.record, ["monthly_visits"]) : null, context: dataforseo },
    { value: similarweb.trusted ? numberAt(similarweb.record, ["monthly_visits"]) : null, context: similarweb },
  ]
  const monthlyCandidate = monthlyCandidates.find((candidate) => candidate.value !== null)
  const monthlyVisits = monthlyCandidate?.value ?? null
  const trafficSource = monthlyCandidate?.context ?? (dataforseo.trusted ? dataforseo : similarweb.trusted ? similarweb : null)
  const japanShareRaw =
    (dataforseo.trusted ? numberAt(dataforseo.record, ["traffic", "country_distribution", "JP"]) : null) ??
    (dataforseo.trusted ? numberAt(dataforseo.record, ["traffic", "countries", "JP"]) : null) ??
    (similarweb.trusted ? numberAt(similarweb.record, ["country_shares", "JP"]) : null)
  const japanSharePercent = japanShareRaw !== null && japanShareRaw <= 1 ? japanShareRaw * 100 : japanShareRaw

  addMetric(metrics, monthlyVisits === null ? null : {
    id: "monthly-visits",
    label: "Estimated monthly visits",
    value: Math.round(monthlyVisits),
    unit: "visits/month",
    source: trafficSource?.source ?? "No verified traffic provider",
    sourceUrl: trafficSource?.sourceUrl ?? null,
    measuredAt: trafficSource?.measuredAt ?? null,
    confidence: 0.78,
  })
  addMetric(metrics, japanSharePercent === null ? null : {
    id: "japan-traffic-share",
    label: "Estimated Japan traffic share",
    value: Number(japanSharePercent.toFixed(2)),
    unit: "%",
    source: trafficSource?.source ?? "No verified traffic provider",
    sourceUrl: trafficSource?.sourceUrl ?? null,
    measuredAt: trafficSource?.measuredAt ?? null,
    confidence: 0.72,
  })
  if (monthlyVisits !== null && japanSharePercent !== null) {
    addMetric(metrics, {
      id: "japan-monthly-visits",
      label: "Derived Japan visits",
      value: Math.round((monthlyVisits * japanSharePercent) / 100),
      unit: "visits/month",
      source: "Derived from verified traffic metrics",
      sourceUrl: trafficSource?.sourceUrl ?? null,
      measuredAt: trafficSource?.measuredAt ?? null,
      confidence: Math.min(0.7, trafficSource?.source === "verified API data" ? 0.5 : 0.68),
      calculation: "monthly visits × Japan traffic share ÷ 100",
    })
  }

  if (!metrics.some((item) => item.id === "japan-monthly-visits")) {
    unknowns.push("Japan monthly visits are unavailable from a verified traffic API")
  }
  if (japanSharePercent === null) unknowns.push("Japan traffic share is unavailable from a verified traffic API")
  if (metrics.length === 0) unknowns.push("No verified numeric evidence is available for personalized copy")
  return { metrics, unknowns }
}

export function formatVerifiedOutreachContext(context: VerifiedOutreachContext): string {
  const metrics = context.metrics.length === 0
    ? "なし"
    : context.metrics.map((metric) => {
      const provenance = [metric.source, metric.measuredAt, metric.sourceUrl].filter(Boolean).join(" / ")
      const calculation = metric.calculation ? `; calculation=${metric.calculation}` : ""
      return `- ${metric.id}: ${metric.label}=${metric.value} ${metric.unit}; source=${provenance}; confidence=${metric.confidence}${calculation}`
    }).join("\n")
  const unknowns = context.unknowns.length > 0 ? context.unknowns.join(" / ") : "なし"
  return `【検証済みメトリクス】\n${metrics}\n【未取得・未知】\n${unknowns}`
}
