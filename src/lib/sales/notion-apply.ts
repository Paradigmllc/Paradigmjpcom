/**
 * lib/sales/notion-apply.ts — Notion 1 ページ → Supabase 即時反映 (Webhook 用)
 *
 * 役割: Notion Webhook が「このページが変わった」と通知してきた時、
 *       entity (page) を取得 → 親 DB から対象テーブルを判定 →
 *       人間が編集する全フィールドを Supabase に書き戻す。
 *
 * 設計原則 (s10-7 / s10-5 / A-CONTENT 準拠):
 *   1. **識別子ロック (サーバー側強制)**: id / region / domain / slug / name_key /
 *      notion_page_id / created_at と「システム計測値」(pagespeed / report_views /
 *      is_hot_lead 等) は Notion から書き戻さない。GUI でうっかり触っても無視される。
 *   2. **全フィールド編集可**: 上記以外の "人間が管理するフィールド" は全部反映。
 *   3. **region 完全分離**: 親 DB id で jp / global を判定し region scope で update。
 *   4. **全操作を sales_sync_logs に記録** (audit / RTBF)。
 *   5. 新規リード (Notion で行追加) は domain があれば作成 + enrich 発火 →
 *      Notion を「リード追加の入口」にできる。
 *
 * 2026-05-21 新規 (Notion 即時 GUI 化 / 旧 5min cron を Webhook 駆動へ)。
 */

import { getServiceSalesSupabase } from "@/lib/supabase"
import { notionGetPage, extractProperty } from "@/lib/notion"
import {
  upsertCompanyByDomain,
  setNotionPageId,
  findExistingCompany,
} from "./companies"
import { enrichFromContact } from "./enrich"
import { normalizeDomain, normalizeCompanyName } from "./dedup"
import {
  buildCompanySlug,
  buildReportUrl,
  normalizeReportLocale,
  normalizeTargetCountry,
  normalizeTemplateVariant,
} from "./routing"
import {
  isValidDealStage,
  isValidIndustry,
  isValidIssueCode,
  type Region,
} from "./types"
import { DB_TABLES } from "@/lib/sales/db-tables"

/* ───── 親 DB id → (entity, region) 振り分けマップ ───── */

type Entity = "company" | "customer" | "delivery" | "template"

/** Notion が返す dashed UUID を正規化 (dash 除去 + 小文字) してマッチング鍵にする */
function normId(id: string): string {
  return id.replace(/-/g, "").toLowerCase()
}

/** 既知 DB id (env override 優先・fallback は親ページ実 id)。global テンプレは env のみ */
function dbEntries(): Array<[string | undefined, Entity, Region]> {
  const E = process.env
  return [
    [E.NOTION_DB_COMPANIES_JP ?? "8cbab1f501144f83872c1738ce3e79c4", "company", "jp"],
    [E.NOTION_DB_COMPANIES_GLOBAL ?? "35fa2b78f3fc8107aa0bf28694e1009c", "company", "global"],
    [E.NOTION_DB_CUSTOMERS_JP ?? "86b1d93e3b854862ae7b2750d2585677", "customer", "jp"],
    [E.NOTION_DB_CUSTOMERS_GLOBAL ?? "35fa2b78f3fc81aab57ffcc729431181", "customer", "global"],
    [E.NOTION_DB_DELIVERIES_JP ?? "b3cbef9dd96f4e5bbbecc404c703a298", "delivery", "jp"],
    [E.NOTION_DB_DELIVERIES_GLOBAL ?? "35fa2b78f3fc81e2a5c3d7b9b9d7f5a9", "delivery", "global"],
    [E.NOTION_DB_TEMPLATES_JP ?? "115e2b0e79424bb0813fc05402096f95", "template", "jp"],
    [E.NOTION_DB_TEMPLATES_GLOBAL, "template", "global"],
  ]
}

function buildDbMap(): Map<string, { entity: Entity; region: Region }> {
  const map = new Map<string, { entity: Entity; region: Region }>()
  for (const [id, entity, region] of dbEntries()) {
    if (id) map.set(normId(id), { entity, region })
  }
  return map
}

/** entity + region → Notion DB id (S→N 押し出しで会社/顧客/納品 DB を引く) */
export function resolveNotionDbId(entity: Entity, region: Region): string | null {
  for (const [id, e, r] of dbEntries()) {
    if (e === entity && r === region && id) return id
  }
  return null
}

