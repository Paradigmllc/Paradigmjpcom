export interface TwentyPullRetryRecord {
  paradigmSourceCoverage?: number | string | null
}

function plainRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function validHttpUrl(value: string | null): URL | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:" ? url : null
  } catch (error) {
    console.error("[twenty-pull] invalid URL:", { value, error })
    return null
  }
}

export function reportUrlFromTwenty(value: string | null): string | null {
  const url = validHttpUrl(value)
  if (!url) return null
  const host = url.hostname.replace(/^www\./, "").toLowerCase()
  if (host !== "paradigmjp.com") return null
  if (!/\/report\//.test(url.pathname)) return null
  return url.toString()
}

export function formUrlFromTwenty(value: string | null, domain: string): string | null {
  const url = validHttpUrl(value)
  if (!url) return null
  const host = url.hostname.replace(/^www\./, "").toLowerCase()
  const normalizedDomain = domain.replace(/^www\./, "").toLowerCase()
  if (host !== normalizedDomain && !host.endsWith(`.${normalizedDomain}`)) return null
  return url.toString()
}

export function hasSourceErrors(meta: Record<string, unknown>): boolean {
  const salesOs = plainRecord(meta.sales_os)
  const sourceQuality = plainRecord(salesOs.source_quality)
  return Object.values(sourceQuality).some((value) => {
    const metric = plainRecord(value)
    const failed = typeof metric.failed === "number" ? metric.failed : 0
    const timeout = typeof metric.timeout === "number" ? metric.timeout : 0
    return failed > 0 || timeout > 0
  })
}

export function isDataStale(meta: Record<string, unknown>): boolean {
  const salesOs = plainRecord(meta.sales_os)
  const lastEnrichedAt = typeof salesOs.last_enriched_at === "string" ? Date.parse(salesOs.last_enriched_at) : 0
  if (!lastEnrichedAt || !Number.isFinite(lastEnrichedAt)) return true
  const refreshDays = Number.parseInt(process.env.REVENUEOS_DATA_REFRESH_DAYS ?? "14", 10)
  const safeRefreshDays = Number.isFinite(refreshDays) && refreshDays > 0 ? refreshDays : 14
  return Date.now() - lastEnrichedAt > safeRefreshDays * 24 * 60 * 60 * 1000
}

export function sourceCoverageTooLow(record: TwentyPullRetryRecord, meta: Record<string, unknown>): boolean {
  const twentyMeta = plainRecord(meta.twenty)
  const value = sourceCoverageValue(record.paradigmSourceCoverage) ?? sourceCoverageValue(twentyMeta.sourceCoverage)
  return value === null || value < 20
}

function sourceCoverageValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return null
  const parsed = Number.parseFloat(value.replace("%", "").trim())
  return Number.isFinite(parsed) ? parsed : null
}
