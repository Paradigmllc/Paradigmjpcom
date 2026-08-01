/**
 * BBB.org — Better Business Bureau (US/CA local SMB directory).
 *
 * BBB profiles long-established small businesses: plumbers, painters,
 * lawyers, dentists, roofers, etc. No API. Public search pages.
 */

export interface BbbResult {
  ok: boolean
  businesses: BbbBusiness[]
  totalFound: number
  error?: string
}

export interface BbbBusiness {
  name: string
  category: string
  location: string
  state: string
  rating: string | null
  yearsInBusiness: string | null
  website: string | null
  phone: string | null
  accredited: boolean
}

const TIMEOUT = 12_000

function extractBbbBusinesses(html: string): BbbBusiness[] {
  const businesses: BbbBusiness[] = []
  const nameRegex = /class="[^"]*result-name[^"]*"[^>]*>([^<]+)</g
  const ratingRegex = /class="[^"]*rating[^"]*"[^>]*>([A-Z][+±]?)</g
  const accreditRegex = /Accredited Business/gi

  const names = [...html.matchAll(nameRegex)].map(m => m[1].trim())
  const ratings = [...html.matchAll(ratingRegex)].map(m => m[1].trim())

  for (let i = 0; i < names.length && i < 50; i++) {
    businesses.push({
      name: names[i],
      category: "",
      location: "",
      state: "",
      rating: ratings[i] ?? null,
      yearsInBusiness: null,
      website: null,
      phone: null,
      accredited: false,
    })
  }
  return businesses
}

export async function searchBbb(query: string, location: string): Promise<BbbResult> {
  if (!query) return { ok: false, businesses: [], totalFound: 0, error: "query required" }

  try {
    const searchUrl = `https://www.bbb.org/search?find_text=${encodeURIComponent(query)}&find_loc=${encodeURIComponent(location)}`
    const res = await fetch(searchUrl, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { "User-Agent": "Paradigm-SalesOS/1.0 (business directory research)" },
    })
    if (!res.ok) {
      return { ok: false, businesses: [], totalFound: 0, error: `HTTP ${res.status}` }
    }
    const html = await res.text()
    const businesses = extractBbbBusinesses(html)
    return { ok: true, businesses, totalFound: businesses.length }
  } catch (e) {
    console.error("[bbb] search failed:", e)
    return { ok: false, businesses: [], totalFound: 0, error: e instanceof Error ? e.message : "fetch failed" }
  }
}

const BBB_CATEGORIES = [
  { query: "plumber", location: "" },
  { query: "painter", location: "" },
  { query: "roofer", location: "" },
  { query: "electrician", location: "" },
  { query: "contractor", location: "" },
  { query: "dentist", location: "" },
  { query: "accountant", location: "" },
  { query: "lawyer", location: "" },
  { query: "auto repair", location: "" },
  { query: "locksmith", location: "" },
]

export async function searchBbbBulk(): Promise<BbbResult[]> {
  const results: BbbResult[] = []
  for (const cat of BBB_CATEGORIES) {
    const result = await searchBbb(cat.query, cat.location)
    results.push(result)
    if (BBB_CATEGORIES.length > 1) {
      await new Promise(r => setTimeout(r, 1500))
    }
  }
  return results
}
