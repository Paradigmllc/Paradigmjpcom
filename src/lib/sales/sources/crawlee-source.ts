/**
 * crawlee-source.ts — Crawlee browser automation enrichment source
 *
 * Crawlee provides Playwright-based headless crawling with anti-blocking.
 * Deployed as a separate worker at CRAWLEE_WORKER_URL.
 * Falls back to OUTREACH_WORKER_URL / OUTREACH_WORKER_SECRET if
 * Crawlee-specific vars are not configured.
 *
 * Endpoints used:
 *   POST /scrape   — extract page content, body text, links, forms
 *   GET  /health   — health check
 */
import { envValue } from "../oss-service-health"

function crawleeUrl(): string | null {
  return envValue("CRAWLEE_WORKER_URL") ?? envValue("OUTREACH_WORKER_URL")
}

function crawleeSecret(): string | null {
  return envValue("CRAWLEE_WORKER_SECRET") ?? envValue("OUTREACH_WORKER_SECRET")
}

export async function checkCrawleeSourceHealth(): Promise<{ ok: boolean; detail: string }> {
  const base = crawleeUrl()
  if (!base) return { ok: false, detail: "CRAWLEE_WORKER_URL (or OUTREACH_WORKER_URL) not configured" }
  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/health`, { signal: AbortSignal.timeout(10_000) })
    return { ok: res.ok, detail: `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, detail: `unreachable: ${e instanceof Error ? e.message : String(e)}` }
  }
}

interface CrawleeScrapeResult {
  ok: boolean
  data?: {
    title?: string
    bodyText?: string
    links?: Array<{ url: string; text: string }>
    formsCount?: number
  }
  error?: string
}

export async function scrapeWithCrawlee(url: string, region?: string): Promise<CrawleeScrapeResult> {
  const base = crawleeUrl()
  if (!base) return { ok: false, error: "Crawlee not configured" }
  if (!url?.startsWith("http")) return { ok: false, error: "invalid url" }

  const secret = crawleeSecret()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (secret) headers["Authorization"] = `Bearer ${secret}`

  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/scrape`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url, region, task: "page_extraction" }),
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) {
      return { ok: false, error: `Crawlee HTTP ${res.status}` }
    }
    const data = await res.json() as {
      title?: string; bodyText?: string;
      links?: Array<{ url: string; text: string }>; formsCount?: number
    }
    return {
      ok: true,
      data: {
        title: data.title,
        bodyText: data.bodyText?.slice(0, 5000),
        links: data.links?.slice(0, 100),
        formsCount: data.formsCount,
      },
    }
  } catch (e) {
    console.error("[crawlee] scrape failed:", e)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
