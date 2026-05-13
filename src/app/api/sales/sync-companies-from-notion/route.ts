/**
 * POST /api/sales/sync-companies-from-notion — Sprint 17 双方向 sync (N → S)
 *
 * 役割: Notion リード DB の編集を Supabase sales_companies に反映.
 *       Notion = GUI / Supabase = SSOT で「人が編集する場所は Notion」「機械が読む場所は Supabase」の分業.
 *
 * 反映可フィールド (safety: Notion 編集 > Supabase 既存値):
 *   - 商談ステージ (deal_stage)
 *   - メモ (memo)
 *   - フォローアップ日 (follow_up_date)
 *   - 担当者 (assigned_to)
 *   - 業種・都道府県 (industry / prefecture)
 *
 * 編集不可 (Supabase が SSOT・Notion 編集無視):
 *   - id / region / domain / slug / company_name (作成 only)
 *   - pagespeed_* / detected_issues / report_views / is_hot_lead (機械的に更新)
 *   - notion_page_id (紐付け固定)
 *
 * 認証: X-Webhook-Secret 必須
 * Body: { region?: "jp"|"global" }
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { notionQueryDatabase, extractProperty } from "@/lib/notion"
import { getServiceSupabase } from "@/lib/supabase"
import {
  isValidDealStage,
  isValidIndustry,
  isValidRegion,
  type Region,
} from "@/lib/sales/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const DB_JP = "8cbab1f501144f83872c1738ce3e79c4"
const DB_GLOBAL = "35fa2b78-f3fc-8107-aa0b-f28694e1009c"

export async function POST(req: NextRequest) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr

  let body: { region?: string }
  try {
    body = (await req.json().catch(() => ({}))) as { region?: string }
  } catch {
    body = {}
  }
  const region: Region = isValidRegion(body.region ?? "") ? (body.region as Region) : "jp"
  const dbId =
    region === "jp"
      ? process.env.NOTION_DB_COMPANIES_JP ?? DB_JP
      : process.env.NOTION_DB_COMPANIES_GLOBAL ?? DB_GLOBAL

  const sb = getServiceSupabase()
  if (!sb) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 })
  }

  // Notion 全件取得 (cursor)
  const allRows: Array<{ id: string; properties: Record<string, unknown>; last_edited_time: string }> = []
  let cursor: string | undefined
  let pages = 0
  do {
    const r = await notionQueryDatabase(dbId, undefined, 100)
    if (!r.ok || !r.data) {
      return NextResponse.json({ ok: false, error: `Notion query failed: ${r.error}` }, { status: 500 })
    }
    allRows.push(...r.data.results)
    cursor = r.data.has_more ? r.data.next_cursor ?? undefined : undefined
    pages++
    if (pages > 20) break // safety
  } while (cursor)

  let synced = 0
  const errors: { notion_page_id: string; reason: string }[] = []

  for (const row of allRows) {
    const props = row.properties

    // 編集可フィールドのみ抽出 (jp と global で property name 異なる)
    const dealStageRaw = extractProperty(props, "商談ステージ") || extractProperty(props, "Deal Stage")
    const memo = extractProperty(props, "メモ") || extractProperty(props, "Notes")
    const followUp = extractProperty(props, "フォローアップ日") || extractProperty(props, "Follow-up Date")
    const industryRaw = extractProperty(props, "業種") || extractProperty(props, "Industry")
    const prefecture = extractProperty(props, "都道府県") || extractProperty(props, "Country")

    // 更新可能フィールドのみで update
    const update: Record<string, unknown> = {}
    if (typeof dealStageRaw === "string" && isValidDealStage(dealStageRaw)) {
      update.deal_stage = dealStageRaw
    }
    if (typeof memo === "string") update.memo = memo
    if (typeof followUp === "string") update.follow_up_date = followUp
    if (typeof industryRaw === "string" && isValidIndustry(industryRaw)) {
      update.industry = industryRaw
    }
    if (typeof prefecture === "string") update.prefecture = prefecture

    // 何も更新できなければ skip
    if (Object.keys(update).length === 0) continue

    // notion_page_id で対象 row を特定 (Supabase 側)
    const { error } = await sb
      .from("sales_companies")
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq("notion_page_id", row.id)
      .eq("region", region)

    if (error) {
      errors.push({ notion_page_id: row.id, reason: error.message })
    } else {
      synced++
    }
  }

  return NextResponse.json({
    ok: true,
    region,
    total: allRows.length,
    synced,
    errors_count: errors.length,
    errors: errors.slice(0, 10),
    note: "Companies edits in Notion reflected to Supabase. Fields: deal_stage / memo / follow_up_date / industry / prefecture only (others are SSOT-only).",
  })
}
