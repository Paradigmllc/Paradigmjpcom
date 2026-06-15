/**
 * crt.sh bulk domain acquisition — SSL certificate transparency log mining.
 * Fetches all domains for a given TLD from crt.sh (Certificate Transparency).
 * Free, unlimited, real-time. No search engine dependency.
 *
 * Strengths:
 *  - TLD-based bulk: %.in → all Indian domains with SSL certs
 *  - Real-time: certs are logged within seconds of issuance
 *  - TLD-agnostic: .com .net etc domains are included if they have certs
 *  - Alive-by-definition: if a cert exists, the site was recently active
 *
 * Limitations:
 *  - No company size/industry data (filtered post-acquisition)
 *  - DV certs (90%+) have no organization name
 *  - Need post-filtering: Wappalyzer + quality filter + LLM
 */
import { getProxyFetchOptions } from "../proxy-agent"

export interface CrtshDomainResult {
  ok: boolean
  domains: string[]
  total: number
  error?: string
}

const CRTSH_URL = "https://crt.sh"

/**
 * Fetch all unique domain names from crt.sh for a given TLD pattern.
 * @param tldPattern e.g. "%.in", "%.ch", "%.vn", "%.co.in"
 * @param limit max results (crt.sh has no hard limit but we cap for safety)
 */
export async function fetchCrtshDomains(
  tldPattern: string,
  limit = 5000,
): Promise<CrtshDomainResult> {
  const url = `${CRTSH_URL}/?q=${encodeURIComponent(tldPattern)}&output=json&limit=${limit}&deduplicate=Y`
  
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "RevenueOS-crtsh/1.0",
      },
      signal: AbortSignal.timeout(60_000),
      ...getProxyFetchOptions(),
    })

    if (!res.ok) {
      return { ok: false, domains: [], total: 0, error: `crt.sh HTTP ${res.status}` }
    }

    const data = (await res.json()) as Array<{
      id: number
      name_value: string
      common_name?: string
    }>

    // Extract all domains from name_value (can contain multiple domains per cert)
    const domains = new Set<string>()
    for (const entry of data) {
      const names = (entry.name_value ?? "").split("\n")
      for (const name of names) {
        const cleaned = name.trim().toLowerCase().replace(/^\*\./, "")
        if (cleaned.includes(".") && !cleaned.includes(" ") && cleaned.length > 4) {
          domains.add(cleaned)
        }
      }
    }

    const sorted = [...domains].sort()
    return { ok: true, domains: sorted.slice(0, limit), total: sorted.length }
  } catch (e) {
    console.error("[crtsh-bulk] fetch failed:", e)
    return { ok: false, domains: [], total: 0, error: e instanceof Error ? e.message : "crt.sh fetch failed" }
  }
}

/**
 * Multi-TLD domain acquisition for a country.
 * India example: ["%.in", "%.co.in", "%.net.in", "%.org.in"]
 */
export async function fetchCountryDomains(
  tldPatterns: string[],
  limit = 10000,
): Promise<CrtshDomainResult> {
  const allDomains = new Set<string>()
  let errors: string[] = []

  for (const pattern of tldPatterns) {
    const result = await fetchCrtshDomains(pattern, limit)
    if (result.ok) {
      for (const d of result.domains) allDomains.add(d)
    } else if (result.error) {
      errors.push(`${pattern}: ${result.error}`)
    }
  }

  const domains = [...allDomains].sort()
  return {
    ok: domains.length > 0,
    domains: domains.slice(0, limit),
    total: domains.length,
    error: errors.length > 0 ? errors.join("; ") : undefined,
  }
}

// Country TLD maps for bulk acquisition
export const COUNTRY_TLD_PATTERNS: Record<string, string[]> = {
  IN: ["%.in", "%.co.in", "%.net.in", "%.org.in", "%.firm.in", "%.gen.in", "%.ind.in"],
  VN: ["%.vn", "%.com.vn", "%.net.vn", "%.org.vn"],
  ZA: ["%.co.za", "%.org.za", "%.net.za", "%.za"],
  CH: ["%.ch", "%.swiss"],
  JP: ["%.jp", "%.co.jp", "%.or.jp", "%.ne.jp"],
  US: ["%.us", "%.com", "%.net", "%.org"],
  GB: ["%.uk", "%.co.uk", "%.org.uk", "%.me.uk"],
  DE: ["%.de"],
  FR: ["%.fr"],
  TH: ["%.th", "%.co.th", "%.or.th", "%.go.th"],
  IL: ["%.il", "%.co.il", "%.org.il", "%.net.il"],
  KR: ["%.kr", "%.co.kr"],
  TW: ["%.tw", "%.com.tw"],
  ID: ["%.id", "%.co.id"],
  SG: ["%.sg", "%.com.sg"],
  AU: ["%.au", "%.com.au", "%.net.au", "%.org.au"],
}
