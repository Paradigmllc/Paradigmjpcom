import { cleanDomain as canonicalDomain } from "@/lib/sales/japan-readiness-utils"

/**
 * The Green Web Foundation — green hosting check
 * https://www.thegreenwebfoundation.org
 * Free API, no key. Checks if a domain is hosted on verified green energy.
 */

export interface GreenWebResult {
  ok: boolean
  domain: string
  isGreen: boolean
  provider: string | null
  certifiedSince: string | null
  error?: string
}

export async function checkGreenHosting(domain: string): Promise<GreenWebResult> {
  try {
    const cleanDomain = canonicalDomain(domain)
    const url = `https://api.thegreenwebfoundation.org/greencheck/${encodeURIComponent(cleanDomain)}`
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    })

    if (!res.ok) {
      return { ok: false, domain: cleanDomain, isGreen: false, provider: null, certifiedSince: null, error: `HTTP ${res.status}` }
    }

    const body = (await res.json()) as {
      green?: boolean
      hostedby?: string
      supportingdocs?: Array<{ title?: string; link?: string }>
      modified?: string
    }

    return {
      ok: true,
      domain: cleanDomain,
      isGreen: body.green ?? false,
      provider: body.hostedby ?? null,
      certifiedSince: body.modified ?? null,
    }
  } catch (e) {
    console.error("[green-web] check failed:", e)
    return { ok: false, domain, isGreen: false, provider: null, certifiedSince: null, error: e instanceof Error ? e.message : "Green Web check failed" }
  }
}
