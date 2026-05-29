/**
 * POST /api/sales/sync-customers-from-notion — Sprint 17 双方向 sync (N → S)
 *
 * 役割: Notion 顧客 DB の編集を Supabase sales_customers に反映.
 *
 * 反映可フィールド:
 *   - 契約ステータス (contract_status)
 *   - 健全度 (health)
 *   - 次回ミーティング (next_meeting)
 *   - 補助金申請状況 (subsidy_status)
 *   - 月額 (monthly_amount)
 *   - WL クライアント数 (wl_client_count)
 *   - 担当者 (assigned_to)
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { notionQueryDatabase, extractProperty } from "@/lib/notion"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { isValidRegion, type Region } from "@/lib/sales/types"
import { isNotionLegacySyncEnabled, notionLegacyDisabledResponse } from "@/lib/sales/notion-legacy-guard"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const DB_JP = "86b1d93e3b854862ae7b2750d2585677"
const DB_GLOBAL = "35fa2b78-f3fc-81aa-b57f-fcc729431181"

export async function POST(req: NextRequest) {
  if (!isNotionLegacySyncEnabled()) return notionLegacyDisabledResponse()

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
      ? process.env.NOTION_DB_CUSTOMERS_JP ?? DB_JP
      : process.env.NOTION_DB_CUSTOMERS_GLOBAL ?? DB_GLOBAL

  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 })

  const allRows: Array<{ id: string; properties: Record<string, unknown> }> = []
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
    if (pages > 20) break
  } while (cursor)

  const VALID_CONTRACT_STATUS = ["トライアル", "継続中", "解約予告", "解約済", "Trial", "Active", "Pending Cancel", "Cancelled"]
  const VALID_HEALTH = ["🟢 良好", "🟡 要注意", "🔴 要対応", "🟢 Good", "🟡 Watch", "🔴 Action Required"]
  const VALID_SUBSIDY = ["未申請", "申請中", "採択済", "非対象"]

  let synced = 0
  const errors: { notion_page_id: string; reason: string }[] = []

  for (const row of allRows) {
    const props = row.properties
    const update: Record<string, unknown> = {}

    const status = extractProperty(props, "契約ステータス") || extractProperty(props, "Status")
    if (typeof status === "string" && VALID_CONTRACT_STATUS.includes(status)) {
      update.contract_status = status
    }

    const health = extractProperty(props, "健全度") || extractProperty(props, "Health")
    if (typeof health === "string" && VALID_HEALTH.includes(health)) {
      update.health = health
    }

    const nextMeeting = extractProperty(props, "次回ミーティング") || extractProperty(props, "Next Meeting")
    if (typeof nextMeeting === "string") update.next_meeting = nextMeeting

    const subsidy = extractProperty(props, "補助金申請状況")
    if (typeof subsidy === "string" && VALID_SUBSIDY.includes(subsidy)) {
      update.subsidy_status = subsidy
    }

    const monthly = extractProperty(props, "月額") || extractProperty(props, "Monthly (USD)")
    if (typeof monthly === "number") update.monthly_amount = monthly

    const wlCount = extractProperty(props, "WLクライアント数") || extractProperty(props, "WL Client Count")
    if (typeof wlCount === "number") update.wl_client_count = wlCount

    if (Object.keys(update).length === 0) continue

    const { error } = await sb
      .from("sales_customers")
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq("notion_page_id", row.id)
      .eq("region", region)

    if (error) errors.push({ notion_page_id: row.id, reason: error.message })
    else synced++
  }

  return NextResponse.json({
    ok: true,
    region,
    total: allRows.length,
    synced,
    errors_count: errors.length,
    errors: errors.slice(0, 10),
    note: "Customers edits in Notion reflected to Supabase. Fields: contract_status / health / next_meeting / subsidy_status / monthly_amount / wl_client_count only.",
  })
}
