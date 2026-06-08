/**
 * HSTS Preload status check — Chrome HSTS preload list
 * Free, no API key. Checks if domain is in browser preload lists.
 * https://hstspreload.org
 */

export interface HstsPreloadResult {
  ok: boolean
  domain: string
  isPreloaded: boolean
  status: string
  error?: string
}

export async function checkHstsPreload(domain: string): Promise<HstsPreloadResult> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    const res = await fetch(`https://hstspreload.org/api/v2/status/${encodeURIComponent(cleanDomain)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    })

    if (!res.ok) {
      // Domain not in preload list returns 200 with status "unknown"
      return { ok: true, domain: cleanDomain, isPreloaded: false, status: "not_preloaded" }
    }

    const body = (await res.json()) as { status?: string }
    return {
      ok: true,
      domain: cleanDomain,
      isPreloaded: body.status === "preloaded",
      status: body.status ?? "unknown",
    }
  } catch (e) {
    console.error("[hsts-preload] check failed:", e)
    return { ok: false, domain, isPreloaded: false, status: "error", error: e instanceof Error ? e.message : "HSTS preload check failed" }
  }
}
