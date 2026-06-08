import { getServiceSalesSupabase } from "@/lib/supabase"
import type { TechItem } from "@/lib/sales/sources/wappalyzer"
import type { SalesCompany } from "@/lib/sales/types"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export interface SourceAcquisitionSourceMetric {
  sourceSlug: string
  label: string
  category: string
  total: number
  collected: number
  configured: number
  queued: number
  missing: number
  disabled: number
  error: number
  successRate: number
  averageScore: number
  lastMeasuredAt: string | null
  detail?: string
  meaning?: string
}

export interface SourceAcquisitionCategoryMetric {
  category: string
  total: number
  collected: number
  successRate: number
}

export interface SourceAcquisitionTechMetric {
  technologyName: string
  technologySlug: string
  category: string
  companyCount: number
  detections: number
  averageConfidence: number
  lastDetectedAt: string | null
}

export interface SourceAcquisitionSummary {
  totalRuns: number
  sourceTypes: number
  companiesMeasured: number
  collected: number
  configured: number
  queued: number
  missing: number
  disabled: number
  error: number
  successRate: number
  latestMeasuredAt: string | null
  sourceMetrics: SourceAcquisitionSourceMetric[]
  categoryMetrics: SourceAcquisitionCategoryMetric[]
  techDetectionsTotal: number
  technologiesTotal: number
  techCompaniesTotal: number
  techCategories: string[]
  topTechnologies: SourceAcquisitionTechMetric[]
  errors: string[]
}

export interface SourceRunRow {
  company_id: string
  source_slug: string
  category: string | null
  status: string
  score: number | null
  measured_at: string | null
  details: JsonRecord | null
}

export interface TechDetectionRow {
  company_id: string
  technology_name: string
  technology_slug: string
  category: string
  confidence: number | null
  detected_at: string | null
}

interface CompanyTechFallbackRow {
  id: string
  meta: JsonRecord | null
  updated_at: string | null
}

export function emptySourceAcquisitionSummary(errors: string[] = []): SourceAcquisitionSummary {
  return {
    totalRuns: 0,
    sourceTypes: 0,
    companiesMeasured: 0,
    collected: 0,
    configured: 0,
    queued: 0,
    missing: 0,
    disabled: 0,
    error: 0,
    successRate: 0,
    latestMeasuredAt: null,
    sourceMetrics: [],
    categoryMetrics: [],
    techDetectionsTotal: 0,
    technologiesTotal: 0,
    techCompaniesTotal: 0,
    techCategories: [],
    topTechnologies: [],
    errors,
  }
}

export function normalizeTechnologySlug(name: string): string {
  const slug = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "unknown"
}

function toNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function percentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 100)
}

function latest(values: Array<string | null | undefined>): string | null {
  let out: string | null = null
  for (const value of values) {
    if (!value) continue
    if (!out || value > out) out = value
  }
  return out
}

function sourceLabel(row: SourceRunRow): string {
  const label = row.details?.label
  return typeof label === "string" && label.trim() ? label : row.source_slug
}

function emptySourceMetric(row: SourceRunRow): SourceAcquisitionSourceMetric {
  return {
    sourceSlug: row.source_slug,
    label: sourceLabel(row),
    category: row.category ?? "uncategorized",
    total: 0,
    collected: 0,
    configured: 0,
    queued: 0,
    missing: 0,
    disabled: 0,
    error: 0,
    successRate: 0,
    averageScore: 0,
    lastMeasuredAt: null,
    detail: typeof row.details?.detail === "string" ? row.details.detail : undefined,
    meaning: typeof row.details?.meaning === "string" ? row.details.meaning : undefined,
  }
}

function incrementStatus(metric: SourceAcquisitionSourceMetric, status: string): void {
  if (status === "collected") metric.collected += 1
  else if (status === "configured") metric.configured += 1
  else if (status === "queued") metric.queued += 1
  else if (status === "disabled" || status === "not_applicable") metric.disabled += 1
  else if (status === "error") metric.error += 1
  else metric.missing += 1
}

