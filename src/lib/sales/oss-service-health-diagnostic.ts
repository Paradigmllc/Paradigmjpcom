/**
 * Diagnostic API health checks — PageSpeed, Google Places, SimilarWeb, etc.
 * Extracted from oss-service-health.ts to keep file under 500 lines.
 */

import { envValue, missingEnv, normalizeHttpBase, notConfigured, healthError } from "./oss-service-health"
import type { ServiceHealthResult } from "./oss-service-health"

// ───── Diagnostic API health checks ─────

export async function checkPageSpeedHealth(): Promise<ServiceHealthResult> {
  const apiKey = envValue("GOOGLE_PSI_API_KEY")
  if (!apiKey) return { balanceStatus: "ok", balanceLabel: "no API key (using public quota)" }

  try {
    const url = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed")
    url.searchParams.set("url", "https://example.com")
    url.searchParams.set("key", apiKey)
    url.searchParams.set("strategy", "mobile")
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return { balanceStatus: "error", balanceLabel: `PageSpeed API HTTP ${res.status}` }
    const body = await res.json().catch((e) => { console.warn("[oss-health] PageSpeed response parse failed:", e); return {} }) as { lighthouseResult?: { categories?: { performance?: { score?: number } } } }
    const score = body.lighthouseResult?.categories?.performance?.score
    return { balanceStatus: "ok", balanceLabel: score != null ? `API verified (perf score: ${score})` : "API verified (key valid)" }
  } catch (error) {
    return healthError("PageSpeed", error)
  }
}

export async function checkGooglePlacesHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["GOOGLE_PLACES_API_KEY"])
  if (missing.length > 0) return notConfigured(missing)

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json")
    url.searchParams.set("input", "Tokyo Station")
    url.searchParams.set("inputtype", "textquery")
    url.searchParams.set("fields", "place_id")
    url.searchParams.set("key", envValue("GOOGLE_PLACES_API_KEY") as string)
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return { balanceStatus: "error", balanceLabel: `Google Places HTTP ${res.status}` }
    const body = await res.json().catch((e) => { console.warn("[oss-health] Google Places response parse failed:", e); return {} }) as { status?: string; candidates?: unknown[] }
    if (body.status === "REQUEST_DENIED") return { balanceStatus: "error", balanceLabel: "API key denied or billing disabled" }
    if (body.status === "INVALID_REQUEST") return { balanceStatus: "error", balanceLabel: "API key invalid" }
    return { balanceStatus: "ok", balanceLabel: `API verified (status: ${body.status ?? "ok"})` }
  } catch (error) {
    return healthError("Google Places", error)
  }
}

export async function checkSimilarWebHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["SIMILARWEB_API_KEY"])
  if (missing.length > 0) return notConfigured(missing)

  try {
    const res = await fetch("https://api.similarweb.com/v1/website/example.com/total-traffic-and-engagement/visits?api_key=" + envValue("SIMILARWEB_API_KEY"), {
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return { balanceStatus: "error", balanceLabel: `SimilarWeb HTTP ${res.status}` }
    return { balanceStatus: "ok", balanceLabel: "API key verified" }
  } catch (error) {
    return healthError("SimilarWeb", error)
  }
}

export async function checkGbizinfoHealth(): Promise<ServiceHealthResult> {
  const apiKey = envValue("GBIZ_API_TOKEN")
  if (!apiKey) return { balanceStatus: "ok", balanceLabel: "no API key (unauthenticated OK)" }

  try {
    const res = await fetch(`https://info.gbiz.go.jp/hojin/v1/hojin?corporate_number=2000020125001`, {
      headers: { "X-Hojin-Api-Key": apiKey },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return { balanceStatus: "error", balanceLabel: `gBizInfo HTTP ${res.status}` }
    return { balanceStatus: "ok", balanceLabel: "API key verified" }
  } catch (error) {
    return healthError("gBizInfo", error)
  }
}

export async function checkDataForSeoHealth(): Promise<ServiceHealthResult> {
  const login = envValue("DATAFORSEO_LOGIN")
  const password = envValue("DATAFORSEO_PASSWORD")
  if (!login || !password) return notConfigured(["DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD"])

  try {
    const auth = Buffer.from(`${login}:${password}`).toString("base64")
    const res = await fetch("https://api.dataforseo.com/v3/appendix/user_data", {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(8_000),
    })
    const body = (await res.json()) as unknown
    if (!res.ok) return { balanceStatus: "error", balanceLabel: `DataForSEO HTTP ${res.status}` }
    const money = body && typeof body === "object" && "tasks" in body
      ? (body as { tasks?: Array<{ result?: Array<{ money?: number; balance?: number }> }> }).tasks?.[0]?.result?.[0]
      : null
    const label = money ? `balance: ${money.balance ?? money.money ?? "N/A"}` : "user_data verified"
    return { balanceStatus: "ok", balanceLabel: label }
  } catch (error) {
    return healthError("DataForSEO", error)
  }
}

export async function checkSearxngHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["SEARXNG_BASE_URL"])
  if (missing.length > 0) return notConfigured(missing)

  try {
    const base = normalizeHttpBase(envValue("SEARXNG_BASE_URL") as string)
    base.pathname = `${base.pathname}/search`.replace(/\/+/g, "/")
    base.searchParams.set("q", "test")
    base.searchParams.set("format", "json")
    const res = await fetch(base.toString(), { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return { balanceStatus: "error", balanceLabel: `SearxNG HTTP ${res.status}` }
    const body = await res.json().catch((e) => { console.warn("[oss-health] SearXNG response parse failed:", e); return {} }) as { results?: unknown[] }
    return {
      balanceStatus: "ok",
      balanceLabel: `JSON search verified: ${Array.isArray(body.results) ? body.results.length : 0} results`,
    }
  } catch (error) {
    return healthError("SearxNG", error)
  }
}

export async function checkApolloHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["APOLLO_API_KEY"])
  if (missing.length > 0) return notConfigured(missing)

  try {
    const res = await fetch("https://api.apollo.io/v1/auth/health", {
      headers: { "X-Api-Key": envValue("APOLLO_API_KEY") as string },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return { balanceStatus: "error", balanceLabel: `Apollo HTTP ${res.status}` }
    return { balanceStatus: "ok", balanceLabel: "API key verified" }
  } catch (error) {
    return healthError("Apollo.io", error)
  }
}
