/**
 * POST /api/sales/sync-deliveries-from-notion — Sprint 17 双方向 sync (N → S)
 *
 * 役割: Notion 納品 DB の編集を Supabase sales_deliveries に反映.
 *
 * 反映可フィールド:
 *   - ステータス (status)
 *   - 進捗 % (meta.progress_percent)
 *   - 公開 (meta.is_public)
 *   - 納品 URL (delivery_url)
 *   - R2 path (r2_path)
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

const DB_JP = "b3cbef9dd96f4e5bbbecc404c703a298"
const DB_GLOBAL = "35fa2b78-f3fc-81e2-a5c3-d7b9b9d7f5a9"

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
      ? process.env.NOTION_DB_DELIVERIES_JP ?? DB_JP
      : process.env.NOTION_DB_DELIVERIES_GLOBAL ?? DB_GLOBAL

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

  const VALID_STATUS = ["未着手", "制作中", "レビュー待ち", "納品済", "Not Started", "In Progress", "Review", "Delivered"]

  let synced = 0
  const errors: { notion_page_id: string; reason: string }[] = []

  for (const row of allRows) {
    const props = row.properties
    const update: Record<string, unknown> = {}
    const metaUpdates: Record<string, unknown> = {}

    const status = extractProperty(props, "ステータス") || extractProperty(props, "Status")
    if (typeof status === "string" && VALID_STATUS.includes(status)) {
      update.status = status
    }

    const deliveryUrl = extractProperty(props, "納品URL") || extractProperty(props, "Delivery URL")
    if (typeof deliveryUrl === "string") update.delivery_url = deliveryUrl

    const r2Path = extractProperty(props, "Cloudflare R2 パス") || extractProperty(props, "R2 Path")
    if (typeof r2Path === "string") update.r2_path = r2Path

    const progress = extractProperty(props, "進捗 %") || extractProperty(props, "Progress %")
    if (typeof progress === "number") metaUpdates.progress_percent = progress

    const isPublic = extractProperty(props, "公開") || extractProperty(props, "Public")
    if (typeof isPublic === "boolean") metaUpdates.is_public = isPublic

    if (Object.keys(metaUpdates).length > 0) {
      // meta JSONB merge を SQL レベルで
      const { data: existing } = await sb
        .from("sales_deliveries")
        .select("meta")
        .eq("notion_page_id", row.id)
        .maybeSingle()
      update.meta = { ...((existing?.meta as Record<string, unknown>) ?? {}), ...metaUpdates }
    }

    if (Object.keys(update).length === 0) continue

    const { error } = await sb
      .from("sales_deliveries")
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
    note: "Deliveries edits in Notion reflected to Supabase. Fields: status / delivery_url / r2_path / meta.progress_percent / meta.is_public only.",
  })
}
