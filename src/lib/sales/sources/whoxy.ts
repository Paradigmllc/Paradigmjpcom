/**
 * Whoxy API — WHOIS data for domain enrichment.
 *
 * Free tier: limited queries. Uses WHOXY_API_KEY env var.
 * Returns: company name, country, email, registrar, registration date, expiry.
 * Rate limit: 1 req/s recommended.
 */
const WHOXY_BASE = "https://api.whoxy.com"
const DEFAULT_TIMEOUT = 10_000

export interface WhoxyResult {
  ok: boolean
  domain: string
  companyName?: string | null
  countryCode?: string | null
  registrantEmail?: string | null
  registrar?: string | null
  createdDate?: string | null
  expiresDate?: string | null
  yearsOld?: number | null
  source: "whoxy" | "none"
  error?: string
}

function env(name: string): string | null {
  const v = process.env[name]
  return v && v.trim().length > 0 ? v.trim() : null
}

export async function queryWhoxy(domain: string): Promise<WhoxyResult> {
  const key = env("WHOXY_API_KEY")
  if (!key) return { ok: false, domain, source: "none", error: "WHOXY_API_KEY not configured" }
  if (!domain?.includes(".")) return { ok: false, domain, source: "none", error: "invalid domain" }

  try {
    const res = await fetch(
      `${WHOXY_BASE}/${encodeURIComponent(key)}/whois/${encodeURIComponent(domain)}`,
      { signal: AbortSignal.timeout(DEFAULT_TIMEOUT) },
    )
    if (!res.ok) {
      console.warn("[whoxy] API returned", res.status)
      return { ok: false, domain, source: "none", error: `HTTP ${res.status}` }
    }
    const data = await res.json() as {
      status?: number; status_reason?: string
      domain_name?: string; company_name?: string; country_name?: string
      registrant_contact?: { email_address?: string }
      registrar_name?: string; create_date?: string; expire_date?: string
    }
    if (data.status !== 1) {
      return { ok: false, domain, source: "none", error: data.status_reason ?? "whoxy status not ok" }
    }
    const createdDate = data.create_date ?? null
    return {
      ok: true,
      domain: data.domain_name ?? domain,
      companyName: data.company_name ?? null,
      countryCode: data.country_name ?? null,
      registrantEmail: data.registrant_contact?.email_address ?? null,
      registrar: data.registrar_name ?? null,
      createdDate,
      expiresDate: data.expire_date ?? null,
      yearsOld: createdDate ? Math.floor((Date.now() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24 * 365)) : null,
      source: "whoxy",
    }
  } catch (e) {
    console.error("[whoxy] fetch failed:", e)
    return { ok: false, domain, source: "none", error: e instanceof Error ? e.message : "fetch failed" }
  }
}
