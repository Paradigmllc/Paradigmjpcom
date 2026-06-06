import { getServiceSalesSupabase } from "@/lib/supabase"
import {
  checkBrowserlessHealth as checkBrowserlessServiceHealth,
  checkChatwootHealth,
  checkComfyUiHealth,
  checkDirectusHealth,
  checkHyperFramesHealth,
  checkKeystaticHealth,
  checkLiveKitHealth,
  checkOpenMontageHealth,
  checkR2DeliveryHealth,
  checkStagehandHealth as checkStagehandServiceHealth,
  checkVastHealth,
  checkAstroHealth,
  checkCalcomHealth,
  checkCrawl4AiHealth,
  checkCrawleeHealth,
  checkPlaywrightStealthHealth,
  checkDifyHealth,
  checkTriggerDevHealth,
  checkSlidevGotenbergHealth,
  checkSupabaseStudioHealth,
  checkFFmpegHealth,
  checkFFCreatorHealth,
} from "./oss-service-health"

import type {
  SalesIntegrationDefinition,
  SalesIntegrationStatus,
  SalesIntegrationStatusKind,
  IntegrationStatusOptions,
} from "./integration-registry-types"

import { INTEGRATION_REGISTRY as REGISTRY } from "./integration-definitions"

export * from "./integration-registry-types"

function envValue(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

function configuredEnv(names: string[]): string[] {
  return names.filter((name) => envValue(name))
}

function missingEnv(names: string[]): string[] {
  return names.filter((name) => !envValue(name))
}

function statusFor(def: SalesIntegrationDefinition): SalesIntegrationStatusKind {
  if (def.requiredAnyEnv && def.requiredAnyEnv.length > 0) {
    const hasAny = configuredEnv(def.requiredAnyEnv).length > 0
    const missingRequired = missingEnv(def.requiredEnv)
    if (hasAny && missingRequired.length === 0) return "ready"
    if (hasAny || missingRequired.length < def.requiredEnv.length) return "partial"
    return "missing"
  }
  if (def.requiredEnv.length === 0) {
    return configuredEnv(def.optionalEnv ?? []).length > 0 ? "ready" : def.recommended ? "optional" : "manual"
  }
  const missing = missingEnv(def.requiredEnv)
  if (missing.length === 0) return "ready"
  if (missing.length < def.requiredEnv.length) return "partial"
  return "missing"
}

function defaultBalance(def: SalesIntegrationDefinition, status: SalesIntegrationStatusKind): Pick<SalesIntegrationStatus, "balanceStatus" | "balanceLabel"> {
  if (def.balance === "none") return { balanceStatus: "not_applicable", balanceLabel: "残量チェック不要" }
  if (status === "missing" || status === "partial") return { balanceStatus: "not_configured", balanceLabel: "APIキー未設定" }
  if (def.balance === "manual") return { balanceStatus: "manual", balanceLabel: "管理画面で確認" }
  return { balanceStatus: "checkable", balanceLabel: "liveチェック可能" }
}

function summarizeObjectNumbers(value: unknown, keys: string[] = []): string | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  for (const key of keys) {
    const found = record[key]
    if (typeof found === "number") return `${key}: ${found}`
    if (typeof found === "string" && found.trim().length > 0) return `${key}: ${found}`
  }
  for (const item of Object.values(record)) {
    const nested = summarizeObjectNumbers(item, keys)
    if (nested) return nested
  }
  return null
}

async function checkDataForSeoBalance(): Promise<Pick<SalesIntegrationStatus, "balanceStatus" | "balanceLabel">> {
  const login = envValue("DATAFORSEO_LOGIN")
  const password = envValue("DATAFORSEO_PASSWORD")
  if (!login || !password) return { balanceStatus: "not_configured", balanceLabel: "DATAFORSEO_LOGIN/PASSWORD未設定" }
  try {
    const auth = Buffer.from(`${login}:${password}`).toString("base64")
    const res = await fetch("https://api.dataforseo.com/v3/appendix/user_data", {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(8_000),
    })
    const body = (await res.json()) as unknown
    if (!res.ok) return { balanceStatus: "error", balanceLabel: `HTTP ${res.status}` }
    const label = summarizeObjectNumbers(body, ["money", "balance", "cost", "spent", "total"])
    return { balanceStatus: "ok", balanceLabel: label ?? "user_data取得済み" }
  } catch (error) {
    console.error("[integration-registry] DataForSEO balance check failed:", error)
    return { balanceStatus: "error", balanceLabel: error instanceof Error ? error.message : "DataForSEO check failed" }
  }
}

