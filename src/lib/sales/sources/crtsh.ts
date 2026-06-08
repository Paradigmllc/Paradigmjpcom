/**
 * crt.sh SSL certificate transparency log search
 * Free API, no authentication required. Rate limit: ~5 req/s.
 * https://crt.sh
 */

export interface CrtshEntry {
  id: number
  issuer_ca_id: number
  issuer_name: string
  common_name: string
  name_value: string
  not_before: string
  not_after: string
  serial_number: string
}

export interface CrtshResult {
  ok: boolean
  domain: string
  totalCerts: number
  subdomains: string[]
  latestCert?: { issuer: string; notBefore: string; notAfter: string }
  oldestCert?: { issuer: string; notBefore: string; notAfter: string }
  error?: string
}

export async function searchCrtsh(domain: string): Promise<CrtshResult> {
  try {
    const url = `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json&deduplicate=Y`
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })

    if (!res.ok) {
      return { ok: false, domain, totalCerts: 0, subdomains: [], error: `HTTP ${res.status}` }
    }

    const entries = (await res.json()) as CrtshEntry[]
    if (!Array.isArray(entries) || entries.length === 0) {
      return { ok: true, domain, totalCerts: 0, subdomains: [] }
    }

    const subdomainSet = new Set<string>()
    let earliest: CrtshEntry | null = null
    let latest: CrtshEntry | null = null

    for (const entry of entries) {
      const names = entry.name_value?.split("\n").map((n) => n.trim().toLowerCase()) ?? []
      for (const name of names) {
        if (name.endsWith(`.${domain}`) || name === domain) {
          subdomainSet.add(name)
        }
      }
      if (!earliest || entry.not_before < earliest.not_before) earliest = entry
      if (!latest || entry.not_after > latest.not_after) latest = entry
    }

    return {
      ok: true,
      domain,
      totalCerts: entries.length,
      subdomains: [...subdomainSet].slice(0, 30),
      latestCert: latest ? { issuer: latest.issuer_name, notBefore: latest.not_before, notAfter: latest.not_after } : undefined,
      oldestCert: earliest ? { issuer: earliest.issuer_name, notBefore: earliest.not_before, notAfter: earliest.not_after } : undefined,
    }
  } catch (e) {
    console.error("[crtsh] search failed:", e)
    return { ok: false, domain, totalCerts: 0, subdomains: [], error: e instanceof Error ? e.message : "crt.sh search failed" }
  }
}
