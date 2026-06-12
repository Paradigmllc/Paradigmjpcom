import { cleanDomain as canonicalDomain } from "@/lib/sales/japan-readiness-utils"

/**
 * Similarweb Free scraper — public page traffic estimates
 * Scrapes the free Similarweb overview page for estimated monthly visits.
 * No API key required. Respects rate limits.
 * Alternative when paid API key is unavailable.
 */

export interface SimilarwebFreeResult {
  ok: boolean
  domain: string
  estimatedMonthlyVisits: number | null
  trafficRank: number | null
  topCountries: string[]
  error?: string
}

export async function scrapeSimilarwebFree(domain: string): Promise<SimilarwebFreeResult> {
  try {
    const cleanDomain = canonicalDomain(domain)
    const url = `https://www.similarweb.com/website/${encodeURIComponent(cleanDomain)}/`
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(12_000),
      redirect: "follow",
    })

    if (!res.ok) {
      return { ok: false, domain: cleanDomain, estimatedMonthlyVisits: null, trafficRank: null, topCountries: [], error: `HTTP ${res.status}` }
    }

    const html = await res.text()
    
    // Extract estimated monthly visits from meta/script data
    let visits: number | null = null
    let rank: number | null = null
    const countries: string[] = []

    // Look for JSON-LD or embedded data patterns
    const jsonLdMatch = html.match(/"estimatedMonthlyVisits"\s*:\s*(\d[\d,]*)/)
    if (jsonLdMatch) {
      visits = parseInt(jsonLdMatch[1].replace(/,/g, ""), 10)
    }

    // Look for traffic rank
    const rankMatch = html.match(/"globalRank"\s*:\s*(\d[\d,]*)/)
    if (rankMatch) {
      rank = parseInt(rankMatch[1].replace(/,/g, ""), 10)
    }

    // Fallback: look for visit count patterns in text
    if (!visits) {
      const visitPattern = html.match(/([\d.]+[KMB])\s*(?:Visits|visits|visits\/mo)/i)
      if (visitPattern) {
        const val = visitPattern[1]
        if (val.endsWith("K")) visits = Math.round(parseFloat(val) * 1000)
        else if (val.endsWith("M")) visits = Math.round(parseFloat(val) * 1000000)
        else if (val.endsWith("B")) visits = Math.round(parseFloat(val) * 1000000000)
      }
    }

    // Extract top countries
    const countryMatches = html.match(/"countryCode"\s*:\s*"([A-Z]{2})"/g)
    if (countryMatches) {
      for (const m of countryMatches.slice(0, 5)) {
        const code = m.match(/"([A-Z]{2})"/)?.[1]
        if (code) countries.push(code)
      }
    }

    return {
      ok: true,
      domain: cleanDomain,
      estimatedMonthlyVisits: visits,
      trafficRank: rank,
      topCountries: countries,
    }
  } catch (e) {
    console.error("[similarweb-scraper] failed:", e)
    return { ok: false, domain, estimatedMonthlyVisits: null, trafficRank: null, topCountries: [], error: e instanceof Error ? e.message : "Scrape failed" }
  }
}
