/**
 * SearXNG-based traffic estimation — replaces unreliable SimilarWeb scraping.
 *
 * Uses public search footprints via SearXNG (free, self-hosted):
 *   1. site:domain → indexed page count (content investment proxy)
 *   2. "brand name" → citation count (brand awareness proxy)
 *   3. related:domain → network quality
 *
 * Formula: Estimated Monthly PV = (indexedPages × avgCTR × 0.015) × log10(citations) × industryCoeff
 */
import { getServiceSalesSupabase } from "@/lib/supabase"
import { cleanDomain as canonicalDomain } from "@/lib/sales/japan-readiness-utils"

const PUBLIC_SEARXNG_INSTANCES = [
  "https://searx.be",
  "https://search.sapti.me",
  "https://searx.tuxcloud.net",
]
let currentInstanceIndex = 0

function getSearxngUrl(): string {
  return process.env.SEARXNG_BASE_URL ?? process.env.SEARXNG_API_URL ?? PUBLIC_SEARXNG_INSTANCES[currentInstanceIndex]
}

function rotateInstance(): void {
  currentInstanceIndex = (currentInstanceIndex + 1) % PUBLIC_SEARXNG_INSTANCES.length
}

const INDUSTRY_COEFFICIENTS: Record<string, number> = {
  ecommerce: 1.8,
  saas: 1.2,
  media: 2.5,
  finance: 1.0,
  education: 0.8,
  healthcare: 0.6,
  real_estate: 0.9,
  travel: 1.5,
  default: 1.0,
}

const AVG_CTR = 0.015 // 1.5% average click-through rate

interface SearxResult { source: string; ok: boolean; data?: unknown; error?: string }

async function searxSearch(query: string): Promise<number | null> {
  // Try up to 3 instances (self-hosted + 2 public fallbacks)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const params = new URLSearchParams({ q: query, format: "json", categories: "general" })
      const url = getSearxngUrl()
      const res = await fetch(`${url}/search?${params}`, {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(15_000),
      })
      if (res.ok) {
        const data = await res.json() as { number_of_results?: number; results?: unknown[] }
        return data.number_of_results ?? data.results?.length ?? null
      }
      console.warn("[searxng-traffic] instance returned", res.status, "rotating...")
      rotateInstance()
    } catch (e) {
      console.warn("[searxng-traffic] instance failed, rotating...")
      rotateInstance()
    }
  }
  console.error("[searxng-traffic] all instances failed for query:", query.slice(0, 50))
  return null
}

/** Detect industry from company meta or defaults */
function detectIndustryCoeff(domain: string, companyName?: string): number {
  const lower = (companyName || domain).toLowerCase()
  // Simple keyword-based detection
  for (const [kw, coeff] of Object.entries({
    shop: 1.8, store: 1.8, buy: 1.8, ec: 1.8, market: 1.8,
    saas: 1.2, cloud: 1.2, software: 1.2, app: 1.2, api: 1.2,
    news: 2.5, media: 2.5, blog: 2.5, magazine: 2.5, tv: 2.5,
    bank: 1.0, finance: 1.0, insurance: 1.0, invest: 1.0,
    school: 0.8, university: 0.8, college: 0.8, academy: 0.8,
    hospital: 0.6, clinic: 0.6, doctor: 0.6, health: 0.6, medical: 0.6,
    hotel: 1.5, travel: 1.5, tour: 1.5, flight: 1.5, booking: 1.5,
    property: 0.9, estate: 0.9, realtor: 0.9, rent: 0.9,
  })) {
    if (lower.includes(kw)) return coeff
  }
  return INDUSTRY_COEFFICIENTS.default
}

export async function estimateTrafficViaSearx(domain: string, companyName?: string): Promise<SearxResult> {
  if (!domain?.includes(".")) return { source: "searxng_traffic", ok: false, error: "invalid domain" }

  try {
    const cleanDomain = canonicalDomain(domain)
    const brand = companyName || cleanDomain.split(".")[0]

    // 1. Index saturation: site:domain
    const indexedPages = await searxSearch(`site:${cleanDomain}`)

    // 2. Citation count: "brand name"
    const citations = await searxSearch(`"${brand}"`)

    // 3. Related network: related:domain
    const related = await searxSearch(`related:${cleanDomain}`)

    // Calculate estimated traffic
    const idx = indexedPages ?? 0
    const cit = citations ?? 1
    const rel = related ?? 0
    const coeff = detectIndustryCoeff(domain, companyName)

    // Formula: indexedPages × avgCTR × log10(citations) × industryCoeff
    const estimatedPV = Math.round(
      (idx * AVG_CTR) * Math.max(1, Math.log10(cit)) * coeff
    )

    // Additional: network quality score (0-100)
    const networkScore = Math.min(100, Math.round((rel / Math.max(1, idx)) * 100))

    const data = {
      indexed_pages: idx,
      citations,
      related_domains: rel,
      estimated_monthly_pv: estimatedPV,
      network_quality_score: networkScore,
      industry_coefficient: coeff,
      confidence: idx > 0 && cit > 10 ? "high" : idx > 0 ? "medium" : "low",
    }

    return { source: "searxng_traffic", ok: true, data }
  } catch (error) {
    return { source: "searxng_traffic", ok: false, error: String(error) }
  }
}

export async function checkSearxngTrafficHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${getSearxngUrl()}/search?q=test&format=json`, {
      signal: AbortSignal.timeout(10_000),
    })
    return { ok: res.ok, detail: `HTTP ${res.status}` }
  } catch (e) {
    console.error("[searxng-traffic] health check failed:", e)
    return { ok: false, detail: String(e) }
  }
}
