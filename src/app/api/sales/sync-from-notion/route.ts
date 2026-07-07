/**
 * POST /api/sales/sync-from-notion — Workflow 02 から呼ばれる endpoint (Sprint 9-A)
 *
 * 役割: Notion で人間が編集した 4 field (deal_stage / follow_up_date / memo / 担当者)
 *       を Supabase sales_companies に書き戻す.
 *
 * 認証: X-Webhook-Secret header 必須
 * Body:  { notion_page_id: string, properties: Record<string, unknown> }
 *        properties は Notion API の page object そのまま
 * 出力:  { ok, error? }
 *
 * 安全性: lib/sales/companies.ts::updateCompanyFromNotion で 4 field whitelist 適用.
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { syncCompanyFromNotion } from "@/lib/sales/sync"
import { isNotionLegacySyncEnabled, notionLegacyDisabledResponse } from "@/lib/sales/notion-legacy-guard"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  if (!isNotionLegacySyncEnabled()) return notionLegacyDisabledResponse()

  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr

  try {
    const body = (await req.json()) as {
      notion_page_id?: string
      properties?: Record<string, unknown>
    }
    if (!body?.notion_page_id || typeof body.notion_page_id !== "string") {
      return NextResponse.json(
        { ok: false, error: "notion_page_id is required" },
        { status: 400 },
      )
    }
    if (!body.properties || typeof body.properties !== "object") {
      return NextResponse.json(
        { ok: false, error: "properties (object) is required" },
        { status: 400 },
      )
    }
    const result = await syncCompanyFromNotion(body.notion_page_id, body.properties)
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (e) {
    console.error("[sync-from-notion] failed:", e instanceof Error ? e.message : String(e))
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
