/**
 * lib/sales/sync.ts — Supabase ⇔ Notion 同期 utilities (Sprint 8)
 *
 * 役割:
 *   1. Supabase → Notion 同期 (companies の状態を Notion ページに反映)
 *   2. Notion → Supabase 逆流 (Notion 編集可 4 field を Supabase に書き戻し)
 *   3. 全同期操作を sales_sync_logs に audit 記録 (RTBF 対応)
 *
 * 使用箇所:
 *   - Trigger.dev task 01-supabase-to-notion-sync (Webhook trigger)
 *   - Trigger.dev task 02-notion-to-supabase-reverse (Cron 5min)
 *   - Next.js API route (将来・admin から手動同期を triggerする時)
 */

import { getServiceSalesSupabase } from "@/lib/supabase"
import {
  N,
  notionCreatePage,
  notionUpdatePage,
  notionFindPageByDomain,
  extractProperty,
} from "@/lib/notion"
import { setNotionPageId, findCompanyByDomain, updateCompanyFromNotion } from "./companies"
import {
  buildCompanySlug,
  buildReportUrl,
  getRoutingMeta,
  normalizeReportLocale,
} from "./routing"
import type {
  SalesCompany,
  SalesCustomer,
  SalesDelivery,
  DealStage,
  SalesSyncLog,
} from "./types"
import { isValidDealStage } from "./types"
import { DB_TABLES } from "@/lib/sales/db-tables"

/* ───── audit log helper ───── */

async function recordSyncLog(
  entry: Omit<SalesSyncLog, "id" | "created_at">,
): Promise<void> {
  const sb = getServiceSalesSupabase()
  if (!sb) return
  await sb.from(DB_TABLES.SALES_SYNC_LOGS).insert(entry)
}

/* ───── Supabase → Notion ───── */

/**
 * sales_companies の row を Notion リード DB に反映 (create or update)
 *
 * @param company       sales_companies row
 * @param notionDbId    NOTION_DB_COMPANIES_ID
 * @returns             { ok, notion_page_id }
 */
export async function syncCompanyToNotion(
  company: SalesCompany,
  notionDbId: string,
): Promise<{ ok: boolean; notion_page_id?: string; error?: string }> {
  const routing = getRoutingMeta(company.meta)
  const reportLocale = normalizeReportLocale(
    company.report_locale ?? routing.report_locale,
    company.region,
  )
  const slug = company.slug ?? buildCompanySlug(company.company_name, company.domain)
  const reportUrl = company.report_url ?? buildReportUrl(reportLocale, slug)
  const properties = {
    企業名: N.title(company.company_name),
    ドメイン: N.url(`https://${company.domain}`),
    業種: company.industry ? N.select(company.industry) : { select: null },
    都道府県: company.prefecture
      ? N.select(company.prefecture)
      : { select: null },
    対象国: N.select(company.target_country ?? routing.target_country ?? "JP"),
    表示言語: N.select(reportLocale),
    テンプレ種別: N.select(
      company.template_variant ?? routing.template_variant ?? "website_diagnostic",
    ),
    "slug (URL)": N.richText(slug),
    パイプライン: N.select(company.pipeline_status),
    商談ステージ: N.select(company.deal_stage),
    モバイルスコア: N.number(company.pagespeed_mobile ?? 0),
    検出課題: N.multiSelect(company.detected_issues ?? []),
    レポート閲覧数: N.number(company.report_views ?? 0),
    HOTリード: N.checkbox(company.is_hot_lead),
    送信結果: company.send_result
      ? N.select(company.send_result)
      : { select: null },
    送信日時: N.date(company.sent_at),
    レポートURL: N.url(reportUrl),
    フォローアップ日: N.date(company.follow_up_date),
    メモ: N.richText(company.memo ?? ""),
  }

  // 既に Notion 側にページがあれば update / なければ create
  if (company.notion_page_id) {
    const res = await notionUpdatePage(company.notion_page_id, properties)
    await recordSyncLog({
      direction: "supabase->notion",
      entity_type: "company",
      entity_id: company.id,
      notion_page_id: company.notion_page_id,
      action: "update",
      status: res.ok ? "success" : "error",
      error_message: res.error ?? null,
      payload: { domain: company.domain },
    })
    return res.ok
      ? { ok: true, notion_page_id: company.notion_page_id }
      : { ok: false, error: res.error }
  }

  // domain で Notion 側既存ページを検索 (削除されていなければ再利用)
  const existing = await notionFindPageByDomain(notionDbId, company.domain)
  if (existing.ok && existing.data?.id) {
    // 紐付け
    await setNotionPageId(company.id, existing.data.id)
    const res = await notionUpdatePage(existing.data.id, properties)
    await recordSyncLog({
      direction: "supabase->notion",
      entity_type: "company",
      entity_id: company.id,
      notion_page_id: existing.data.id,
      action: "update",
      status: res.ok ? "success" : "error",
      error_message: res.error ?? null,
      payload: { domain: company.domain, rebound: true },
    })
    return res.ok
      ? { ok: true, notion_page_id: existing.data.id }
      : { ok: false, error: res.error }
  }

  // 新規作成
  const created = await notionCreatePage(notionDbId, properties)
  if (created.ok && created.data?.id) {
    await setNotionPageId(company.id, created.data.id)
    await recordSyncLog({
      direction: "supabase->notion",
      entity_type: "company",
      entity_id: company.id,
      notion_page_id: created.data.id,
      action: "create",
      status: "success",
      error_message: null,
      payload: { domain: company.domain },
    })
    return { ok: true, notion_page_id: created.data.id }
  }
  await recordSyncLog({
    direction: "supabase->notion",
    entity_type: "company",
    entity_id: company.id,
    notion_page_id: null,
    action: "create",
    status: "error",
    error_message: created.error ?? null,
    payload: { domain: company.domain },
  })
  return { ok: false, error: created.error }
}

