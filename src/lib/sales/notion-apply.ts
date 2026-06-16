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
import { notionGetPage } from "@/lib/notion"
import {
  upsertCompanyByDomain,
  setNotionPageId,
  findExistingCompany,
} from "./companies"
import { enrichFromContact } from "./enrich"
import { normalizeCompanyName } from "./dedup"
import { buildReportUrl } from "./routing"
import type { Region } from "./types"
import type { Industry } from "./types"
import { DB_TABLES } from "@/lib/sales/db-tables"
import {
  buildDbMap,
  normId,
  resolveNotionDbId,
  parseCompanyProps,
  parseCustomerProps,
  parseDeliveryProps,
  parseTemplateProps,
  type Entity,
} from "./notion-apply-format"

/* ───── re-exports for external consumers ───── */

export { resolveNotionDbId } from "./notion-apply-format"

/* ───── audit log ───── */

async function recordSyncLog(entry: {
  entity_type: Entity
  notion_page_id: string
  action: "create" | "update" | "enrich"
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

  const { update, name, domain, industry, prefecture, reportLocale, targetCountry, templateVariant, finalSlug } = parseCompanyProps(props, region)

  const nameKey = normalizeCompanyName(name)
  const existing = await findExistingCompany({ notionPageId: pageId, domain, nameKey, region })

  if (existing) {
    if (!existing.notion_page_id) update.notion_page_id = pageId
    update.meta = {
      ...(existing.meta ?? {}),
      routing: {
        ...(((existing.meta ?? {}).routing as Record<string, unknown> | undefined) ?? {}),
        report_locale: reportLocale,
        target_country: targetCountry,
        template_variant: templateVariant,
        report_url: finalSlug ? buildReportUrl(reportLocale as "ja" | "en", finalSlug) : existing.report_url,
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
    industry: industry as Industry | null,
    prefecture,
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
  }).catch((e) => {
    console.error(`[notion-apply] enrich ${domain} failed:`, e)
    recordSyncLog({
      entity_type: "company",
      notion_page_id: pageId,
      action: "enrich",
      status: "error",
      payload: { domain, error: e instanceof Error ? e.message : String(e) },
    }).catch((logError) => {
      console.error("[notion-apply] enrich error log failed:", logError)
    })
  })
  await recordSyncLog({ entity_type: "company", notion_page_id: pageId, action: "create", status: "success", payload: { domain } })
  return { ok: true, entity: "company", action: "create" }
}

/* ───── customer (顧客) ───── */

async function applyCustomer(
  pageId: string,
  props: Record<string, unknown>,
  region: Region,
): Promise<ApplyResult> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, error: "Supabase not configured" }

  const update = parseCustomerProps(props)

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

async function applyDelivery(
  pageId: string,
  props: Record<string, unknown>,
  region: Region,
): Promise<ApplyResult> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, error: "Supabase not configured" }

  const { update, metaUpdates } = parseDeliveryProps(props)

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

  const update = parseTemplateProps(props, region)

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