async function checkBrowserlessPressure(): Promise<Pick<SalesIntegrationStatus, "balanceStatus" | "balanceLabel">> {
  const rawUrl = envValue("BROWSERLESS_URL")
  if (!rawUrl) return { balanceStatus: "not_configured", balanceLabel: "BROWSERLESS_URL未設定" }
  try {
    const url = new URL(rawUrl)
    const token = envValue("BROWSERLESS_TOKEN") ?? url.searchParams.get("token")
    url.pathname = "/pressure"
    if (token) url.searchParams.set("token", token)
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8_000) })
    const body = (await res.json()) as { isAvailable?: boolean; running?: number; maxConcurrent?: number; queued?: number; reason?: string }
    if (!res.ok) return { balanceStatus: "error", balanceLabel: `HTTP ${res.status}` }
    return {
      balanceStatus: body.isAvailable === false ? "error" : "ok",
      balanceLabel: `running ${body.running ?? "-"} / ${body.maxConcurrent ?? "-"}, queued ${body.queued ?? 0}${body.reason ? `, ${body.reason}` : ""}`,
    }
  } catch (error) {
    console.error("[integration-registry] Browserless pressure check failed:", error)
    return { balanceStatus: "error", balanceLabel: error instanceof Error ? error.message : "Browserless check failed" }
  }
}

async function checkStagehandHealth(): Promise<Pick<SalesIntegrationStatus, "balanceStatus" | "balanceLabel">> {
  const urlStr = envValue("STAGEHAND_URL")
  if (!urlStr) return { balanceStatus: "not_configured", balanceLabel: "STAGEHAND_URL未設定" }
  try {
    const url = new URL(urlStr)
    url.pathname = "/health"
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5_000) })
    if (!res.ok) return { balanceStatus: "error", balanceLabel: `HTTP ${res.status}` }
    const body = await res.json().catch(() => ({})) as { status?: string; ok?: boolean }
    return {
      balanceStatus: "ok",
      balanceLabel: body.status === "healthy" || body.ok === true ? "正常 (healthy)" : "応答あり",
    }
  } catch (error) {
    console.error("[integration-registry] Stagehand health check failed:", error)
    return { balanceStatus: "error", balanceLabel: error instanceof Error ? error.message : "接続不可" }
  }
}

async function checkMubengHealth(): Promise<Pick<SalesIntegrationStatus, "balanceStatus" | "balanceLabel">> {
  const urlStr = envValue("MUBENG_PROXY_URL")
  if (!urlStr) return { balanceStatus: "not_configured", balanceLabel: "MUBENG_PROXY_URL未設定" }
  try {
    const url = new URL(urlStr)
    // Try pinging the base url
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5_000) })
    if (res.status === 401) {
      return { balanceStatus: "ok", balanceLabel: "認証が必要 (応答あり)" }
    }
    return {
      balanceStatus: res.ok ? "ok" : "error",
      balanceLabel: res.ok ? "正常 (HTTP 200)" : `HTTP ${res.status}`,
    }
  } catch (error) {
    console.error("[integration-registry] mubeng health check failed:", error)
    return { balanceStatus: "error", balanceLabel: error instanceof Error ? error.message : "接続不可" }
  }
}

