import { cleanDomain as canonicalDomain } from "@/lib/sales/japan-readiness-utils"

/**
 * Ahrefs Domain Rating (DR) checker — scrapes the free Ahrefs backlink checker
 * https://ahrefs.com/backlink-checker
 * Free, no API key. Shows domain rating (DR), backlinks, referring domains.
 * DR correlates strongly with organic search traffic — a legitimate traffic proxy.
 */

export interface AhrefsFreeResult {
  ok: boolean
  domain: string
  domainRating: number | null
  backlinks: number | null
  referringDomains: number | null
  trafficEstimate: string | null
  error?: string
}

export async function checkAhrefsFree(domain: string): Promise<AhrefsFreeResult> {
  try {
    const cleanDomain = canonicalDomain(domain)
    const url = `https://ahrefs.com/backlink-checker/?target=${encodeURIComponent(cleanDomain)}&mode=subdomains`
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RevenueOS/1.0)",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(12_000),
      redirect: "follow",
    })

    if (!res.ok) {
      return { ok: false, domain: cleanDomain, domainRating: null, backlinks: null, referringDomains: null, trafficEstimate: null, error: `HTTP ${res.status}` }
    }

    const html = await res.text()

    // Extract Domain Rating
    let dr: number | null = null
    const drMatch = html.match(/(?:Domain Rating|DR)[^\d]*(\d{1,3})/i)
    if (drMatch) dr = parseInt(drMatch[1], 10)

    // Extract backlink count
    let backlinks: number | null = null
    const blMatch = html.match(/([\d,]+)\s*(?:backlinks|Backlinks)/i)
    if (blMatch) backlinks = parseInt(blMatch[1].replace(/,/g, ""), 10)

    // Extract referring domains
    let refDomains: number | null = null
    const rdMatch = html.match(/([\d,]+)\s*(?:referring domains|Referring domains)/i)
    if (rdMatch) refDomains = parseInt(rdMatch[1].replace(/,/g, ""), 10)

    // Estimate traffic from DR
    let traffic: string | null = null
    if (dr) {
      if (dr >= 80) traffic = ">100万 PV/月"
      else if (dr >= 60) traffic = "10万-100万 PV/月"
      else if (dr >= 40) traffic = "1万-10万 PV/月"
      else if (dr >= 20) traffic = "1千-1万 PV/月"
      else traffic = "<1千 PV/月"
    }

    return {
      ok: true,
      domain: cleanDomain,
      domainRating: dr,
      backlinks,
      referringDomains: refDomains,
      trafficEstimate: traffic,
    }
  } catch (e) {
    console.error("[ahrefs-free] check failed:", e)
    return { ok: false, domain, domainRating: null, backlinks: null, referringDomains: null, trafficEstimate: null, error: e instanceof Error ? e.message : "Ahrefs check failed" }
  }
}
