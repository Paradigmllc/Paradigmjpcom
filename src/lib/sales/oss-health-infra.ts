import { execSync } from "node:child_process"
import { existsSync } from "node:fs"
import { DIFY_CLOUD_BASE_URL, DIFY_RUNTIME_KEY_ENV_NAMES, normalizeDifyCloudBaseUrl } from "./dify-cloud"
import { envValue, missingEnv, notConfigured, normalizeHttpBase, safeFetch, healthError, recordValue } from "./oss-service-health"
import type { ServiceHealthResult } from "./oss-service-health"

export async function checkDifyHealth(): Promise<ServiceHealthResult> {
  const apiKeyName = DIFY_RUNTIME_KEY_ENV_NAMES.find((name) => envValue(name))
  if (!apiKeyName) return notConfigured([...DIFY_RUNTIME_KEY_ENV_NAMES])
  try {
    const base = normalizeDifyCloudBaseUrl(
      envValue("DIFY_API_BASE") ??
        envValue("DIFY_API_URL") ??
        envValue("DIFY_BASE_URL"),
    )
    const url = new URL(base || DIFY_CLOUD_BASE_URL)
    url.pathname = `${url.pathname}/v1/parameters`.replace(/\/+/g, "/")
    const res = await safeFetch(url.toString(), {
      headers: { Authorization: `Bearer ${envValue(apiKeyName)}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return { balanceStatus: "error", balanceLabel: `Dify Cloud parameters HTTP ${res.status}` }
    const inputForm = recordValue(res.body, "user_input_form")
    return {
      balanceStatus: "ok",
      balanceLabel: `Dify Cloud API ok: ${Array.isArray(inputForm) ? inputForm.length : 0} inputs`,
    }
  } catch (error) {
    return healthError("Dify Cloud", error)
  }
}

export async function checkTriggerDevHealth(): Promise<ServiceHealthResult> {
  const secretKey = envValue("TRIGGER_SECRET_KEY") ?? envValue("TRIGGER_ACCESS_TOKEN") ?? envValue("TRIGGER_DEV_API_KEY")
  if (!secretKey) return notConfigured(["TRIGGER_SECRET_KEY or TRIGGER_ACCESS_TOKEN or TRIGGER_DEV_API_KEY"])
  try {
    const base = envValue("TRIGGER_API_URL") ?? "http://localhost:8030"
    const url = new URL(base)
    url.pathname = `${url.pathname}/api/v1/runs`.replace(/\/+/g, "/")
    url.searchParams.set("limit", "1")

    const res = await safeFetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return { balanceStatus: "error", balanceLabel: `Trigger.dev API HTTP ${res.status}` }
    return { balanceStatus: "ok", balanceLabel: "Trigger.dev runs API and secret key verified" }
  } catch (error) {
    return healthError("Trigger.dev", error)
  }
}

export async function checkSlidevGotenbergHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["SLIDEV_RENDER_URL", "GOTENBERG_URL"])
  if (missing.length > 0) return notConfigured(missing)
  try {
    const slidev = normalizeHttpBase(envValue("SLIDEV_RENDER_URL") as string)
    const gotenberg = normalizeHttpBase(envValue("GOTENBERG_URL") as string)
    slidev.pathname = `${slidev.pathname}/health`.replace(/\/+/g, "/")
    gotenberg.pathname = `${gotenberg.pathname}/health`.replace(/\/+/g, "/")
    const [resSlidev, resGotenberg] = await Promise.all([
      fetch(slidev.toString(), { signal: AbortSignal.timeout(10_000) }).catch(() => ({ ok: false, status: 0 } as Response)),
      fetch(gotenberg.toString(), { signal: AbortSignal.timeout(10_000) }).catch(() => ({ ok: false, status: 0 } as Response)),
    ])
    return {
      balanceStatus: (resSlidev.ok && resGotenberg.ok) ? "ok" : "error",
      balanceLabel: `slidev /health HTTP ${resSlidev.status}, gotenberg /health HTTP ${resGotenberg.status}`
    }
  } catch (error) {
    return healthError("Slidev/Gotenberg", error)
  }
}

export async function checkSupabaseStudioHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["NEXT_PUBLIC_SUPABASE_STUDIO_URL"])
  if (missing.length > 0) return notConfigured(missing)
  try {
    const res = await fetch(normalizeHttpBase(envValue("NEXT_PUBLIC_SUPABASE_STUDIO_URL") as string).toString(), { signal: AbortSignal.timeout(10_000) })
    return { balanceStatus: res.ok ? "ok" : "error", balanceLabel: `reachable HTTP ${res.status}` }
  } catch (error) {
    return healthError("Supabase Studio", error)
  }
}

export async function checkFFmpegHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["FFMPEG_BIN"])
  if (missing.length > 0) return notConfigured(missing)

  try {
    const bin = envValue("FFMPEG_BIN") as string
    if (!existsSync(bin)) return { balanceStatus: "error", balanceLabel: `FFMPEG_BIN path not found: ${bin}` }
    const stdout = execSync(`"${bin}" -version`, { timeout: 5_000, encoding: "utf8" })
    const versionLine = stdout.split("\n")[0] ?? ""
    return { balanceStatus: "ok", balanceLabel: versionLine.slice(0, 80) }
  } catch (error) {
    return healthError("FFmpeg", error)
  }
}

export async function checkFFCreatorHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["FFCREATOR_WORKER_URL"])
  if (missing.length > 0) return notConfigured(missing)
  try {
    const res = await fetch(normalizeHttpBase(envValue("FFCREATOR_WORKER_URL") as string).toString(), { signal: AbortSignal.timeout(10_000) })
    return { balanceStatus: res.ok ? "ok" : "error", balanceLabel: `reachable HTTP ${res.status}` }
  } catch (error) {
    return healthError("FFCreator", error)
  }
}

export async function checkMubengHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["MUBENG_PROXY_URL"])
  if (missing.length > 0) return notConfigured(missing)
  try {
    const url = normalizeHttpBase(envValue("MUBENG_PROXY_URL") as string)
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5_000) })
    if (res.status === 401) {
      return { balanceStatus: "ok", balanceLabel: "認証が必要 (応答あり)" }
    }
    return {
      balanceStatus: res.ok ? "ok" : "error",
      balanceLabel: res.ok ? "正常 (HTTP 200)" : `HTTP ${res.status}`,
    }
  } catch (error) {
    return healthError("mubeng", error)
  }
}

export async function checkMorphicHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["MORPHIC_BASE_URL"])
  if (missing.length > 0) return notConfigured(missing)
  try {
    const base = normalizeHttpBase(envValue("MORPHIC_BASE_URL") as string)
    const candidates = ["/api/health", "/health"]
    let lastStatus: number | null = null
    for (const path of candidates) {
      const url = new URL(base)
      url.pathname = `${url.pathname}${path}`.replace(/\/+/g, "/")
      try {
        const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) })
        lastStatus = res.status
        if (res.ok) return { balanceStatus: "ok", balanceLabel: `health endpoint ok: ${path}` }
      } catch {
        continue
      }
    }
    return { balanceStatus: lastStatus ? "error" : "error", balanceLabel: `health unreachable HTTP ${lastStatus ?? "unknown"}` }
  } catch (error) {
    return healthError("Morphic", error)
  }
}

export async function checkPerplexicaHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["PERPLEXICA_BASE_URL"])
  if (missing.length > 0) return notConfigured(missing)
  try {
    const base = normalizeHttpBase(envValue("PERPLEXICA_BASE_URL") as string)
    const candidates = ["/api/health", "/health"]
    let lastStatus: number | null = null
    for (const path of candidates) {
      const url = new URL(base)
      url.pathname = `${url.pathname}${path}`.replace(/\/+/g, "/")
      try {
        const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) })
        lastStatus = res.status
        if (res.ok) return { balanceStatus: "ok", balanceLabel: `health endpoint ok: ${path}` }
      } catch {
        continue
      }
    }
    return { balanceStatus: lastStatus ? "error" : "error", balanceLabel: `health unreachable HTTP ${lastStatus ?? "unknown"}` }
  } catch (error) {
    return healthError("Perplexica", error)
  }
}

export async function checkSkyvernHealth(): Promise<ServiceHealthResult> {
  const missing = missingEnv(["SKYVERN_BASE_URL"])
  if (missing.length > 0) return notConfigured(missing)
  try {
    const base = normalizeHttpBase(envValue("SKYVERN_BASE_URL") as string)
    const apiKey = envValue("SKYVERN_API_KEY")
    const headers: Record<string, string> = {}
    if (apiKey) headers["x-api-key"] = apiKey
    const url = new URL(base)
    url.pathname = `${url.pathname}/api/v1/health`.replace(/\/+/g, "/")
    const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) })
    return { balanceStatus: res.ok ? "ok" : "error", balanceLabel: `health endpoint HTTP ${res.status}` }
  } catch (error) {
    return healthError("Skyvern", error)
  }
}