function buildSourceMetrics(rows: SourceRunRow[]): {
  sourceMetrics: SourceAcquisitionSourceMetric[]
  categoryMetrics: SourceAcquisitionCategoryMetric[]
} {
  const bySource = new Map<string, SourceAcquisitionSourceMetric & { scoreSum: number }>()

  for (const row of rows) {
    const key = row.source_slug
    const current = bySource.get(key) ?? { ...emptySourceMetric(row), scoreSum: 0 }
    current.total += 1
    current.scoreSum += toNumber(row.score)
    current.lastMeasuredAt = latest([current.lastMeasuredAt, row.measured_at])
    if (!current.detail && row.details?.detail) {
      current.detail = row.details.detail as string
    }
    if (!current.meaning && row.details?.meaning) {
      current.meaning = row.details.meaning as string
    }
    incrementStatus(current, row.status)
    bySource.set(key, current)
  }

  const sourceMetrics = [...bySource.values()]
    .map(({ scoreSum, ...metric }) => ({
      ...metric,
      successRate: percentage(metric.collected, metric.total),
      averageScore: metric.total > 0 ? Math.round(scoreSum / metric.total) : 0,
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))

  const byCategory = new Map<string, SourceAcquisitionCategoryMetric>()
  for (const metric of sourceMetrics) {
    const current = byCategory.get(metric.category) ?? {
      category: metric.category,
      total: 0,
      collected: 0,
      successRate: 0,
    }
    current.total += metric.total
    current.collected += metric.collected
    current.successRate = percentage(current.collected, current.total)
    byCategory.set(metric.category, current)
  }

  return {
    sourceMetrics,
    categoryMetrics: [...byCategory.values()].sort((a, b) => b.total - a.total || a.category.localeCompare(b.category)),
  }
}

function buildTechMetrics(rows: TechDetectionRow[]): SourceAcquisitionTechMetric[] {
  const byTech = new Map<string, SourceAcquisitionTechMetric & { confidenceSum: number; companies: Set<string> }>()
  for (const row of rows) {
    const key = `${row.technology_slug}:${row.category}`
    const current = byTech.get(key) ?? {
      technologyName: row.technology_name,
      technologySlug: row.technology_slug,
      category: row.category,
      companyCount: 0,
      detections: 0,
      averageConfidence: 0,
      lastDetectedAt: null,
      confidenceSum: 0,
      companies: new Set<string>(),
    }
    current.detections += 1
    current.confidenceSum += toNumber(row.confidence)
    current.companies.add(row.company_id)
    current.companyCount = current.companies.size
    current.lastDetectedAt = latest([current.lastDetectedAt, row.detected_at])
    byTech.set(key, current)
  }

  return [...byTech.values()]
    .map(({ confidenceSum, companies: _companies, ...metric }) => ({
      ...metric,
      averageConfidence: metric.detections > 0 ? Math.round(confidenceSum / metric.detections) : 0,
    }))
    .sort((a, b) => b.companyCount - a.companyCount || b.averageConfidence - a.averageConfidence)
}

export function buildSourceAcquisitionSummary(
  sourceRows: SourceRunRow[],
  techRows: TechDetectionRow[],
  errors: string[] = [],
): SourceAcquisitionSummary {
  const sourceMetrics = buildSourceMetrics(sourceRows)
  const topTechnologies = buildTechMetrics(techRows)
  const companiesMeasured = new Set(sourceRows.map((row) => row.company_id)).size
  const collected = sourceRows.filter((row) => row.status === "collected").length
  const configured = sourceRows.filter((row) => row.status === "configured").length
  const queued = sourceRows.filter((row) => row.status === "queued").length
  const disabled = sourceRows.filter((row) => row.status === "disabled" || row.status === "not_applicable").length
  const error = sourceRows.filter((row) => row.status === "error").length
  const missing = Math.max(0, sourceRows.length - collected - configured - queued - disabled - error)

  return {
    totalRuns: sourceRows.length,
    sourceTypes: new Set(sourceRows.map((row) => row.source_slug)).size,
    companiesMeasured,
    collected,
    configured,
    queued,
    missing,
    disabled,
    error,
    successRate: percentage(collected, sourceRows.length),
    latestMeasuredAt: latest(sourceRows.map((row) => row.measured_at)),
    sourceMetrics: sourceMetrics.sourceMetrics,
    categoryMetrics: sourceMetrics.categoryMetrics,
    techDetectionsTotal: techRows.length,
    technologiesTotal: new Set(techRows.map((row) => row.technology_slug)).size,
    techCompaniesTotal: new Set(techRows.map((row) => row.company_id)).size,
    techCategories: [...new Set(techRows.map((row) => row.category))].sort((a, b) => a.localeCompare(b)),
    topTechnologies,
    errors,
  }
}

function isTechItem(value: unknown): value is TechItem {
  if (!value || typeof value !== "object") return false
  const item = value as JsonRecord
  return typeof item.name === "string" && typeof item.category === "string"
}

export function extractTechStackFromMeta(meta: JsonRecord | null | undefined): {
  tech: TechItem[]
  server: string | null
} {
  const rawTech = meta?.tech
  if (!rawTech || typeof rawTech !== "object") return { tech: [], server: null }
  const record = rawTech as JsonRecord
  const stack = Array.isArray(record.stack) ? record.stack.filter(isTechItem) : []
  const server = typeof record.server === "string" && record.server.trim() ? record.server : null
  return { tech: stack, server }
}

export async function saveTechStackDetections(company: SalesCompany): Promise<{ ok: boolean; count: number; error?: string }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, count: 0, error: "Supabase service_role not configured" }
  const { tech, server } = extractTechStackFromMeta(company.meta)
  if (tech.length === 0) return { ok: true, count: 0 }

  const detectedAt = new Date().toISOString()
  const rows = tech.map((item) => ({
    company_id: company.id,
    technology_name: item.name,
    technology_slug: normalizeTechnologySlug(item.name),
    category: item.category,
    confidence: Math.max(0, Math.min(100, Math.round(item.confidence ?? 0))),
    evidence: item.evidence ?? [],
    source_slug: "wappalyzer",
    server_header: server,
    detected_at: detectedAt,
  }))

  const { error } = await sb
    .from("sales_tech_stack_detections")
    .upsert(rows, { onConflict: "company_id,technology_slug,category,source_slug" })

  if (error) {
    console.error("[source-acquisition] tech stack upsert failed:", error.message)
    return { ok: false, count: 0, error: error.message }
  }

  return { ok: true, count: rows.length }
}

