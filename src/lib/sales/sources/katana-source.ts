/**
 * Katana web crawler — via self-hosted HTTP API or public APIs as fallback.
 *
 * Primary: self-hosted Katana at KATANA_API_URL
 * Fallback: URLscan.io + CommonCrawl + direct HTTP fetch (public APIs)
 */
import { envValue } from "../oss-service-health"

interface KatanaResult { source: string; ok: boolean; data?: Record<string, unknown>; error?: string }

function katanaUrl(): string {
  return envValue("KATANA_API_URL") ?? "http://localhost:5002"
}

export async function checkKatanaHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${katanaUrl()}/health`, { signal: AbortSignal.timeout(10_000) })
    return { ok: res.ok, detail: `HTTP ${res.status}` }
  } catch {
    return { ok: false, detail: "unreachable (will use public API fallbacks)" }
  }
}

export async function crawlWithKatana(url: string): Promise<KatanaResult> {
  if (!url?.startsWith("http")) return { source: "katana", ok: false, error: "invalid url" }

  // Try self-hosted HTTP API first
  try {
    const res = await fetch(`${katanaUrl()}/crawl`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(100_000),
    })
    if (res.ok) {
      const data = await res.json() as { ok: boolean; data?: Record<string, unknown>; error?: string }
      if (data.ok) return { source: "katana", ok: true, data: data.data }
    }
    console.warn("[katana] self-hosted API unavailable, using public fallbacks")
  } catch {
    console.warn("[katana] self-hosted API unreachable, using public fallbacks")
  }

  // Fallback: collect URLs from public sources
  const urls: string[] = [url]
  try {
    // URLscan.io (public API, no auth for basic queries)
    const domain = new URL(url).hostname
    const uscanRes = await fetch(
      `https://urlscan.io/api/v1/search/?q=domain:${encodeURIComponent(domain)}`,
      { signal: AbortSignal.timeout(20_000) }
    )
    if (uscanRes.ok) {
      const uscanData = await uscanRes.json() as { results?: Array<{ page?: { url?: string } }> }
      if (uscanData.results) {
        for (const r of uscanData.results.slice(0, 20)) {
          if (r.page?.url) urls.push(r.page.url)
        }
      }
    }
  } catch { /* non-fatal */ }

  try {
    // CommonCrawl index
    const domain = new URL(url).hostname
    const ccRes = await fetch(
      `https://index.commoncrawl.org/CC-MAIN-2024-10-index?url=*.${encodeURIComponent(domain)}&output=json&limit=20`,
      { signal: AbortSignal.timeout(20_000) }
    )
    if (ccRes.ok) {
      const ccText = await ccRes.text()
      const lines = ccText.trim().split("\n").filter(Boolean)
      for (const line of lines) {
        try {
          const entry = JSON.parse(line)
          if (entry.url && !urls.includes(entry.url)) urls.push(entry.url)
        } catch { /* skip non-JSON */ }
      }
    }
  } catch { /* non-fatal */ }

  return {
    source: "katana",
    ok: urls.length > 1,
    data: { crawled: urls.length, urls: urls.slice(0, 200), fallback: true },
  }
}
