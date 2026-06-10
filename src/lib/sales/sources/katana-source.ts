/**
 * Katana web crawler — via HTTP API gateway.
 * Requires osint-gateway Docker service running on KATANA_API_URL (default: http://localhost:5002).
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
  } catch (error) {
    return { ok: false, detail: String(error) }
  }
}

export async function crawlWithKatana(url: string): Promise<KatanaResult> {
  if (!url?.startsWith("http")) return { source: "katana", ok: false, error: "invalid url" }
  try {
    const res = await fetch(`${katanaUrl()}/crawl`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(100_000),
    })
    if (!res.ok) {
      return { source: "katana", ok: false, error: `HTTP ${res.status}` }
    }
    const data = await res.json() as { ok: boolean; data?: Record<string, unknown>; error?: string }
    return {
      source: "katana",
      ok: data.ok,
      data: data.data,
      error: data.error,
    }
  } catch (error) {
    console.error("[katana] crawl failed:", error)
    return { source: "katana", ok: false, error: String(error) }
  }
}