/* ───── Notion → Supabase 逆流 (5min cron) ───── */

/**
 * Notion 側で編集された 4 field (deal_stage / follow_up_date / memo / assigned_to)
 * のみを Supabase に書き戻す。それ以外は無視 (safety: 一方向同期の field を逆流させない)
 */
export async function syncCompanyFromNotion(
  notionPageId: string,
  properties: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const dealStageRaw = extractProperty(properties, "商談ステージ")
  const followUp = extractProperty(properties, "フォローアップ日")
  const memo = extractProperty(properties, "メモ")
  const assignedTo = extractProperty(properties, "担当者")

  const dealStage =
    typeof dealStageRaw === "string" && isValidDealStage(dealStageRaw)
      ? (dealStageRaw as DealStage)
      : undefined

  const res = await updateCompanyFromNotion(notionPageId, {
    deal_stage: dealStage,
    follow_up_date: typeof followUp === "string" ? followUp : null,
    memo: typeof memo === "string" ? memo : null,
    assigned_to: typeof assignedTo === "string" ? assignedTo : null,
  })

  await recordSyncLog({
    direction: "notion->supabase",
    entity_type: "company",
    entity_id: null,
    notion_page_id: notionPageId,
    action: "update",
    status: res.ok ? "success" : "error",
    error_message: res.error ?? null,
    payload: { deal_stage: dealStage, follow_up: followUp, memo, assigned_to: assignedTo },
  })

  return res
}

/* ───── Notion ページ削除復元 ───── */

/**
 * Notion 側でページが削除された場合、domain で再検索して再作成する。
 * 「Notionページが削除された場合の再作成ロジック」(Sprint 8 注意点) を実装。
 */
export async function rehydrateCompanyByDomain(
  domain: string,
  notionDbId: string,
): Promise<{ ok: boolean; notion_page_id?: string; error?: string }> {
  const company = await findCompanyByDomain(domain)
  if (!company) return { ok: false, error: "company not found in Supabase" }
  // notion_page_id をクリアして再 sync (新規作成 path に入る)
  const sb = getServiceSalesSupabase()
  if (sb) {
    const { error: updateErr } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .update({ notion_page_id: null })
      .eq("id", company.id)
    if (updateErr) {
      console.error("[sync] failed to clear notion_page_id before rehydrate:", updateErr.message)
      return { ok: false, error: `rehydrate pre-update failed: ${updateErr.message}` }
    }
  }
  return syncCompanyToNotion({ ...company, notion_page_id: null }, notionDbId)
}

/* ───── Supabase → Notion: 顧客 / 納品 (update-only・確認済みプロパティのみ) ───── */

/**
 * sales_customers row を Notion 顧客 DB に反映 (update-only)。
 * 既存の sync-customers-from-notion が読む = 存在が確実なプロパティのみ書く (PATCH 全体失敗を防ぐ)。
 * notion_page_id が無い row は skip (顧客ページの新規作成は Stripe/契約フローの責務)。
 */
export async function syncCustomerToNotion(
  customer: SalesCustomer,
): Promise<{ ok: boolean; error?: string }> {
  if (!customer.notion_page_id) return { ok: true } // ページ未作成 → S→N 対象外
  const properties: Record<string, unknown> = {
    契約ステータス: N.select(customer.contract_status),
    健全度: N.select(customer.health),
    補助金申請状況: N.select(customer.subsidy_status),
    次回ミーティング: N.date(customer.next_meeting),
    月額: N.number(customer.monthly_amount ?? 0),
    WLクライアント数: N.number(customer.wl_client_count ?? 0),
  }
  const res = await notionUpdatePage(customer.notion_page_id, properties)
  await recordSyncLog({
    direction: "supabase->notion",
    entity_type: "customer",
    entity_id: customer.id,
    notion_page_id: customer.notion_page_id,
    action: "update",
    status: res.ok ? "success" : "error",
    error_message: res.error ?? null,
    payload: { contract_status: customer.contract_status },
  })
  return res.ok ? { ok: true } : { ok: false, error: res.error }
}

/**
 * sales_deliveries row を Notion 納品 DB に反映 (update-only)。
 * 確認済みプロパティのみ。進捗 % / 公開 は meta から。notion_page_id 無しは skip。
 */
export async function syncDeliveryToNotion(
  delivery: SalesDelivery,
): Promise<{ ok: boolean; error?: string }> {
  if (!delivery.notion_page_id) return { ok: true }
  const meta = delivery.meta ?? {}
  const properties: Record<string, unknown> = {
    ステータス: N.select(delivery.status),
    納品URL: delivery.delivery_url ? N.url(delivery.delivery_url) : { url: null },
    "Cloudflare R2 パス": N.richText(delivery.r2_path ?? ""),
  }
  if (typeof meta.progress_percent === "number") {
    properties["進捗 %"] = N.number(meta.progress_percent)
  }
  if (typeof meta.is_public === "boolean") {
    properties["公開"] = N.checkbox(meta.is_public)
  }
  const res = await notionUpdatePage(delivery.notion_page_id, properties)
  await recordSyncLog({
    direction: "supabase->notion",
    entity_type: "delivery",
    entity_id: delivery.id,
    notion_page_id: delivery.notion_page_id,
    action: "update",
    status: res.ok ? "success" : "error",
    error_message: res.error ?? null,
    payload: { status: delivery.status },
  })
  return res.ok ? { ok: true } : { ok: false, error: res.error }
}
