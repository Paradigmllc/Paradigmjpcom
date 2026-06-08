/**
 * PhishTank — domain phishing reputation check
 * https://phishtank.org
 * Free API, no key required. Checks if domain is in known phishing database.
 */

export interface PhishTankResult {
  ok: boolean
  domain: string
  isPhishing: boolean
  phishCount: number
  error?: string
}

export async function checkPhishTank(domain: string): Promise<PhishTankResult> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    // PhishTank API: search by URL
    const url = `https://checkurl.phishtank.com/checkurl/?url=${encodeURIComponent(cleanDomain)}&format=json`
    const res = await fetch(url, {
      headers: { "User-Agent": "RevenueOS/1.0" },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      return { ok: false, domain: cleanDomain, isPhishing: false, phishCount: 0, error: `HTTP ${res.status}` }
    }

    const body = (await res.json()) as {
      results?: {
        in_database?: boolean
        phish_id?: string
        verified?: boolean
        phish_detail_url?: string
      }
    }

    return {
      ok: true,
      domain: cleanDomain,
      isPhishing: body.results?.in_database === true,
      phishCount: body.results?.in_database ? 1 : 0,
    }
  } catch (e) {
    console.error("[phishtank] check failed:", e)
    return { ok: false, domain, isPhishing: false, phishCount: 0, error: e instanceof Error ? e.message : "PhishTank check failed" }
  }
}