/* ───── audit log ───── */

async function recordSyncLog(entry: {
  entity_type: Entity
  notion_page_id: string
  action: "create" | "update"
  status: "success" | "error" | "skipped"
  error_message?: string | null
  payload?: Record<string, unknown> | null
}): Promise<void> {
  const sb = getServiceSalesSupabase()
  if (!sb) return
  await sb.from(DB_TABLES.SALES_SYNC_LOGS).insert({
    direction: "notion->supabase",
    entity_type: entry.entity_type,
    entity_id: null,
    notion_page_id: entry.notion_page_id,
    action: entry.action,
    status: entry.status,
    error_message: entry.error_message ?? null,
    payload: entry.payload ?? null,
  })
}

export interface ApplyResult {
  ok: boolean
  entity?: Entity
  action?: "create" | "update" | "skipped"
  error?: string
}

/* ───── エントリポイント: page id → 対象テーブルへ反映 ───── */

/**
 * Webhook で受け取った page id を実体取得し、親 DB に応じて Supabase へ反映する。
 * @returns どの entity をどう処理したか
 */
export async function routeNotionPage(pageId: string): Promise<ApplyResult> {
  const page = await notionGetPage(pageId)
  if (!page.ok || !page.data) {
    return { ok: false, error: `Notion page fetch failed: ${page.error}` }
  }
  // archive / trash は反映しない (削除は別フロー)
  if (page.data.archived || page.data.in_trash) {
    return { ok: true, action: "skipped" }
  }
  const dbId = page.data.parent?.database_id
  if (!dbId) {
    // data source / page parent 等 (営業 OS 管理外) は無視
    return { ok: true, action: "skipped" }
  }
  const target = buildDbMap().get(normId(dbId))
  if (!target) {
    // 監視対象外の DB (営業 OS 4 テーブル以外) は無視
    return { ok: true, action: "skipped" }
  }
  const props = page.data.properties
  switch (target.entity) {
    case "company":
      return applyCompany(pageId, props, target.region)
    case "customer":
      return applyCustomer(pageId, props, target.region)
    case "delivery":
      return applyDelivery(pageId, props, target.region)
    case "template":
      return applyTemplate(pageId, props, target.region)
  }
}

/* ───── company (リード) ───── */

