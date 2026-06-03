import { createHmac } from "node:crypto"
import { checkR2StorageHealth } from "./r2-storage"

export type ServiceBalanceStatus = "not_applicable" | "not_configured" | "manual" | "checkable" | "ok" | "error"

export interface ServiceHealthResult {
  balanceStatus: ServiceBalanceStatus
  balanceLabel: string
}

interface FetchResult {
  ok: boolean
  status: number
  body: unknown
  text: string
}

function envValue(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

function missingEnv(names: string[]): string[] {
  return names.filter((name) => !envValue(name))
}

function notConfigured(names: string[]): ServiceHealthResult {
  return {
    balanceStatus: "not_configured",
    balanceLabel: `未設定: ${names.join(", ")}`,
  }
}

function normalizeHttpBase(raw: string): URL {
  const url = new URL(raw)
  if (url.protocol === "ws:") url.protocol = "http:"
  if (url.protocol === "wss:") url.protocol = "https:"
  url.pathname = url.pathname.replace(/\/+$/, "")
  url.search = ""
  url.hash = ""
  return url
}

async function safeFetch(url: string, init: RequestInit = {}): Promise<FetchResult> {
  const res = await fetch(url, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(10_000),
  })
  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch (error) {
    console.warn("[oss-service-health] non-JSON response:", { url, status: res.status, error })
    body = text.slice(0, 300)
  }
  return { ok: res.ok, status: res.status, body, text }
}

function healthError(service: string, error: unknown): ServiceHealthResult {
  console.error(`[oss-service-health] ${service} check failed:`, error)
  return {
    balanceStatus: "error",
    balanceLabel: error instanceof Error ? error.message : `${service} check failed`,
  }
}

function recordValue(value: unknown, key: string): unknown {
  return value && typeof value === "object" && key in value ? (value as Record<string, unknown>)[key] : null
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url")
}

function liveKitJwt(apiKey: string, apiSecret: string): string {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "HS256", typ: "JWT" }
  const payload = {
    iss: apiKey,
    sub: "revenue-os-health",
    nbf: now - 10,
    exp: now + 60,
    video: {
      roomList: true,
    },
  }
  const encodedHeader = base64Url(JSON.stringify(header))
  const encodedPayload = base64Url(JSON.stringify(payload))
  const signature = createHmac("sha256", apiSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url")
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

export async function checkBrowserlessHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["BROWSERLESS_URL", "BROWSERLESS_TOKEN"])
  if (missing.length > 0) return notConfigured(missing)

  try {
    const url = normalizeHttpBase(envValue("BROWSERLESS_URL") as string)
    url.pathname = `${url.pathname}/pressure`.replace(/\/+/g, "/")
    url.searchParams.set("token", envValue("BROWSERLESS_TOKEN") as string)
    const res = await safeFetch(url.toString(), { signal: AbortSignal.timeout(8_000) })
    if (!res.ok) return { balanceStatus: "error", balanceLabel: `HTTP ${res.status}` }
    const isAvailable = recordValue(res.body, "isAvailable")
    const running = recordValue(res.body, "running")
    const maxConcurrent = recordValue(res.body, "maxConcurrent")
    const queued = recordValue(res.body, "queued")
    return {
      balanceStatus: isAvailable === false ? "error" : "ok",
      balanceLabel: `pressure ok: running ${running ?? "-"} / ${maxConcurrent ?? "-"}, queued ${queued ?? 0}`,
    }
  } catch (error) {
    return healthError("Browserless", error)
  }
}

export async function checkStagehandHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["STAGEHAND_URL", "STAGEHAND_API_KEY"])
  if (missing.length > 0) return notConfigured(missing)

  try {
    const url = normalizeHttpBase(envValue("STAGEHAND_URL") as string)
    url.pathname = `${url.pathname}/health`.replace(/\/+/g, "/")
    const res = await safeFetch(url.toString(), {
      headers: { Authorization: `Bearer ${envValue("STAGEHAND_API_KEY")}` },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return { balanceStatus: "error", balanceLabel: `HTTP ${res.status}` }
    return { balanceStatus: "ok", balanceLabel: "health endpoint ok" }
  } catch (error) {
    return healthError("Stagehand", error)
  }
}

export async function checkChatwootHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["CHATWOOT_BASE_URL", "CHATWOOT_API_KEY", "CHATWOOT_ACCOUNT_ID"])
  if (missing.length > 0) return notConfigured(missing)

  try {
    const base = normalizeHttpBase(envValue("CHATWOOT_BASE_URL") as string)
    base.pathname = `${base.pathname}/api/v1/accounts/${envValue("CHATWOOT_ACCOUNT_ID")}/inboxes`.replace(/\/+/g, "/")
    const res = await safeFetch(base.toString(), {
      headers: { api_access_token: envValue("CHATWOOT_API_KEY") as string },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return { balanceStatus: "error", balanceLabel: `HTTP ${res.status}` }
    const payload = Array.isArray(recordValue(res.body, "payload")) ? recordValue(res.body, "payload") as unknown[] : []
    return { balanceStatus: "ok", balanceLabel: `account API ok: ${payload.length} inboxes` }
  } catch (error) {
    return healthError("Chatwoot", error)
  }
}

export async function checkDirectusHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["DIRECTUS_BASE_URL", "DIRECTUS_TOKEN"])
  if (missing.length > 0) return notConfigured(missing)

  try {
    const base = normalizeHttpBase(envValue("DIRECTUS_BASE_URL") as string)
    const healthUrl = new URL(base)
    healthUrl.pathname = `${healthUrl.pathname}/server/health`.replace(/\/+/g, "/")
    const health = await safeFetch(healthUrl.toString(), { signal: AbortSignal.timeout(10_000) })
    if (!health.ok) return { balanceStatus: "error", balanceLabel: `health HTTP ${health.status}` }

    const meUrl = new URL(base)
    meUrl.pathname = `${meUrl.pathname}/users/me`.replace(/\/+/g, "/")
    const me = await safeFetch(meUrl.toString(), {
      headers: { Authorization: `Bearer ${envValue("DIRECTUS_TOKEN")}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!me.ok) return { balanceStatus: "error", balanceLabel: `token HTTP ${me.status}` }
    return { balanceStatus: "ok", balanceLabel: "health and token API ok" }
  } catch (error) {
    return healthError("Directus", error)
  }
}

export async function checkKeystaticHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["KEYSTATIC_BASE_URL"])
  if (missing.length > 0) return notConfigured(missing)

  try {
    const base = normalizeHttpBase(envValue("KEYSTATIC_BASE_URL") as string)
    const res = await fetch(base.toString(), {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    })
    if (res.status >= 500) return { balanceStatus: "error", balanceLabel: `HTTP ${res.status}` }
    return { balanceStatus: "ok", balanceLabel: `reachable HTTP ${res.status}` }
  } catch (error) {
    return healthError("Keystatic", error)
  }
}

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
