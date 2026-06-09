/**
 * BuiltWith free technology & traffic lookup
 * https://builtwith.com
 * Scrapes the free BuiltWith lookup page for technology profile and traffic tier.
 * No API key required.
 */

export interface BuiltWithFreeResult {
  ok: boolean
  domain: string
  technologies: string[]
  trafficTier: string | null
  estimatedMonthlyVisits: string | null
  error?: string
}

export async function lookupBuiltWithFree(domain: string): Promise<BuiltWithFreeResult> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    const url = `https://builtwith.com/${encodeURIComponent(cleanDomain)}`
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RevenueOS/1.0)",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(12_000),
      redirect: "follow",
    })

    if (!res.ok) {
      return { ok: false, domain: cleanDomain, technologies: [], trafficTier: null, estimatedMonthlyVisits: null, error: `HTTP ${res.status}` }
    }

    const html = await res.text()
    const technologies: string[] = []

    // Extract tech stack from HTML
    const techPatterns = [
      /<a[^>]*href="\/technology\/([^"]+)"[^>]*>/gi,
      /<span[^>]*class="[^"]*tech[^"]*"[^>]*>([^<]+)<\/span>/gi,
    ]

    for (const pattern of techPatterns) {
      let match
      while ((match = pattern.exec(html)) !== null) {
        const tech = match[1].replace(/-/g, " ").trim()
        if (tech && tech.length > 2 && tech.length < 30) {
          technologies.push(tech)
        }
      }
    }

    // Look for traffic tier
    const trafficMatch = html.match(/(\d[\d,]*[KMB]?\s*(?:visits|Visits|monthly|Monthly))/i)
    const trafficTier = trafficMatch ? trafficMatch[1].trim() : null

    return {
      ok: true,
      domain: cleanDomain,
      technologies: [...new Set(technologies)].slice(0, 15),
      trafficTier: trafficTier,
      estimatedMonthlyVisits: trafficTier,
    }
  } catch (e) {
    console.error("[builtwith] lookup failed:", e)
    return { ok: false, domain, technologies: [], trafficTier: null, estimatedMonthlyVisits: null, error: e instanceof Error ? e.message : "BuiltWith lookup failed" }
  }
}