async function applyCompany(
  pageId: string,
  props: Record<string, unknown>,
  region: Region,
): Promise<ApplyResult> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, error: "Supabase not configured" }

  const name =
    (extractProperty(props, "企業名") as string | null) ||
    (extractProperty(props, "会社名") as string | null) ||
    (extractProperty(props, "Company") as string | null) ||
    (extractProperty(props, "Name") as string | null)
  const domain = normalizeDomain(
    (extractProperty(props, "ドメイン") as string | null) ||
      (extractProperty(props, "Website") as string | null) ||
      (extractProperty(props, "Domain") as string | null) ||
      (extractProperty(props, "URL") as string | null),
  )
  const dealStageRaw = extractProperty(props, "商談ステージ") || extractProperty(props, "Deal Stage")
  const memo = extractProperty(props, "メモ") || extractProperty(props, "Notes")
  const followUp = extractProperty(props, "フォローアップ日") || extractProperty(props, "Follow-up Date")
  const industryRaw = extractProperty(props, "業種") || extractProperty(props, "Industry")
  const prefecture = extractProperty(props, "都道府県") || extractProperty(props, "Country")
  const assignedTo = extractProperty(props, "担当者") || extractProperty(props, "Assignee")
  const reportLocale = normalizeReportLocale(
    extractProperty(props, "表示言語") || extractProperty(props, "Report Locale"),
    region,
  )
  const targetCountry = normalizeTargetCountry(
    extractProperty(props, "対象国") || extractProperty(props, "Target Country"),
    reportLocale,
  )
  const templateVariant = normalizeTemplateVariant(
    extractProperty(props, "テンプレ種別") || extractProperty(props, "Template Variant"),
  )
  const slug = extractProperty(props, "slug (URL)") || extractProperty(props, "Slug")

  // 編集可フィールドのみ build (識別子・システム計測値は触らない)
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof name === "string" && name) update.company_name = name
  if (typeof dealStageRaw === "string" && isValidDealStage(dealStageRaw)) update.deal_stage = dealStageRaw
  if (typeof memo === "string") update.memo = memo
  if (typeof followUp === "string" || followUp === null) update.follow_up_date = followUp
  if (typeof industryRaw === "string" && isValidIndustry(industryRaw)) update.industry = industryRaw
  if (typeof prefecture === "string") update.prefecture = prefecture
  if (typeof assignedTo === "string") update.assigned_to = assignedTo
  const finalSlug =
    typeof slug === "string" && slug.trim()
      ? slug.trim()
      : domain && typeof name === "string" && name
        ? buildCompanySlug(name, domain)
        : null
  if (finalSlug) {
    update.slug = finalSlug
    update.report_url = buildReportUrl(reportLocale, finalSlug)
  }

  // 既存照合: notion_page_id → domain → name_key
  const nameKey = normalizeCompanyName(typeof name === "string" ? name : null)
  const existing = await findExistingCompany({ notionPageId: pageId, domain, nameKey, region })

  if (existing) {
    if (!existing.notion_page_id) update.notion_page_id = pageId // domain/name 一致なら紐付け
    update.meta = {
      ...(existing.meta ?? {}),
      routing: {
        ...(((existing.meta ?? {}).routing as Record<string, unknown> | undefined) ?? {}),
        report_locale: reportLocale,
        target_country: targetCountry,
        template_variant: templateVariant,
        report_url: finalSlug ? buildReportUrl(reportLocale, finalSlug) : existing.report_url,
      },
    }
    const { error } = await sb.from(DB_TABLES.SALES_COMPANIES).update(update).eq("id", existing.id)
    await recordSyncLog({
      entity_type: "company",
      notion_page_id: pageId,
      action: "update",
      status: error ? "error" : "success",
      error_message: error?.message ?? null,
      payload: { deal_stage: update.deal_stage, fields: Object.keys(update) },
    })
    return error ? { ok: false, error: error.message } : { ok: true, entity: "company", action: "update" }
  }

  // 新規: domain があれば作成 + enrich (Notion を「リード追加の入口」に)
  if (!domain) {
    await recordSyncLog({ entity_type: "company", notion_page_id: pageId, action: "create", status: "skipped" })
    return { ok: true, entity: "company", action: "skipped" }
  }
  const companyName = typeof name === "string" && name ? name : domain
  const created = await upsertCompanyByDomain({
    domain,
    company_name: companyName,
    region,
    industry: typeof industryRaw === "string" && isValidIndustry(industryRaw) ? industryRaw : null,
    prefecture: typeof prefecture === "string" ? prefecture : null,
    report_locale: reportLocale,
    target_country: targetCountry,
    template_variant: templateVariant,
    slug: finalSlug,
    pipeline_status: "scanning",
    source: "notion_manual",
    meta: { notion_origin: pageId, created_via: "notion_webhook", received_at: new Date().toISOString() },
  })
  if (!created.ok || !created.company) {
    await recordSyncLog({
      entity_type: "company",
      notion_page_id: pageId,
      action: "create",
      status: "error",
      error_message: created.error ?? "create failed",
    })
    return { ok: false, error: created.error }
  }
  await setNotionPageId(created.company.id, pageId)
  // 🚀 enrich pipeline (fire-and-forget) → カルテ自動生成
  void enrichFromContact({
    email: `info@${domain}`,
    company: companyName,
    message: "Notion manual lead add",
    source: "notion_webhook",
  }).catch((e) => console.error(`[notion-apply] enrich ${domain} failed:`, e))
  await recordSyncLog({ entity_type: "company", notion_page_id: pageId, action: "create", status: "success", payload: { domain } })
  return { ok: true, entity: "company", action: "create" }
}

/* ───── customer (顧客) ───── */

const VALID_CONTRACT_STATUS = ["トライアル", "継続中", "解約予告", "解約済", "Trial", "Active", "Pending Cancel", "Cancelled"]
const VALID_HEALTH = ["🟢 良好", "🟡 要注意", "🔴 要対応", "🟢 Good", "🟡 Watch", "🔴 Action Required"]
const VALID_SUBSIDY = ["未申請", "申請中", "採択済", "非対象"]

