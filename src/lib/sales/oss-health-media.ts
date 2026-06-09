import { checkR2StorageHealth } from "./r2-storage"
import { envValue, missingEnv, notConfigured, normalizeHttpBase, safeFetch, healthError, recordValue, liveKitJwt } from "./oss-service-health"
import type { ServiceHealthResult } from "./oss-service-health"

export async function checkLiveKitHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"])
  if (missing.length > 0) return notConfigured(missing)

  try {
    const base = normalizeHttpBase(envValue("LIVEKIT_URL") as string)
    base.pathname = `${base.pathname}/twirp/livekit.RoomService/ListRooms`.replace(/\/+/g, "/")
    const jwt = liveKitJwt(envValue("LIVEKIT_API_KEY") as string, envValue("LIVEKIT_API_SECRET") as string)
    const res = await safeFetch(base.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return { balanceStatus: "error", balanceLabel: `RoomService HTTP ${res.status}` }
    const rooms = Array.isArray(recordValue(res.body, "rooms")) ? recordValue(res.body, "rooms") as unknown[] : []
    return { balanceStatus: "ok", balanceLabel: `RoomService ok: ${rooms.length} rooms` }
  } catch (error) {
    return healthError("LiveKit", error)
  }
}

export async function checkHyperFramesHealth(): Promise<ServiceHealthResult> {
  const baseValue = envValue("HYPERFRAMES_RENDERER_URL") ?? envValue("HYPERFRAMES_API_URL")
  const apiKey = envValue("HYPERFRAMES_API_KEY")
  const missing = [...(baseValue ? [] : ["HYPERFRAMES_RENDERER_URL or HYPERFRAMES_API_URL"]), ...(apiKey ? [] : ["HYPERFRAMES_API_KEY"])]
  if (missing.length > 0) return notConfigured(missing)

  try {
    const base = normalizeHttpBase(baseValue as string)
    const candidates = ["/health", "/api/health"]
    let lastStatus: number | null = null
    for (const path of candidates) {
      const url = new URL(base)
      url.pathname = `${url.pathname}${path}`.replace(/\/+/g, "/")
      const res = await safeFetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10_000),
      })
      lastStatus = res.status
      if (res.ok) return { balanceStatus: "ok", balanceLabel: `${path} ok` }
    }
    return { balanceStatus: "error", balanceLabel: `health HTTP ${lastStatus ?? "unknown"}` }
  } catch (error) {
    return healthError("HyperFrames", error)
  }
}

export async function checkOpenMontageHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["OPENMONTAGE_API_URL", "OPENMONTAGE_API_KEY", "NEXT_PUBLIC_OPENMONTAGE_STUDIO_URL"])
  if (missing.length > 0) return notConfigured(missing)

  try {
    const base = normalizeHttpBase(envValue("OPENMONTAGE_API_URL") as string)
    const candidates = ["/health", "/api/health"]
    let lastStatus: number | null = null
    for (const path of candidates) {
      const url = new URL(base)
      url.pathname = `${url.pathname}${path}`.replace(/\/+/g, "/")
      const res = await safeFetch(url.toString(), {
        headers: { Authorization: `Bearer ${envValue("OPENMONTAGE_API_KEY")}` },
        signal: AbortSignal.timeout(10_000),
      })
      lastStatus = res.status
      if (res.ok) return { balanceStatus: "ok", balanceLabel: `${path} ok` }
    }
    return { balanceStatus: "error", balanceLabel: `health HTTP ${lastStatus ?? "unknown"}` }
  } catch (error) {
    return healthError("OpenMontage", error)
  }
}

export async function checkComfyUiHealth(): Promise<ServiceHealthResult> {
  const baseValue = envValue("COMFYUI_API_URL") ?? envValue("COMFYUI_BASE_URL")
  const apiKey = envValue("COMFYUI_API_KEY")
  const missing = [...(baseValue ? [] : ["COMFYUI_API_URL or COMFYUI_BASE_URL"]), ...(apiKey ? [] : ["COMFYUI_API_KEY"])]
  if (missing.length > 0) return notConfigured(missing)

  try {
    const base = normalizeHttpBase(baseValue as string)
    const url = new URL(base)
    url.pathname = `${url.pathname}/system_stats`.replace(/\/+/g, "/")
    const res = await safeFetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-API-Key": apiKey as string,
      },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return { balanceStatus: "error", balanceLabel: `system_stats HTTP ${res.status}` }
    return { balanceStatus: "ok", balanceLabel: "system_stats ok" }
  } catch (error) {
    return healthError("ComfyUI", error)
  }
}

