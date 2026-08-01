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
  } catch (e) {
    console.warn("[katana] health check failed:", e instanceof Error ? e.message : String(e))
    return { ok: false, detail: "unreachable (will use public API fallbacks)" }
  }
}

export async function crawlWithKatana(url: string): Promise<KatanaResult> {
  if (!url?.startsWith("http")) return { source: "katana", ok: false, error: "invalid url" }

  const kUrl = envValue("KATANA_API_URL")
  if (kUrl) {
    try {
      const res = await fetch(`${kUrl}/crawl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(8_000),
      })
      if (res.ok) {
        const data = await res.json() as { ok: boolean; data?: Record<string, unknown>; error?: string }
        if (data.ok) return { source: "katana", ok: true, data: data.data }
      }
    } catch (e) {
      console.warn("[katana] self-hosted API unreachable, using public fallbacks:", e instanceof Error ? e.message : String(e))
    }
  }

  const urls: string[] = [url]
  const domain = new URL(url).hostname
  const tasks: Promise<void>[] = []

  tasks.push((async () => {
    try {
      const uscanRes = await fetch(
        `https://urlscan.io/api/v1/search/?q=domain:${encodeURIComponent(domain)}`,
        { signal: AbortSignal.timeout(12_000) },
      )
      if (uscanRes.ok) {
        const uscanData = await uscanRes.json() as { results?: Array<{ page?: { url?: string } }> }
        for (const r of (uscanData.results ?? []).slice(0, 20)) {
          if (r.page?.url) urls.push(r.page.url)
        }
      }
    } catch (e) {
      console.warn("[katana] URLscan.io fallback failed:", e instanceof Error ? e.message : String(e))
    }
  })())

  tasks.push((async () => {
    try {
      const ccRes = await fetch(
        `https://index.commoncrawl.org/CC-MAIN-2024-10-index?url=*.${encodeURIComponent(domain)}&output=json&limit=20`,
        { signal: AbortSignal.timeout(12_000) },
      )
      if (ccRes.ok) {
        const ccText = await ccRes.text()
        for (const line of ccText.trim().split("\n").filter(Boolean)) {
          try {
            const entry = JSON.parse(line)
            if (entry.url && !urls.includes(entry.url)) urls.push(entry.url)
          } catch (e) {
            console.warn("[katana] CommonCrawl JSON parse failed:", e instanceof Error ? e.message : String(e))
          }
        }
      }
    } catch (e) {
      console.warn("[katana] CommonCrawl fetch failed:", e instanceof Error ? e.message : String(e))
    }
  })())

  await Promise.allSettled(tasks)

  return {
    source: "katana",
    ok: urls.length > 1,
    data: { crawled: urls.length, urls: urls.slice(0, 200), fallback: true },
  }
}
