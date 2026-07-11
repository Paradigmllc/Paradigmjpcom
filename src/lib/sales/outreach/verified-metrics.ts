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

function sourceContext(meta: JsonRecord, key: string): { source: string; sourceUrl: string | null; measuredAt: string | null } {
  const record = asRecord(meta[key]) ?? {}
  const provider = stringAt(record, [["provider"], ["source"], ["engine"]])
  const source = key === "dataforseo"
    ? "DataForSEO API"
    : key === "similarweb"
      ? "Similarweb API"
      : key === "similarweb_free"
        ? "Similarweb public estimate (not API)"
      : provider ?? "verified API data"
  return {
    source,
    sourceUrl: stringAt(record, [["source_url"], ["url"], ["report_url"], ["endpoint"]]),
    measuredAt: stringAt(record, [["measured_at"], ["captured_at"], ["collected_at"], ["generated_at"]]),
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
  const enrichmentMeta = asRecord(meta.sales_os) ?? asRecord(meta.enrichment) ?? {}
  const measuredAt = stringAt(meta, [
    ["pagespeed", "measured_at"],
    ["scan", "measured_at"],
  ]) ?? stringAt(enrichmentMeta, [["last_enriched_at"], ["measured_at"]])
  const monthlyCandidates = [
    { value: numberAt(asRecord(meta.dataforseo) ?? {}, ["traffic", "monthly_visits"]), context: dataforseo },
    { value: numberAt(asRecord(meta.dataforseo) ?? {}, ["monthly_visits"]), context: dataforseo },
    { value: numberAt(asRecord(meta.similarweb) ?? {}, ["monthly_visits"]), context: similarweb },
  ]
  const monthlyCandidate = monthlyCandidates.find((candidate) => candidate.value !== null)
  const monthlyVisits = monthlyCandidate?.value ?? null
  const trafficSource = monthlyCandidate?.context ?? similarweb
  const japanShareRaw =
    numberAt(asRecord(meta.traffic) ?? {}, ["japan_share_percent"]) ??
    numberAt(asRecord(meta.traffic) ?? {}, ["jp_share_percent"]) ??
    numberAt(asRecord(meta.dataforseo) ?? {}, ["traffic", "country_distribution", "JP"]) ??
    numberAt(asRecord(meta.dataforseo) ?? {}, ["traffic", "countries", "JP"]) ??
    numberAt(asRecord(meta.similarweb) ?? {}, ["country_shares", "JP"])
  const japanSharePercent = japanShareRaw !== null && japanShareRaw <= 1 ? japanShareRaw * 100 : japanShareRaw

  addMetric(metrics, monthlyVisits === null ? null : {
    id: "monthly-visits",
    label: "Estimated monthly visits",
    value: Math.round(monthlyVisits),
    unit: "visits/month",
    source: trafficSource.source,
    sourceUrl: trafficSource.sourceUrl,
    measuredAt: trafficSource.measuredAt,
    confidence: 0.78,
  })
  addMetric(metrics, japanSharePercent === null ? null : {
    id: "japan-traffic-share",
    label: "Estimated Japan traffic share",
    value: Number(japanSharePercent.toFixed(2)),
    unit: "%",
    source: trafficSource.source,
    sourceUrl: trafficSource.sourceUrl,
    measuredAt: trafficSource.measuredAt,
    confidence: 0.72,
  })
  if (monthlyVisits !== null && japanSharePercent !== null) {
    addMetric(metrics, {
      id: "japan-monthly-visits",
      label: "Derived Japan visits",
      value: Math.round((monthlyVisits * japanSharePercent) / 100),
      unit: "visits/month",
      source: "Derived from verified traffic metrics",
      sourceUrl: trafficSource.sourceUrl,
      measuredAt: trafficSource.measuredAt,
      confidence: Math.min(0.7, trafficSource.source === "verified API data" ? 0.5 : 0.68),
      calculation: "monthly visits × Japan traffic share ÷ 100",
    })
  }

  if (company.pagespeed_mobile !== null && company.pagespeed_mobile !== undefined) {
    addMetric(metrics, {
      id: "pagespeed-mobile",
      label: "Mobile PageSpeed score",
      value: company.pagespeed_mobile,
      unit: "score/100",
      source: "PageSpeed Insights data",
      sourceUrl: company.domain ? `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(company.domain)}` : null,
      measuredAt,
      confidence: 0.85,
    })
  }
  if (company.pagespeed_desktop !== null && company.pagespeed_desktop !== undefined) {
    addMetric(metrics, {
      id: "pagespeed-desktop",
      label: "Desktop PageSpeed score",
      value: company.pagespeed_desktop,
      unit: "score/100",
      source: "PageSpeed Insights data",
      sourceUrl: company.domain ? `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(company.domain)}` : null,
      measuredAt,
      confidence: 0.85,
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