export async function checkR2DeliveryHealth(): Promise<ServiceHealthResult> {
  const result = await checkR2StorageHealth()
  return {
    balanceStatus: result.ok ? "ok" : result.label.startsWith("R2 is not ready:") ? "not_configured" : "error",
    balanceLabel: result.label,
  }
}

export async function checkVastHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["VAST_API_KEY"])
  if (missing.length > 0) return notConfigured(missing)

  try {
    const apiKey = envValue("VAST_API_KEY") as string
    const res = await fetch("https://console.vast.ai/api/v0/machines/?verified=true&limit=1", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return { balanceStatus: "error", balanceLabel: `Vast.ai API HTTP ${res.status}` }
    const body = await res.json().catch(() => ({})) as { offers?: unknown[] }
    const count = Array.isArray(body.offers) ? body.offers.length : 0
    return { balanceStatus: "ok", balanceLabel: `Vast.ai API verified: ${count} offers available` }
  } catch (error) {
    return healthError("Vast.ai", error)
  }
}

export async function checkAstroHealth(): Promise<ServiceHealthResult> {
  const baseValue = envValue("ASTRO_DEMO_WORKER_URL") ?? envValue("ASTRO_DEMO_FACTORY_URL")
  if (!baseValue) return notConfigured(["ASTRO_DEMO_WORKER_URL or ASTRO_DEMO_FACTORY_URL"])
  try {
    const res = await fetch(normalizeHttpBase(baseValue).toString(), { signal: AbortSignal.timeout(10_000) })
    return { balanceStatus: res.ok ? "ok" : "error", balanceLabel: `reachable HTTP ${res.status}` }
  } catch (error) {
    return healthError("Astro", error)
  }
}

export async function checkCalcomHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["CALCOM_BASE_URL", "CALCOM_API_KEY"])
  if (missing.length > 0) return notConfigured(missing)
  try {
    const base = normalizeHttpBase(envValue("CALCOM_BASE_URL") as string)
    base.pathname = `${base.pathname}/api/health`.replace(/\/+/g, "/")
    const res = await safeFetch(base.toString(), { signal: AbortSignal.timeout(10_000) })
    return { balanceStatus: res.ok ? "ok" : "error", balanceLabel: `health endpoint HTTP ${res.status}` }
  } catch (error) {
    return healthError("Cal.com", error)
  }
}

export async function checkCrawl4AiHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["CRAWL4AI_BASE_URL"])
  if (missing.length > 0) return notConfigured(missing)
  try {
    const base = normalizeHttpBase(envValue("CRAWL4AI_BASE_URL") as string)
    const path = envValue("CRAWL4AI_HEALTH_PATH") ?? "/health"
    base.pathname = `${base.pathname}/${path.replace(/^\/+/, "")}`.replace(/\/+/g, "/")
    const headers: Record<string, string> = {}
    const apiKey = envValue("CRAWL4AI_API_KEY")
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`
    const res = await safeFetch(base.toString(), { headers, signal: AbortSignal.timeout(10_000) })
    return { balanceStatus: res.ok ? "ok" : "error", balanceLabel: `health endpoint HTTP ${res.status}` }
  } catch (error) {
    return healthError("Crawl4AI", error)
  }
}

export async function checkCrawleeHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["CRAWLEE_WORKER_URL"])
  if (missing.length > 0) return notConfigured(missing)
  try {
    const url = normalizeHttpBase(envValue("CRAWLEE_WORKER_URL") as string)
    url.pathname = `${url.pathname}/health`.replace(/\/+/g, "/")
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) })
    return { balanceStatus: res.ok ? "ok" : "error", balanceLabel: `health endpoint HTTP ${res.status}` }
  } catch (error) {
    return healthError("Crawlee", error)
  }
}

export async function checkPlaywrightStealthHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["OUTREACH_WORKER_URL"])
  if (missing.length > 0) return notConfigured(missing)
  try {
    const url = normalizeHttpBase(envValue("OUTREACH_WORKER_URL") as string)
    url.pathname = `${url.pathname}/health`.replace(/\/+/g, "/")
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) })
    return { balanceStatus: res.ok ? "ok" : "error", balanceLabel: `health endpoint HTTP ${res.status}` }
  } catch (error) {
    return healthError("Playwright Stealth", error)
  }
}
