/**
 * Common Crawl Index — estimate site size & content volume from crawl data
 * https://commoncrawl.org
 * Free, no API key. Uses the Common Crawl index API.
 */

export interface CommonCrawlResult {
  ok: boolean
  domain: string
  pagesInIndex: number
  lastCrawled: string | null
  error?: string
}

export async function queryCommonCrawl(domain: string): Promise<CommonCrawlResult> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    const url = `https://index.commoncrawl.org/CC-MAIN-2024-10-index?url=${encodeURIComponent(cleanDomain)}/*&output=json&limit=100`
    const res = await fetch(url, {
      headers: { "User-Agent": "RevenueOS/1.0" },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      return { ok: false, domain: cleanDomain, pagesInIndex: 0, lastCrawled: null, error: `HTTP ${res.status}` }
    }

    const text = await res.text()
    const lines = text.trim().split("\n").filter(Boolean)
    const pages = lines.length

    let lastCrawled: string | null = null
    if (lines.length > 0) {
      try {
        const last = JSON.parse(lines[lines.length - 1])
        lastCrawled = last.timestamp || null
      } catch {
        // ignore parse errors
      }
    }

    return {
      ok: true,
      domain: cleanDomain,
      pagesInIndex: pages,
      lastCrawled,
    }
  } catch (e) {
    console.error("[commoncrawl] query failed:", e)
    return { ok: false, domain, pagesInIndex: 0, lastCrawled: null, error: e instanceof Error ? e.message : "Common Crawl query failed" }
  }
}
