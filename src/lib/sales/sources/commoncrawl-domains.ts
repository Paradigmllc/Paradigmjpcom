/**
 * CommonCrawl CDX Index — bulk domain acquisition from web crawl archives.
 * Completely free, unlimited, no search engine dependency.
 * Searches the CommonCrawl index for URLs matching a pattern.
 *
 * CDX API docs: https://github.com/webrecorder/pywb/wiki/CDX-Server-API
 */
import { getProxyFetchOptions } from "../proxy-agent"

export interface CommonCrawlResult {
  ok: boolean
  domains: string[]
  total: number
  error?: string
}

const CDX_API = "https://index.commoncrawl.org"

// CommonCrawl index names — updated regularly
const FALLBACK_INDEXES = [
  "CC-MAIN-2026-21",
  "CC-MAIN-2026-17",
  "CC-MAIN-2026-12",
  "CC-MAIN-2026-08",
]

let cachedIndexes: string[] | null = null

async function getRecentIndexes(limit = 3): Promise<string[]> {
  if (cachedIndexes) return cachedIndexes.slice(0, limit)
  try {
    const res = await fetch(`${CDX_API}/collinfo.json`, {
      headers: { "User-Agent": "RevenueOS-CommonCrawl/1.0" },
      signal: AbortSignal.timeout(12_000),
      ...getProxyFetchOptions(),
    })
    if (!res.ok) throw new Error(`collinfo HTTP ${res.status}`)
    const rows = await res.json() as Array<{ id?: unknown }>
    cachedIndexes = rows
      .map((row) => (typeof row.id === "string" ? row.id : null))
      .filter((id): id is string => id !== null && /^CC-MAIN-\d{4}-\d{2}$/.test(id))
      .slice(0, 8)
    if (cachedIndexes.length > 0) return cachedIndexes.slice(0, limit)
  } catch (error) {
    console.error("[commoncrawl] failed to fetch collinfo indexes:", error)
  }
  cachedIndexes = FALLBACK_INDEXES
  return cachedIndexes.slice(0, limit)
}

/**
 * Fetch all unique domains matching a TLD/domain pattern from CommonCrawl.
 * @param pattern e.g. "*.in", "*.ch", "*.co.in"
 * @param index CommonCrawl index name
 * @param limit max results
 */
async function queryCdxIndex(
  pattern: string,
  index: string,
  limit = 5000,
): Promise<string[]> {
  const domains = new Set<string>()
  const endpoint = `${CDX_API}/${index}-index`

  async function readDomains(url: string): Promise<void> {
    const res = await fetch(url, {
      headers: { "User-Agent": "RevenueOS-CommonCrawl/1.0" },
      signal: AbortSignal.timeout(18_000),
      ...getProxyFetchOptions(),
    })
    if (!res.ok) return
    const text = await res.text()
    const lines = text.trim().split("\n")
    let malformedLines = 0
    for (const line of lines) {
      if (domains.size >= limit) break
      try {
        const entry = JSON.parse(line)
        const entryUrl = entry.url
        if (!entryUrl) continue
        const parsed = new URL(entryUrl)
        const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "")
        if (parsed.pathname === "/robots.txt") continue
        if (hostname.includes(".") && hostname.length > 4) domains.add(hostname)
      } catch (error) {
        malformedLines++
        if (malformedLines === 1) console.warn("[commoncrawl] skipped malformed CDX JSON line:", error)
      }
    }
    if (malformedLines > 1) console.warn(`[commoncrawl] skipped ${malformedLines} malformed CDX JSON lines for ${index}`)
  }

  try {
    const pageInfoUrl = `${endpoint}?url=${encodeURIComponent(pattern)}&output=json&filter=status:200&showNumPages=true&pageSize=100`
    const pageInfoRes = await fetch(pageInfoUrl, {
      headers: { "User-Agent": "RevenueOS-CommonCrawl/1.0" },
      signal: AbortSignal.timeout(30_000),
      ...getProxyFetchOptions(),
    })
    if (pageInfoRes.ok) {
      const pageInfo = await pageInfoRes.json().catch(() => null) as { pages?: unknown } | null
      const pages = typeof pageInfo?.pages === "number" ? Math.min(pageInfo.pages, 12) : 0
      const pageOrder = [...Array.from({ length: Math.max(pages - 1, 0) }, (_value, index) => index + 1), 0]
      for (const page of pageOrder) {
        if (domains.size >= limit) break
        await readDomains(`${endpoint}?url=${encodeURIComponent(pattern)}&output=json&filter=status:200&page=${page}&pageSize=100`)
      }
      if (domains.size > 0) return [...domains]
    }

    await readDomains(`${endpoint}?url=${encodeURIComponent(pattern)}&output=json&limit=${limit}&filter=status:200`)
    return [...domains]
  } catch (e) {
    console.error(`[commoncrawl] query failed for ${index}:`, e)
    return []
  }
}

/**
 * Acquire all domains for a TLD pattern from CommonCrawl.
 * Queries multiple indexes for better coverage.
 */
export async function fetchCommonCrawlDomains(
  tldPattern: string,
  limit = 10000,
): Promise<CommonCrawlResult> {
  const allDomains = new Set<string>()
  const errors: string[] = []

  const indexes = await getRecentIndexes()
  for (const index of indexes) {
    if (allDomains.size >= limit) break
    const domains = await queryCdxIndex(tldPattern, index, limit - allDomains.size)
    for (const d of domains) allDomains.add(d)
    if (domains.length === 0) {
      errors.push(`${index}: 0 results`)
    }
    // Small delay between index queries
    await new Promise(r => setTimeout(r, 500))
  }

  const sorted = [...allDomains].sort()
  return {
    ok: sorted.length > 0,
    domains: sorted.slice(0, limit),
    total: sorted.length,
    error: errors.length > 0 ? errors.join("; ") : undefined,
  }
}
