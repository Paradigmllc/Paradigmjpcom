import { checkSpiderFootHealth } from "./sources/spiderfoot-source"
import { checkKatanaHealth } from "./sources/katana-source"
import { checkMaigretHealth } from "./sources/maigret-source"
import { checkFlareSolverrHealth } from "./sources/flaresolverr-source"
import { envValue, missingEnv, notConfigured, normalizeHttpBase, safeFetch, healthError, recordValue } from "./oss-service-health"
import type { ServiceHealthResult } from "./oss-service-health"

export async function checkSpiderfootHealth(): Promise<ServiceHealthResult> {
  try {
    const result = await checkSpiderFootHealth()
    return { balanceStatus: "ok", balanceLabel: "Connected", ok: result.ok, name: "SpiderFoot", detail: result.detail, url: process.env.SPIDERFOOT_API_URL ?? "http://127.0.0.1:5001" }
  } catch (e) {
    console.error("[oss-service-health] SpiderFoot check failed:", e)
    return { balanceStatus: "error", balanceLabel: "Error", ok: false, name: "SpiderFoot", detail: String(e) }
  }
}

export async function checkKatanaServiceHealth(): Promise<ServiceHealthResult> {
  try {
    const result = await checkKatanaHealth()
    return { balanceStatus: "ok", balanceLabel: "Connected", ok: result.ok, name: "Katana", detail: result.detail, url: "http://localhost:5002" }
  } catch (e) {
    console.error("[oss-service-health] Katana check failed:", e)
    return { balanceStatus: "error", balanceLabel: "Error", ok: false, name: "Katana", detail: String(e) }
  }
}

export async function checkMaigretServiceHealth(): Promise<ServiceHealthResult> {
  try {
    const result = await checkMaigretHealth()
    return { balanceStatus: "ok", balanceLabel: "Connected", ok: result.ok, name: "Maigret", detail: result.detail, url: "http://localhost:5003" }
  } catch (e) {
    console.error("[oss-service-health] Maigret check failed:", e)
    return { balanceStatus: "error", balanceLabel: "Error", ok: false, name: "Maigret", detail: String(e) }
  }
}

export async function checkFlareSolverrServiceHealth(): Promise<ServiceHealthResult> {
  try {
    const result = await checkFlareSolverrHealth()
    return { balanceStatus: "ok", balanceLabel: "Connected", ok: result.ok, name: "FlareSolverr", detail: result.detail, url: process.env.FLARESOLVERR_API_URL ?? "http://127.0.0.1:8191" }
  } catch (e) {
    console.error("[oss-service-health] FlareSolverr check failed:", e)
    return { balanceStatus: "error", balanceLabel: "Error", ok: false, name: "FlareSolverr", detail: String(e) }
  }
}

export async function checkStagehandHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["STAGEHAND_URL", "STAGEHAND_API_KEY"])
  if (missing.length > 0) return notConfigured(missing)
  if ((envValue("STAGEHAND_URL") as string).includes("stagehand.paradigmjp.com")) return notConfigured(["STAGEHAND_URL"])

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
  const hasToken = envValue("DIRECTUS_TOKEN") !== null
  const hasAdminLogin = envValue("DIRECTUS_ADMIN_EMAIL") !== null && envValue("DIRECTUS_ADMIN_PASSWORD") !== null
  const missing = [
    ...missingEnv(["DIRECTUS_BASE_URL"]),
    ...(!hasToken && !hasAdminLogin ? ["DIRECTUS_TOKEN or DIRECTUS_ADMIN_EMAIL/PASSWORD"] : []),
  ]
  if (missing.length > 0) return notConfigured(missing)

  try {
    const base = normalizeHttpBase(envValue("DIRECTUS_BASE_URL") as string)
    const healthUrl = new URL(base)
    healthUrl.pathname = `${healthUrl.pathname}/server/health`.replace(/\/+/g, "/")
    const health = await safeFetch(healthUrl.toString(), { signal: AbortSignal.timeout(10_000) })
    if (!health.ok) return { balanceStatus: "error", balanceLabel: `health HTTP ${health.status}` }

    let accessToken = envValue("DIRECTUS_TOKEN")
    if (!accessToken) {
      const loginUrl = new URL(base)
      loginUrl.pathname = `${loginUrl.pathname}/auth/login`.replace(/\/+/g, "/")
      const login = await safeFetch(loginUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: envValue("DIRECTUS_ADMIN_EMAIL"),
          password: envValue("DIRECTUS_ADMIN_PASSWORD"),
        }),
        signal: AbortSignal.timeout(10_000),
      })
      if (!login.ok) return { balanceStatus: "error", balanceLabel: `admin login HTTP ${login.status}` }
      const data = recordValue(login.body, "data")
      const token = data && typeof data === "object" ? recordValue(data, "access_token") : null
      accessToken = typeof token === "string" ? token : null
      if (!accessToken) return { balanceStatus: "error", balanceLabel: "admin login did not return access token" }
    }

    const meUrl = new URL(base)
    meUrl.pathname = `${meUrl.pathname}/users/me`.replace(/\/+/g, "/")
    const me = await safeFetch(meUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
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
    if (res.status >= 400) return { balanceStatus: "error", balanceLabel: `HTTP ${res.status}` }
    if (res.status >= 300 && res.status < 400) return { balanceStatus: "ok", balanceLabel: `redirect HTTP ${res.status}` }
    return { balanceStatus: "ok", balanceLabel: `HTTP ${res.status}` }
  } catch (error) {
    return healthError("Keystatic", error)
  }
}
