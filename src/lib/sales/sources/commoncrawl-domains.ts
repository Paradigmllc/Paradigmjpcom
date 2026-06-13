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
const INDEXES = [
  "CC-MAIN-2025-22",
  "CC-MAIN-2025-18",
  "CC-MAIN-2025-14",
  "CC-MAIN-2025-10",
]

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
  const url = `${CDX_API}/${index}-index?url=${encodeURIComponent(pattern)}&output=json&limit=${limit}&filter=status:200`

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "RevenueOS-CommonCrawl/1.0" },
      signal: AbortSignal.timeout(60_000),
      ...getProxyFetchOptions(),
    })

    if (!res.ok) return []

    const text = await res.text()
    const lines = text.trim().split("\n")

    for (const line of lines) {
      try {
        const entry = JSON.parse(line)
        const entryUrl = entry.url
        if (!entryUrl) continue
        // Extract domain
        const hostname = new URL(entryUrl).hostname.toLowerCase()
        if (hostname.includes(".") && hostname.length > 4) {
          domains.add(hostname.replace(/^www\./, ""))
        }
      } catch {
        // Skip malformed lines
      }
    }

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

  for (const index of INDEXES) {
    const domains = await queryCdxIndex(tldPattern, index, Math.ceil(limit / INDEXES.length))
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
