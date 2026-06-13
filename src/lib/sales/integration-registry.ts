import { getServiceSalesSupabase } from "@/lib/supabase"
import {
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
  checkSpiderfootHealth,
  checkKatanaServiceHealth,
  checkMaigretServiceHealth,
  checkFlareSolverrServiceHealth,
  checkTriggerDevHealth,
  checkSlidevGotenbergHealth,
  checkSupabaseStudioHealth,
  checkFFmpegHealth,
  checkFFCreatorHealth,
  checkMubengHealth,
  checkMorphicHealth,
  checkPerplexicaHealth,
  checkSkyvernHealth,
  checkSteelHealth,
} from "./oss-service-health"
import {
  checkApolloHealth,
  checkDataForSeoHealth,
  checkGbizinfoHealth,
  checkGooglePlacesHealth,
  checkPageSpeedHealth,
  checkSearxngHealth,
  checkSimilarWebHealth,
} from "./oss-service-health-diagnostic"

import type {
  SalesIntegrationDefinition,
  SalesIntegrationStatus,
  SalesIntegrationStatusKind,
  IntegrationStatusOptions,
} from "./integration-registry-types"

import { INTEGRATION_REGISTRY as REGISTRY } from "./integration-definitions"
import { DB_TABLES } from "@/lib/sales/db-tables"

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

async function liveBalance(def: SalesIntegrationDefinition): Promise<Pick<SalesIntegrationStatus, "balanceStatus" | "balanceLabel"> | null> {
  if (def.balance === "dataforseo_user_data") return checkDataForSeoHealth()
  if (def.balance === "stagehand_health") return checkStagehandServiceHealth()
  if (def.balance === "steel_health") return checkSteelHealth()
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
  if (def.balance === "spiderfoot_health") return checkSpiderfootHealth()
  if (def.balance === "katana_health") return checkKatanaServiceHealth()
  if (def.balance === "maigret_health") return checkMaigretServiceHealth()
  if (def.balance === "flaresolverr_health") return checkFlareSolverrServiceHealth()
  if (def.balance === "morphic_health") return checkMorphicHealth()
  if (def.balance === "perplexica_health") return checkPerplexicaHealth()
  if (def.balance === "skyvern_health") return checkSkyvernHealth()
  if (def.balance === "pagespeed_health") return checkPageSpeedHealth()
  if (def.balance === "google_places_health") return checkGooglePlacesHealth()
  if (def.balance === "similarweb_health") return checkSimilarWebHealth()
  if (def.balance === "gbizinfo_health") return checkGbizinfoHealth()
  if (def.balance === "searxng_health") return checkSearxngHealth()
  if (def.balance === "apollo_health") return checkApolloHealth()
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
  const { error } = await sb.from(DB_TABLES.SALES_INTEGRATION_STATUS).upsert(
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
  if (error) {
    console.error("[integration-registry] status snapshot upsert failed:", error.message, error.code ? `(code: ${error.code})` : "")
  }
}
