/**
 * FlareSolverr — Cloudflare/DDoS-GUARD WAF bypass proxy.
 * Routes Stagehand traffic through this to avoid bot detection.
 * Docker: ghcr.io/flaresolverr/flaresolverr:latest (port 8191)
 */
const FLARESOLVERR_URL = process.env.FLARESOLVERR_API_URL || "http://127.0.0.1:8191"

interface FsResult { source: string; ok: boolean; data?: unknown; error?: string }

async function fsRequest(cmd: string, url: string, maxTimeout = 30_000): Promise<FsResult> {
  try {
    const res = await fetch(`${FLARESOLVERR_URL}/v1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd, url, maxTimeout }),
      signal: AbortSignal.timeout(maxTimeout + 10_000),
    })
    const data = await res.json()
    if (data?.status === "ok") {
      return { source: "flaresolverr", ok: true, data: {
        status: data.status,
        response_url: data?.solution?.url?.substring(0, 100),
        user_agent: data?.solution?.userAgent,
        headers_count: Object.keys(data?.solution?.response || {}).length,
      }}
    }
    return { source: "flaresolverr", ok: false, error: data?.message || data?.error || `status: ${data?.status}` }
  } catch (error) {
    return { source: "flaresolverr", ok: false, error: String(error) }
  }
}

/** Test if a URL is behind Cloudflare/WAF protection */
export async function probeWafProtection(url: string): Promise<FsResult> {
  if (!url?.startsWith("http")) return { source: "flaresolverr_waf", ok: false, error: "invalid url" }
  return fsRequest("request.get", url, 15_000)
}

/** Fetch a URL through FlareSolverr bypass */
export async function fetchViaFlareSolverr(url: string): Promise<FsResult> {
  if (!url?.startsWith("http")) return { source: "flaresolverr_fetch", ok: false, error: "invalid url" }
  return fsRequest("request.get", url, 20_000)
}

export async function checkFlareSolverrHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${FLARESOLVERR_URL}/v1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd: "request.get", url: "http://www.google.com", maxTimeout: 5000 }),
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json()
    return { ok: data?.status === "ok" || data?.status === "error", detail: data?.message || data?.status || `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, detail: String(e) }
  }
}
