/**
 * lib/sales/integration-registry-types.ts — 統合レジストリの型定義
 *
 * integration-registry.ts から分離 (C-1 対応)。
 * ファイル行数上限 500 行を遵守するための構造分割。
 */

export type SalesIntegrationCategory =
  | "orchestration"
  | "list_source"
  | "analysis"
  | "asset_generation"
  | "video"
  | "demo_site"
  | "outreach"
  | "proxy"
  | "crm_ops"

export type SalesIntegrationDeployment = "cloud" | "oss" | "api" | "local" | "manual"
export type SalesIntegrationStatusKind = "ready" | "missing" | "partial" | "manual" | "optional"
export type SalesIntegrationBalanceStatus = "not_applicable" | "not_configured" | "manual" | "checkable" | "ok" | "error"

export type SalesIntegrationBalanceType =
  | "none"
  | "manual"
  | "dataforseo_user_data"
  | "browserless_pressure"
  | "stagehand_health"
  | "mubeng_health"
  | "chatwoot_health"
  | "directus_health"
  | "keystatic_health"
  | "livekit_health"
  | "hyperframes_health"
  | "openmontage_health"
  | "comfyui_health"
  | "r2_health"
  | "vast_health"
  | "astro_health"
  | "calcom_health"
  | "crawl4ai_health"
  | "crawlee_health"
  | "playwright_stealth_health"
  | "dify_health"
  | "trigger_dev_health"
  | "slidev_gotenberg_health"
  | "supabase_studio_health"
  | "ffmpeg_health"
  | "ffcreator_health"
  | "pagespeed_health"
  | "google_places_health"
  | "similarweb_health"
  | "gbizinfo_health"
  | "searxng_health"
  | "apollo_health"
  | "spiderfoot_health"
  | "katana_health"
  | "maigret_health"
  | "flaresolverr_health"
  | "morphic_health"
  | "perplexica_health"
  | "skyvern_health"

export interface SalesIntegrationDefinition {
  slug: string
  displayName: string
  category: SalesIntegrationCategory
  deployment: SalesIntegrationDeployment
  role: string
  requiredEnv: string[]
  requiredAnyEnv?: string[]
  optionalEnv?: string[]
  balance: SalesIntegrationBalanceType
  docsUrl?: string
  recommended: boolean
  notes: string
}

export interface SalesIntegrationStatus {
  slug: string
  displayName: string
  category: SalesIntegrationCategory
  deployment: SalesIntegrationDeployment
  role: string
  status: SalesIntegrationStatusKind
  configuredEnv: string[]
  missingEnv: string[]
  optionalMissingEnv: string[]
  balanceStatus: SalesIntegrationBalanceStatus
  balanceLabel: string
  docsUrl?: string
  recommended: boolean
  notes: string
  checkedAt: string
}

export interface IntegrationStatusOptions {
  liveBalance?: boolean
}
