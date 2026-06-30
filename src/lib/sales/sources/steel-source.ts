/**
 * steel-source.ts — Steel.dev OSS browser automation enrichment source
 *
 * Steel.dev provides headless browser automation with stealth.
 * OSS self-hosted at STEEL_BASE_URL (default: https://steel.paradigmjp.com)
 *
 * Endpoints used:
 *   POST /v1/scrape  — extract page content, metadata, links
 *   POST /v1/screenshot — capture page screenshot
 *   GET  /v1/health  — health check
 */
import { envValue } from "../oss-service-health"

function steelUrl(): string {
  const configured = envValue("STEEL_BASE_URL")
  if (!configured) throw new Error("STEEL_BASE_URL is not configured")
  return configured.replace(/\/+$/, "")
}

function steelApiKey(): string | null {
  return envValue("STEEL_API_KEY") ?? null
}

export async function checkSteelHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${steelUrl()}/v1/health`, { signal: AbortSignal.timeout(10_000) })
    return { ok: res.ok, detail: `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, detail: `unreachable: ${e instanceof Error ? e.message : String(e)}` }
  }
}

interface SteelScrapeResult {
  ok: boolean
  data?: {
    title?: string
    text?: string
    links?: string[]
    metadata?: Record<string, string>
    screenshot?: string
  }
  error?: string
}

export async function scrapeWithSteel(url: string): Promise<SteelScrapeResult> {
  if (!url?.startsWith("http")) return { ok: false, error: "invalid url" }
  if (!envValue("STEEL_BASE_URL")) return { ok: false, error: "STEEL_BASE_URL is not configured" }
  const apiKey = steelApiKey()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`

  try {
    const res = await fetch(`${steelUrl()}/v1/scrape`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url, format: "json", waitFor: 3000 }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      return { ok: false, error: `Steel HTTP ${res.status}` }
    }
    const data = await res.json() as {
      title?: string; text?: string; links?: string[];
      metadata?: Record<string, string>; screenshot?: string;
    }
    return {
      ok: true,
      data: {
        title: data.title,
        text: data.text?.slice(0, 5000),
        links: data.links?.slice(0, 100),
        metadata: data.metadata,
        screenshot: data.screenshot,
      },
    }
  } catch (e) {
    console.error("[steel] scrape failed:", e)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

interface SteelScreenshotResult {
  ok: boolean
  screenshot?: string
  error?: string
}

export async function screenshotWithSteel(url: string): Promise<SteelScreenshotResult> {
  if (!url?.startsWith("http")) return { ok: false, error: "invalid url" }
  if (!envValue("STEEL_BASE_URL")) return { ok: false, error: "STEEL_BASE_URL is not configured" }
  const apiKey = steelApiKey()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`

  try {
    const res = await fetch(`${steelUrl()}/v1/screenshot`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url, fullPage: true }),
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) return { ok: false, error: `Steel HTTP ${res.status}` }
    const data = await res.json() as { screenshot?: string }
    return { ok: true, screenshot: data.screenshot }
  } catch (e) {
    console.error("[steel] screenshot failed:", e)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
