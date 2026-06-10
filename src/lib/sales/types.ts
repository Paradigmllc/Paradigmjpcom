/**
 * lib/sales/types.ts — 営業 OS の型定義 (Sprint 8)
 *
 * 役割: sales_* 5 collection の TS 型を一元定義。
 *       lib/sales/companies.ts / customers.ts / 等の consumer がここから import。
 *
 * 設計原則:
 *   - enum 値は const tuple で literal type narrowing (Sprint 1 で確立した pattern)
 *   - DB の CHECK 制約と完全一致 (migration_003 と同じ値リスト)
 *   - Notion 側 property name と DB column 名の mapping は別ファイル (sync.ts) で持つ
 */

/* ───── enum tuples (DB CHECK と完全一致) ───── */

/** s10-5 国ドリブン永久ルール: region は DB 列で完全分離 */
export const REGIONS = ["jp", "global"] as const
export type Region = (typeof REGIONS)[number]

export const isValidRegion = (s: string): s is Region =>
  (REGIONS as readonly string[]).includes(s)

/** locale から region を 1 純関数で判定 (paradigm-blocks regionToLocale() と対称) */
export function localeToRegion(locale: string): Region {
  return locale === "ja" ? "jp" : "global"
}

export const INDUSTRIES = [
  "beauty_salon",
  "dental",
  "restaurant",
  "construction",
  "accounting",
  "retail",
  "cleaning",
  "consulting",
] as const
export type Industry = (typeof INDUSTRIES)[number]

export const ISSUE_CODES = [
  "speed_critical",
  "ua_残存",
  "ssl_expired",
  "wp_outdated",
  "no_ogp",
  "no_sns",
  "copyright_old",
] as const
export type IssueCode = (typeof ISSUE_CODES)[number]

export const SEVERITIES = ["critical", "warning", "info"] as const
export type Severity = (typeof SEVERITIES)[number]

export const PIPELINE_STATUSES = [
  "pending",
  "scanning",
  "report_ready",
  "sent",
  "manual_queue",
] as const
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number]

export const REPORT_LOCALES = [
  "ja",
  "en",
  "ko",
  "zh",
  "de",
  "fr",
  "es",
  "pt",
  "ru",
  "ar",
  "vi",
  "id",
] as const
export type ReportLocale = (typeof REPORT_LOCALES)[number]

export const TEMPLATE_VARIANTS = [
  "website_diagnostic",
  "meo",
  "security",
  "japan_entry",
  "video_subscription",
  "subsidy",
  "outreach",
  "dx_ai_package",
] as const
export type TemplateVariant = (typeof TEMPLATE_VARIANTS)[number]

export const DEAL_STAGES = [
  "未対応",
  "架電済",
  "商談中",
  "提案済",
  "成約",
  "失注",
] as const
export type DealStage = (typeof DEAL_STAGES)[number]

export const CONTRACT_STATUSES = [
  "トライアル",
  "継続中",
  "解約予告",
  "解約済",
] as const
export type ContractStatus = (typeof CONTRACT_STATUSES)[number]

export const HEALTH_LEVELS = ["🟢 良好", "🟡 要注意", "🔴 要対応"] as const
export type HealthLevel = (typeof HEALTH_LEVELS)[number]

export const SUBSIDY_STATUSES = [
  "未申請",
  "申請中",
  "採択済",
  "非対象",
] as const
export type SubsidyStatus = (typeof SUBSIDY_STATUSES)[number]

export const CONTRACT_PRODUCTS = [
  "Web制作",
  "MEO対策",
  "DX・AI導入",
  "動画サブスク",
  "Japan Entry",
] as const
export type ContractProduct = (typeof CONTRACT_PRODUCTS)[number]

export const DELIVERY_TYPES = [
  "動画(Remotion)",
  "動画(HyperFrames)",
  "Web制作",
  "MEOレポート",
  "提案資料",
] as const
export type DeliveryType = (typeof DELIVERY_TYPES)[number]