async function liveBalance(def: SalesIntegrationDefinition): Promise<Pick<SalesIntegrationStatus, "balanceStatus" | "balanceLabel"> | null> {
  if (def.balance === "dataforseo_user_data") return checkDataForSeoBalance()
  if (def.balance === "browserless_pressure") return checkBrowserlessServiceHealth()
  if (def.balance === "stagehand_health") return checkStagehandServiceHealth()
  if (def.balance === "mubeng_health") return checkMubengHealth()
  if (def.balance === "chatwoot_health") return checkChatwootHealth()
  if (def.balance === "directus_health") return checkDirectusHealth()
  if (def.balance === "keystatic_health") return checkKeystaticHealth()
  if (def.balance === "livekit_health") return checkLiveKitHealth()
  if (def.balance === "hyperframes_health") return checkHyperFramesHealth()
  if (def.balance === "openmontage_health") return checkOpenMontageHealth()
  if (def.balance === "comfyui_health") return checkComfyUiHealth()
  if (def.balance === "r2_health") return checkR2DeliveryHealth()
  if (def.balance === "vast_health") return checkVastHealth()
  if (def.balance === "astro_health") return checkAstroHealth()
  if (def.balance === "calcom_health") return checkCalcomHealth()
  if (def.balance === "crawl4ai_health") return checkCrawl4AiHealth()
  if (def.balance === "crawlee_health") return checkCrawleeHealth()
  if (def.balance === "playwright_stealth_health") return checkPlaywrightStealthHealth()
  if (def.balance === "dify_health") return checkDifyHealth()
  if (def.balance === "trigger_dev_health") return checkTriggerDevHealth()
  if (def.balance === "slidev_gotenberg_health") return checkSlidevGotenbergHealth()
  if (def.balance === "supabase_studio_health") return checkSupabaseStudioHealth()
  if (def.balance === "ffmpeg_health") return checkFFmpegHealth()
  if (def.balance === "ffcreator_health") return checkFFCreatorHealth()
  return null
}

export function getSalesIntegrationDefinitions(): SalesIntegrationDefinition[] {
  return REGISTRY
}

export async function getSalesIntegrationStatus(
  options: IntegrationStatusOptions = {},
): Promise<SalesIntegrationStatus[]> {
  const checkedAt = new Date().toISOString()
  const rows: SalesIntegrationStatus[] = []
  for (const def of REGISTRY) {
    const envStatus = statusFor(def)
    const defaults = defaultBalance(def, envStatus)
    const live = options.liveBalance ? await liveBalance(def) : null
    const status =
      live && envStatus === "ready" && (live.balanceStatus === "error" || live.balanceStatus === "not_configured")
        ? "partial"
        : envStatus
    const configuredRequiredEnv = [
      ...configuredEnv(def.requiredEnv),
      ...configuredEnv(def.requiredAnyEnv ?? []),
    ]
    const requiredMissingEnv = [
      ...missingEnv(def.requiredEnv),
      ...(def.requiredAnyEnv && configuredEnv(def.requiredAnyEnv).length === 0 ? def.requiredAnyEnv : []),
    ]
    rows.push({
      slug: def.slug,
      displayName: def.displayName,
      category: def.category,
      deployment: def.deployment,
      role: def.role,
      status,
      configuredEnv: configuredRequiredEnv,
      missingEnv: requiredMissingEnv,
      optionalMissingEnv: missingEnv(def.optionalEnv ?? []),
      balanceStatus: live?.balanceStatus ?? defaults.balanceStatus,
      balanceLabel: live?.balanceLabel ?? defaults.balanceLabel,
      docsUrl: def.docsUrl,
      recommended: def.recommended,
      notes: def.notes,
      checkedAt,
    })
  }
  return rows
}

export async function saveSalesIntegrationStatus(rows: SalesIntegrationStatus[]): Promise<void> {
  const sb = getServiceSalesSupabase()
  if (!sb || rows.length === 0) return
  const { error } = await sb.from("sales_integration_status").upsert(
    rows.map((row) => ({
      slug: row.slug,
      display_name: row.displayName,
      category: row.category,
      deployment: row.deployment,
      status: row.status,
      configured_env: row.configuredEnv,
      missing_env: row.missingEnv,
      optional_missing_env: row.optionalMissingEnv,
      balance_status: row.balanceStatus,
      balance_label: row.balanceLabel,
      docs_url: row.docsUrl ?? null,
      recommended: row.recommended,
      notes: row.notes,
      checked_at: row.checkedAt,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "slug" },
  )
  if (error && !/schema cache|relation .* does not exist/i.test(error.message)) {
    console.error("[integration-registry] status snapshot upsert failed:", error.message)
  }
}