async function applyCustomer(
  pageId: string,
  props: Record<string, unknown>,
  region: Region,
): Promise<ApplyResult> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, error: "Supabase not configured" }

  const update: Record<string, unknown> = {}
  const name = extractProperty(props, "顧客名") || extractProperty(props, "Customer")
  if (typeof name === "string" && name) update.customer_name = name

  const status = extractProperty(props, "契約ステータス") || extractProperty(props, "Status")
  if (typeof status === "string" && VALID_CONTRACT_STATUS.includes(status)) update.contract_status = status

  const health = extractProperty(props, "健全度") || extractProperty(props, "Health")
  if (typeof health === "string" && VALID_HEALTH.includes(health)) update.health = health

  const nextMeeting = extractProperty(props, "次回ミーティング") || extractProperty(props, "Next Meeting")
  if (typeof nextMeeting === "string" || nextMeeting === null) update.next_meeting = nextMeeting

  const subsidy = extractProperty(props, "補助金申請状況")
  if (typeof subsidy === "string" && VALID_SUBSIDY.includes(subsidy)) update.subsidy_status = subsidy

  const monthly = extractProperty(props, "月額") || extractProperty(props, "Monthly (USD)")
  if (typeof monthly === "number") update.monthly_amount = monthly

  const wlCount = extractProperty(props, "WLクライアント数") || extractProperty(props, "WL Client Count")
  if (typeof wlCount === "number") update.wl_client_count = wlCount

  const contractStart = extractProperty(props, "契約開始日") || extractProperty(props, "Contract Start")
  if (typeof contractStart === "string" || contractStart === null) update.contract_start = contractStart

  const nextInvoice = extractProperty(props, "次回請求日") || extractProperty(props, "Next Invoice")
  if (typeof nextInvoice === "string" || nextInvoice === null) update.next_invoice_date = nextInvoice

  const products = extractProperty(props, "契約商材") || extractProperty(props, "Products")
  if (Array.isArray(products)) update.contract_products = products

  const isWL = extractProperty(props, "WLクライアント") || extractProperty(props, "White Label")
  if (typeof isWL === "boolean") update.is_white_label = isWL

  const assignedTo = extractProperty(props, "担当者") || extractProperty(props, "Assignee")
  if (typeof assignedTo === "string") update.assigned_to = assignedTo

  if (Object.keys(update).length === 0) {
    return { ok: true, entity: "customer", action: "skipped" }
  }
  const { error } = await sb
    .from(DB_TABLES.SALES_CUSTOMERS)
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("notion_page_id", pageId)
    .eq("region", region)
  await recordSyncLog({
    entity_type: "customer",
    notion_page_id: pageId,
    action: "update",
    status: error ? "error" : "success",
    error_message: error?.message ?? null,
    payload: { fields: Object.keys(update) },
  })
  return error ? { ok: false, error: error.message } : { ok: true, entity: "customer", action: "update" }
}

/* ───── delivery (納品) ───── */

const VALID_DELIVERY_STATUS = ["未着手", "制作中", "レビュー待ち", "納品済", "Not Started", "In Progress", "Review", "Delivered"]