export const DELIVERY_STATUSES = [
  "未着手",
  "制作中",
  "レビュー待ち",
  "納品済",
] as const
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]

/* ───── Domain types ───── */

export interface SalesCompany {
  id: string
  region: Region // Sprint 16: jp / global 完全分離 (s10-5 国ドリブン永久ルール)
  slug: string | null
  name_key: string | null // 2026-05-20: 正規化企業名 (dedup 鍵・lib/sales/dedup.ts)
  report_locale?: ReportLocale | null
  target_country?: string | null
  template_variant?: TemplateVariant | null
  domain: string
  company_name: string
  industry: Industry | null
  prefecture: string | null
  pipeline_status: PipelineStatus
  deal_stage: DealStage
  pagespeed_mobile: number | null
  pagespeed_desktop: number | null
  detected_issues: IssueCode[]
  report_views: number
  is_hot_lead: boolean
  send_result: string | null
  sent_at: string | null
  report_url: string | null
  follow_up_date: string | null
  memo: string | null
  assigned_to: string | null
  notion_page_id: string | null
  source: string | null
  meta: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SalesCustomer {
  id: string
  region: Region // Sprint 16
  company_id: string | null
  customer_name: string
  contract_products: ContractProduct[]
  monthly_amount: number | null
  contract_start: string | null
  next_invoice_date: string | null
  contract_status: ContractStatus
  health: HealthLevel
  next_meeting: string | null
  subsidy_status: SubsidyStatus
  is_white_label: boolean
  wl_client_count: number
  assigned_to: string | null
  notion_page_id: string | null
  meta: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SalesDelivery {
  id: string
  region: Region // Sprint 16
  customer_id: string | null
  delivery_name: string
  delivery_type: DeliveryType | null
  status: DeliveryStatus
  due_date: string | null
  delivery_url: string | null
  r2_path: string | null
  created_by: string | null
  notion_page_id: string | null
  meta: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SalesTemplate {
  id: string
  region: Region // Sprint 16: jp / global 完全分離
  template_variant?: TemplateVariant | null
  report_locale?: ReportLocale | null
  target_country?: string | null
  template_name: string
  industry: Industry
  issue_code: IssueCode
  severity: Severity
  headline: string | null
  pain: string | null
  fear: string | null
  loss: string | null
  cta_text: string | null
  is_active: boolean
  notion_page_id: string | null
  last_synced: string | null
  created_at: string
  updated_at: string
}

export interface SalesSyncLog {
  id: string
  direction:
    | "supabase->notion"
    | "notion->supabase"
    | "supabase->twenty"
    | "twenty->supabase"
    | "supabase->directus"
    | "directus->supabase"
    | "supabase->keystatic"
    | "keystatic->supabase"
  entity_type: "company" | "customer" | "delivery" | "template"
  entity_id: string | null
  notion_page_id: string | null
  action:
    | "create"
    | "update"
    | "delete"
    | "karte_home_sync"
    | "opportunity_sync"
    | "external_studio_sync"
    | "external_studio_pull"
  status: "success" | "error" | "skipped"
  error_message: string | null
  payload: Record<string, unknown> | null
  created_at: string
}

/* ───── Type guards ───── */

export const isValidIndustry = (s: string): s is Industry =>
  (INDUSTRIES as readonly string[]).includes(s)

export const isValidIssueCode = (s: string): s is IssueCode =>
  (ISSUE_CODES as readonly string[]).includes(s)

export const isValidDealStage = (s: string): s is DealStage =>
  (DEAL_STAGES as readonly string[]).includes(s)

export const isValidPipelineStatus = (s: string): s is PipelineStatus =>
  (PIPELINE_STATUSES as readonly string[]).includes(s)

export const isValidReportLocale = (s: string): s is ReportLocale =>
  (REPORT_LOCALES as readonly string[]).includes(s)

export const isValidTemplateVariant = (s: string): s is TemplateVariant =>
  (TEMPLATE_VARIANTS as readonly string[]).includes(s)
