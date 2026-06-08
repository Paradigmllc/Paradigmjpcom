/**
 * OpenCorporates — free international company registry API
 * https://api.opencorporates.com
 * Free, no API key for basic queries. Rate limit: 500 req/month.
 */

export interface OpenCorporatesResult {
  ok: boolean
  domain: string
  companies: Array<{
    name: string
    jurisdiction: string
    companyNumber: string
    status: string | null
    incorporationDate: string | null
  }>
  totalCount: number
  error?: string
}

export async function searchOpenCorporates(domain: string): Promise<OpenCorporatesResult> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    const name = cleanDomain.replace(/\.[^.]+$/, "") // Use domain root as company name search
    const url = `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(name)}&per_page=3`
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "RevenueOS/1.0" },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      return { ok: false, domain: cleanDomain, companies: [], totalCount: 0, error: `HTTP ${res.status}` }
    }

    const body = (await res.json()) as {
      results?: {
        total_count?: number
        companies?: Array<{
          company?: {
            name?: string
            jurisdiction_code?: string
            company_number?: string
            current_status?: string
            incorporation_date?: string
          }
        }>
      }
    }

    const companies = (body.results?.companies ?? []).map((c) => ({
      name: c.company?.name ?? "Unknown",
      jurisdiction: c.company?.jurisdiction_code ?? "unknown",
      companyNumber: c.company?.company_number ?? "N/A",
      status: c.company?.current_status ?? null,
      incorporationDate: c.company?.incorporation_date ?? null,
    }))

    return {
      ok: true,
      domain: cleanDomain,
      companies,
      totalCount: body.results?.total_count ?? 0,
    }
  } catch (e) {
    console.error("[opencorporates] search failed:", e)
    return { ok: false, domain, companies: [], totalCount: 0, error: e instanceof Error ? e.message : "OpenCorporates search failed" }
  }
}
