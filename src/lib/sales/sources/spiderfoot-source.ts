/**
 * SpiderFoot OSINT — 200+ free modules via HTTP API gateway.
 * Requires osint-gateway Docker service running on SPIDERFOOT_API_URL (default: http://localhost:5001).
 */
import { envValue } from "../oss-service-health"

interface SfResult { source: string; ok: boolean; data?: Record<string, unknown>; error?: string }

function spiderfootUrl(): string {
  return envValue("SPIDERFOOT_API_URL") ?? "http://localhost:5001"
}

export async function checkSpiderFootHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${spiderfootUrl()}/health`, { signal: AbortSignal.timeout(10_000) })
    return { ok: res.ok, detail: `HTTP ${res.status}` }
  } catch (error) {
    return { ok: false, detail: String(error) }
  }
}

async function runSpiderFootScan(target: string, modules: string[]): Promise<SfResult> {
  if (!target?.includes(".")) return { source: "spiderfoot", ok: false, error: "invalid target" }
  try {
    const res = await fetch(`${spiderfootUrl()}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, modules }),
      signal: AbortSignal.timeout(130_000),
    })
    if (!res.ok) {
      return { source: "spiderfoot", ok: false, error: `HTTP ${res.status}` }
    }
    const data = await res.json() as { ok: boolean; data?: Record<string, unknown>; error?: string }
    return {
      source: "spiderfoot",
      ok: data.ok,
      data: data.data,
      error: data.error,
    }
  } catch (error) {
    console.error("[spiderfoot] scan failed:", error)
    return { source: "spiderfoot", ok: false, error: String(error) }
  }
}

export async function enrichDomainWithSpiderFoot(domain: string): Promise<SfResult[]> {
  const modules = [
    "sfp_dns", "sfp_whois", "sfp_sslcert", "sfp_email",
    "sfp_names", "sfp_webserver", "sfp_webanalytics",
    "sfp_spider", "sfp_cookies", "sfp_strangeheaders",
  ]
  return [await runSpiderFootScan(domain, modules)]
}