export async function getSourceAcquisitionSummary(
  sb: ServiceSupabase | null = getServiceSalesSupabase(),
  companyIds?: Set<string>,
): Promise<SourceAcquisitionSummary> {
  if (!sb) return emptySourceAcquisitionSummary(["Supabase service_role not configured"])

  const [sourceRes, techRes] = await Promise.all([
    sb
      .from("sales_source_runs")
      .select("company_id, source_slug, category, status, score, measured_at, details")
      .order("measured_at", { ascending: false })
      .limit(5000),
    sb
      .from("sales_tech_stack_detections")
      .select("company_id, technology_name, technology_slug, category, confidence, detected_at")
      .order("detected_at", { ascending: false })
      .limit(5000),
  ])

  const errors: string[] = []
  if (sourceRes.error) errors.push(`sales_source_runs: ${sourceRes.error.message}`)

  const sourceRows = ((sourceRes.data ?? []) as SourceRunRow[]).filter(
    (row) => !companyIds || companyIds.has(row.company_id),
  )
  let techRows = ((techRes.data ?? []) as TechDetectionRow[]).filter((row) => !companyIds || companyIds.has(row.company_id))

  if (techRes.error) {
    errors.push(`sales_tech_stack_detections: ${techRes.error.message}; falling back to sales_companies.meta.tech.stack`)
    const fallback = await sb
      .from("sales_companies")
      .select("id, meta, updated_at")
      .order("updated_at", { ascending: false })
      .limit(5000)

    if (fallback.error) {
      errors.push(`sales_companies tech fallback: ${fallback.error.message}`)
    } else {
      techRows = ((fallback.data ?? []) as CompanyTechFallbackRow[])
        .filter((row) => !companyIds || companyIds.has(row.id))
        .flatMap((row) => {
          const { tech } = extractTechStackFromMeta(row.meta)
          return tech.map((item) => ({
            company_id: row.id,
            technology_name: item.name,
            technology_slug: normalizeTechnologySlug(item.name),
            category: item.category,
            confidence: item.confidence ?? 0,
            detected_at: row.updated_at,
          }))
        })
    }
  }

  return buildSourceAcquisitionSummary(sourceRows, techRows, errors)
}
