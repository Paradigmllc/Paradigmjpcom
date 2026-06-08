/**
 * Cloudflare Radar API — free domain ranking & traffic data
 * No API key required for basic endpoints.
 * https://developers.cloudflare.com/radar/
 */

export interface CloudflareRadarResult {
  ok: boolean
  domain: string
  rank?: number
  rankBucket?: string
  categories?: string[]
  error?: string
}

const RANK_BUCKETS: { min: number; label: string }[] = [
  { min: 0, label: "top-100" },
  { min: 100, label: "top-1k" },
  { min: 1000, label: "top-10k" },
  { min: 10_000, label: "top-100k" },
  { min: 100_000, label: "top-1m" },
  { min: 1_000_000, label: "top-10m" },
  { min: 10_000_000, label: "top-100m" },
]

function rankBucket(rank: number): string {
  for (let i = RANK_BUCKETS.length - 1; i >= 0; i--) {
    if (rank >= RANK_BUCKETS[i].min) return RANK_BUCKETS[i].label
  }
  return "unranked"
}

export async function queryCloudflareRadar(domain: string): Promise<CloudflareRadarResult> {
  try {
    const url = `https://radar.cloudflare.com/api/v1/domains/${encodeURIComponent(domain)}`
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      return { ok: false, domain, error: `HTTP ${res.status}` }
    }

    const body = (await res.json()) as {
      result?: {
        domain?: { ranking?: number; categories?: Array<{ name?: string }> }
      }
    }

    const ranking = body.result?.domain?.ranking
    const categories = body.result?.domain?.categories?.map((c) => c.name).filter(Boolean) as string[] | undefined

    return {
      ok: true,
      domain,
      rank: ranking,
      rankBucket: ranking != null ? rankBucket(ranking) : undefined,
      categories,
    }
  } catch (e) {
    console.error("[cloudflare-radar] query failed:", e)
    return { ok: false, domain, error: e instanceof Error ? e.message : "Cloudflare Radar query failed" }
  }
}
