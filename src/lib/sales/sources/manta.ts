/**
 * Manta.com — US SMB directory (<10 employees, no large enterprises).
 *
 * Manta is a public US business directory focused on small businesses.
 * No API. Public search pages are scraped via fetch/HTML parse.
 * Rate limit: conservative 2s between pages.
 */

export interface MantaResult {
  ok: boolean
  businesses: MantaBusiness[]
  totalFound: number
  page: number
  error?: string
}

export interface MantaBusiness {
  name: string
  category: string
  location: string
  state: string
  website: string | null
  phone: string | null
  employees: string | null
}

const TIMEOUT = 12_000

function extractMantaBusinesses(html: string): MantaBusiness[] {
  const businesses: MantaBusiness[] = []
  const titles = html.match(/class="[^"]*media-heading[^"]*"[^>]*>([^<]+)</g) || []
  const locations = html.match(/([A-Z][a-z]+(?: [A-Z][a-z]+)*, [A-Z]{2})/g) || []

  for (let i = 0; i < titles.length && i < 50; i++) {
    const name = titles[i].replace(/<[^>]+>/g, "").trim()
    const location = locations[i] || ""
    const [city, state] = location.split(", ")

    businesses.push({
      name,
      category: "",
      location: city || "",
      state: state || "",
      website: null,
      phone: null,
      employees: "<10",
    })
  }

  return businesses
}

export async function searchManta(query: string, location: string, page = 1): Promise<MantaResult> {
  if (!query) return { ok: false, businesses: [], totalFound: 0, page, error: "query required" }

  try {
    const searchUrl = `https://www.manta.com/search?search=${encodeURIComponent(query)}&city=${encodeURIComponent(location)}&pg=${page}`
    const res = await fetch(searchUrl, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { "User-Agent": "Paradigm-SalesOS/1.0 (business directory research)" },
    })
    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        console.warn("[manta] rate limited, page:", page)
        return { ok: false, businesses: [], totalFound: 0, page, error: `rate limited: HTTP ${res.status}` }
      }
    }
    const html = await res.text()
    const businesses = extractMantaBusinesses(html)
    return { ok: true, businesses, totalFound: businesses.length, page }
  } catch (e) {
    console.error("[manta] search failed:", e)
    return { ok: false, businesses: [], totalFound: 0, page, error: e instanceof Error ? e.message : "fetch failed" }
  }
}

const MANTA_CATEGORIES = [
  { query: "plumber", location: "" },
  { query: "painter", location: "" },
  { query: "landscaper", location: "" },
  { query: "electrician", location: "" },
  { query: "hvac", location: "" },
  { query: "roofing", location: "" },
  { query: "cleaning", location: "" },
  { query: "handyman", location: "" },
  { query: "moving", location: "" },
  { query: "pest control", location: "" },
]

export async function searchMantaBulk(): Promise<MantaResult[]> {
  const results: MantaResult[] = []
  for (const cat of MANTA_CATEGORIES) {
    const result = await searchManta(cat.query, cat.location, 1)
    results.push(result)
    if (MANTA_CATEGORIES.length > 1) {
      await new Promise(r => setTimeout(r, 1500))
    }
  }
  return results
}