async function applyDelivery(
  pageId: string,
  props: Record<string, unknown>,
  region: Region,
): Promise<ApplyResult> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, error: "Supabase not configured" }

  const update: Record<string, unknown> = {}
  const metaUpdates: Record<string, unknown> = {}

  const name = extractProperty(props, "納品名") || extractProperty(props, "Delivery")
  if (typeof name === "string" && name) update.delivery_name = name

  const status = extractProperty(props, "ステータス") || extractProperty(props, "Status")
  if (typeof status === "string" && VALID_DELIVERY_STATUS.includes(status)) update.status = status

  const dueDate = extractProperty(props, "納期") || extractProperty(props, "Due Date")
  if (typeof dueDate === "string" || dueDate === null) update.due_date = dueDate

  const deliveryUrl = extractProperty(props, "納品URL") || extractProperty(props, "Delivery URL")
  if (typeof deliveryUrl === "string") update.delivery_url = deliveryUrl

  const r2Path = extractProperty(props, "Cloudflare R2 パス") || extractProperty(props, "R2 Path")
  if (typeof r2Path === "string") update.r2_path = r2Path

  const createdBy = extractProperty(props, "制作者") || extractProperty(props, "Created By")
  if (typeof createdBy === "string") update.created_by = createdBy

  const progress = extractProperty(props, "進捗 %") || extractProperty(props, "Progress %")
  if (typeof progress === "number") metaUpdates.progress_percent = progress

  const isPublic = extractProperty(props, "公開") || extractProperty(props, "Public")
  if (typeof isPublic === "boolean") metaUpdates.is_public = isPublic

  if (Object.keys(metaUpdates).length > 0) {
    const { data: existing } = await sb
      .from(DB_TABLES.SALES_DELIVERIES)
      .select("meta")
      .eq("notion_page_id", pageId)
      .maybeSingle()
    update.meta = { ...((existing?.meta as Record<string, unknown>) ?? {}), ...metaUpdates }
  }

  if (Object.keys(update).length === 0) {
    return { ok: true, entity: "delivery", action: "skipped" }
  }
  const { error } = await sb
    .from(DB_TABLES.SALES_DELIVERIES)
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("notion_page_id", pageId)
    .eq("region", region)
  await recordSyncLog({
    entity_type: "delivery",
    notion_page_id: pageId,
    action: "update",
    status: error ? "error" : "success",
    error_message: error?.message ?? null,
    payload: { fields: Object.keys(update) },
  })
  return error ? { ok: false, error: error.message } : { ok: true, entity: "delivery", action: "update" }
}

/* ───── template (テンプレ) ───── */

async function applyTemplate(
  pageId: string,
  props: Record<string, unknown>,
  region: Region,
): Promise<ApplyResult> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, error: "Supabase not configured" }

  const update: Record<string, unknown> = { last_synced: new Date().toISOString() }
  const template_name = extractProperty(props, "テンプレ名")
  if (typeof template_name === "string" && template_name) update.template_name = template_name
  const templateVariant = normalizeTemplateVariant(
    extractProperty(props, "テンプレ種別") || extractProperty(props, "Template Variant"),
  )
  const reportLocale = normalizeReportLocale(
    extractProperty(props, "表示言語") || extractProperty(props, "Report Locale"),
    region,
  )
  const targetCountry = normalizeTargetCountry(
    extractProperty(props, "対象国") || extractProperty(props, "Target Country"),
    reportLocale,
  )
  const industry = extractProperty(props, "業種")
  const issue = extractProperty(props, "課題コード")
  update.template_variant = templateVariant
  update.report_locale = reportLocale
  update.target_country = targetCountry
  if (typeof industry === "string" && isValidIndustry(industry)) update.industry = industry
  if (typeof issue === "string" && isValidIssueCode(issue)) update.issue_code = issue
  for (const field of ["headline", "pain", "fear", "loss", "cta_text"] as const) {
    const v = extractProperty(props, field)
    if (typeof v === "string") update[field] = v
  }
  const severity = extractProperty(props, "重要度")
  if (severity === "critical" || severity === "warning" || severity === "info") update.severity = severity
  const isActive = extractProperty(props, "有効")
  if (typeof isActive === "boolean") update.is_active = isActive

  // template_name / 1 つ以上の本文がある時だけ反映 (last_synced のみは no-op)
  if (Object.keys(update).length <= 1) {
    return { ok: true, entity: "template", action: "skipped" }
  }
  let { error } = await sb
    .from(DB_TABLES.SALES_TEMPLATES)
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("notion_page_id", pageId)
    .eq("region", region)
  if (
    error &&
    /template_variant|report_locale|target_country/.test(error.message) &&
    /column|schema cache/i.test(error.message)
  ) {
    console.warn("[notion-apply] template routing columns missing, retrying with legacy fields:", error.message)
    const {
      template_variant: _templateVariant,
      report_locale: _reportLocale,
      target_country: _targetCountry,
      ...legacyUpdate
    } = update
    const retry = await sb
      .from(DB_TABLES.SALES_TEMPLATES)
      .update({ ...legacyUpdate, updated_at: new Date().toISOString() })
      .eq("notion_page_id", pageId)
      .eq("region", region)
    error = retry.error
  }
  await recordSyncLog({
    entity_type: "template",
    notion_page_id: pageId,
    action: "update",
    status: error ? "error" : "success",
    error_message: error?.message ?? null,
    payload: { fields: Object.keys(update) },
  })
  return error ? { ok: false, error: error.message } : { ok: true, entity: "template", action: "update" }
}
