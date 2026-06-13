import { getProxyFetchOptions } from "../proxy-agent"

/**
 * Sitemap XML parser — analyzes site structure from sitemap.xml.
 * Zero-cost, unlimited. Extracts page count, categories, lastmod freshness.
 */
export interface SitemapResult {
  ok: boolean
  data?: {
    totalUrls: number
    lastModified: string | null
    categories: string[]
    hasBlog: boolean
    hasProducts: boolean
    oldestPage: string | null
    recentPages: number
  }
  error?: string
}

const URL_RE = /<url>([\s\S]*?)<\/url>/gi
const LOC_RE = /<loc>([^<]+)<\/loc>/i
const LASTMOD_RE = /<lastmod>([^<]+)<\/lastmod>/i

const BLOG_PATTERNS = /\/(blog|news|articles|posts|column|topics|journal|magazine)\//i
const PRODUCT_PATTERNS = /\/(product|item|goods|shop|store|products|items)\//i
const CATEGORY_PATTERNS = /\/(category|collection|genre|type|catalog|department)\//i

async function fetchSitemap(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      ...getProxyFetchOptions({
        headers: { "User-Agent": "RevenueOS-Sitemap/1.0" },
        signal: AbortSignal.timeout(10_000),
      }),
    })
    if (!res.ok) return null
    const ct = res.headers.get("content-type") ?? ""
    if (ct.includes("text/html") && !ct.includes("xml")) {
      // Might be a sitemap index - parse and try first child
      const text = await res.text()
      const firstLoc = text.match(LOC_RE)
      if (firstLoc) return await fetchSitemap(firstLoc[1])
      return null
    }
    return await res.text()
  } catch {
    return null
  }
}

export async function analyzeSitemap(domain: string): Promise<SitemapResult> {
  try {
    const origin = domain.startsWith("http") ? domain : `https://${domain}`
    const sitemapCandidates = [
      `${origin}/sitemap.xml`,
      `${origin}/sitemap_index.xml`,
      `${origin}/wp-sitemap.xml`,
    ]

    let xml: string | null = null
    for (const url of sitemapCandidates) {
      xml = await fetchSitemap(url)
      if (xml) break
    }

    if (!xml) return { ok: false, error: "no sitemap found" }

    const urls: Array<{ loc: string; lastmod: string | null }> = []
    let urlMatch
    while ((urlMatch = URL_RE.exec(xml)) !== null) {
      const block = urlMatch[1]
      const locMatch = block.match(LOC_RE)
      const lastmodMatch = block.match(LASTMOD_RE)
      if (locMatch) {
        urls.push({ loc: locMatch[1], lastmod: lastmodMatch ? lastmodMatch[1] : null })
      }
    }

    if (urls.length === 0) return { ok: false, error: "empty sitemap" }

    const now = new Date()
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    let recentPages = 0
    let oldestDate: Date | null = null
    let lastModified: string | null = null
    const categories = new Set<string>()
    let hasBlog = false
    let hasProducts = false

    for (const u of urls) {
      if (BLOG_PATTERNS.test(u.loc)) hasBlog = true
      if (PRODUCT_PATTERNS.test(u.loc)) hasProducts = true
      const catMatch = u.loc.match(CATEGORY_PATTERNS)
      if (catMatch) categories.add(catMatch[1])

      if (u.lastmod) {
        const d = new Date(u.lastmod)
        if (!isNaN(d.getTime())) {
          if (d > oneMonthAgo) recentPages++
          if (!oldestDate || d < oldestDate) oldestDate = d
          if (!lastModified || d > new Date(lastModified)) lastModified = u.lastmod
        }
      }
    }

    return {
      ok: true,
      data: {
        totalUrls: urls.length,
        lastModified,
        categories: [...categories].slice(0, 10),
        hasBlog,
        hasProducts,
        oldestPage: oldestDate?.toISOString() ?? null,
        recentPages,
      },
    }
  } catch (e) {
    console.error("[sitemap] analysis failed:", e)
    return { ok: false, error: e instanceof Error ? e.message : "Sitemap analysis failed" }
  }
}
