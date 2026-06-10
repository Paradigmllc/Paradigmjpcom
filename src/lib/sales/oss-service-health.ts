import { createHmac } from "node:crypto"

export type ServiceBalanceStatus = "not_applicable" | "not_configured" | "manual" | "checkable" | "ok" | "error"

export interface ServiceHealthResult {
  balanceStatus: ServiceBalanceStatus
  balanceLabel: string
  ok?: boolean
  name?: string
  detail?: string
  url?: string
}

export interface FetchResult {
  ok: boolean
  status: number
  body: unknown
  text: string
}

export function envValue(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

export function missingEnv(names: string[]): string[] {
  return names.filter((name) => !envValue(name))
}

export function notConfigured(names: string[]): ServiceHealthResult {
  return {
    balanceStatus: "not_configured",
    balanceLabel: `未設定: ${names.join(", ")}`,
  }
}

export function normalizeHttpBase(raw: string): URL {
  const url = new URL(raw)
  if (url.protocol === "ws:") url.protocol = "http:"
  if (url.protocol === "wss:") url.protocol = "https:"
  url.pathname = url.pathname.replace(/\/+$/, "")
  url.search = ""
  url.hash = ""
  return url
}

export async function safeFetch(url: string, init: RequestInit = {}): Promise<FetchResult> {
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

export function healthError(service: string, error: unknown): ServiceHealthResult {
  console.error(`[oss-service-health] ${service} check failed:`, error)
  return {
    balanceStatus: "error",
    balanceLabel: error instanceof Error ? error.message : `${service} check failed`,
  }
}

export function recordValue(value: unknown, key: string): unknown {
  return value && typeof value === "object" && key in value ? (value as Record<string, unknown>)[key] : null
}

export function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url")
}

export function liveKitJwt(apiKey: string, apiSecret: string): string {
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

// ── Core OSS health checks ──
export { checkSpiderfootHealth, checkKatanaServiceHealth, checkMaigretServiceHealth, checkFlareSolverrServiceHealth, checkBrowserlessHealth, checkStagehandHealth, checkChatwootHealth, checkDirectusHealth, checkKeystaticHealth } from "./oss-health-core"

// ── Media / AI OSS health checks ──
export { checkLiveKitHealth, checkHyperFramesHealth, checkOpenMontageHealth, checkComfyUiHealth, checkR2DeliveryHealth, checkVastHealth, checkAstroHealth, checkCalcomHealth, checkCrawl4AiHealth, checkCrawleeHealth, checkPlaywrightStealthHealth } from "./oss-health-media"

// ── Infra / pipeline OSS health checks ──
export { checkDifyHealth, checkTriggerDevHealth, checkSlidevGotenbergHealth, checkSupabaseStudioHealth, checkFFmpegHealth, checkFFCreatorHealth, checkMubengHealth, checkMorphicHealth, checkPerplexicaHealth, checkSkyvernHealth, checkSteelHealth } from "./oss-health-infra"

