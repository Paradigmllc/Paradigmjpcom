/**
 * Tranco list — free domain popularity ranking (no API key)
 * https://tranco-list.eu/
 * Provides global domain ranking based on DNS traffic data.
 * Free alternative to SimilarWeb/Alexa ranking.
 */

export interface TrancoResult {
  ok: boolean
  domain: string
  rank: number | null
  error?: string
}

export async function queryTrancoRank(domain: string): Promise<TrancoResult> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "")
    const url = `https://tranco-list.eu/api/ranks/domain/${encodeURIComponent(cleanDomain)}`
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    })

    if (!res.ok) {
      return { ok: false, domain: cleanDomain, rank: null, error: `HTTP ${res.status}` }
    }

    const body = (await res.json()) as { ranks?: Array<{ date?: string; rank?: number }> }
    const latest = body.ranks?.[0]

    return {
      ok: true,
      domain: cleanDomain,
      rank: latest?.rank ?? null,
    }
  } catch (e) {
    console.error("[tranco] query failed:", e)
    return { ok: false, domain, rank: null, error: e instanceof Error ? e.message : "Tranco query failed" }
  }
}
