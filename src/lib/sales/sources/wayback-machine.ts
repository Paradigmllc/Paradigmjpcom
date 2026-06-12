import { cleanDomain as canonicalDomain } from "@/lib/sales/japan-readiness-utils"

/**
 * Wayback Machine CDX API — Internet Archive historical snapshots
 * Free, no API key. Reveals site age, redesign frequency, historical issues.
 * https://archive.org/developers/wayback-cdx-server.html
 */

export interface WaybackResult {
  ok: boolean
  domain: string
  totalSnapshots: number
  firstSnapshot: string | null
  lastSnapshot: string | null
  yearsActive: number
  snapshotCountsByYear: Record<string, number>
  error?: string
}

export async function queryWaybackMachine(domain: string): Promise<WaybackResult> {
  try {
    const cleanDomain = canonicalDomain(domain)
    const url = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(cleanDomain)}/*&output=json&fl=timestamp&limit=5000&collapse=timestamp:6&filter=!statuscode:404`
    const res = await fetch(url, {
      headers: { "User-Agent": "RevenueOS/1.0" },
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      return { ok: false, domain: cleanDomain, totalSnapshots: 0, firstSnapshot: null, lastSnapshot: null, yearsActive: 0, snapshotCountsByYear: {}, error: `HTTP ${res.status}` }
    }

    const rows = (await res.json()) as string[][]
    // First row is header: ["timestamp"]
    const snapshots = rows.slice(1).map((r) => r[0]).filter(Boolean).sort()
    if (snapshots.length === 0) {
      return { ok: true, domain: cleanDomain, totalSnapshots: 0, firstSnapshot: null, lastSnapshot: null, yearsActive: 0, snapshotCountsByYear: {} }
    }

    const firstSnapshot = snapshots[0]!
    const lastSnapshot = snapshots[snapshots.length - 1]!

    const firstYear = parseInt(firstSnapshot.slice(0, 4), 10)
    const lastYear = parseInt(lastSnapshot.slice(0, 4), 10)
    const yearsActive = Math.max(1, lastYear - firstYear + 1)

    const snapshotCountsByYear: Record<string, number> = {}
    for (const ts of snapshots) {
      const year = ts.slice(0, 4)
      snapshotCountsByYear[year] = (snapshotCountsByYear[year] ?? 0) + 1
    }

    return {
      ok: true,
      domain: cleanDomain,
      totalSnapshots: snapshots.length,
      firstSnapshot: `${firstSnapshot.slice(0, 4)}-${firstSnapshot.slice(4, 6)}`,
      lastSnapshot: `${lastSnapshot.slice(0, 4)}-${lastSnapshot.slice(4, 6)}`,
      yearsActive,
      snapshotCountsByYear,
    }
  } catch (e) {
    console.error("[wayback] query failed:", e)
    return {
      ok: false,
      domain,
      totalSnapshots: 0,
      firstSnapshot: null,
      lastSnapshot: null,
      yearsActive: 0,
      snapshotCountsByYear: {},
      error: e instanceof Error ? e.message : "Wayback Machine query failed",
    }
  }
}
