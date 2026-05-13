/**
 * POST /api/sales/sync-to-notion — n8n Workflow 01 から呼ばれる endpoint (Sprint 9-A)
 *
 * 役割: sales_companies row を Notion リードDB に push (create or update or rehydrate).
 *       n8n が Supabase Webhook で row 変更を検知 → 本 endpoint を call.
 *
 * 認証: X-Webhook-Secret header 必須 (lib/sales/auth.ts)
 * Body:  { company: SalesCompany }
 * 出力:  { ok, notion_page_id?, error? }
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { syncCompanyToNotion } from "@/lib/sales/sync"
import { findCompanyById } from "@/lib/sales/companies"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr

  const dbId = process.env.NOTION_DB_COMPANIES_ID
  if (!dbId) {
    return NextResponse.json(
      { ok: false, error: "NOTION_DB_COMPANIES_ID not configured" },
      { status: 503 },
    )
  }

  try {
    const body = (await req.json()) as { company?: { id?: string } }
    const companyId = body?.company?.id
    if (!companyId || typeof companyId !== "string") {
      return NextResponse.json(
        { ok: false, error: "company.id (uuid) is required" },
        { status: 400 },
      )
    }

    // 既にデータが古い可能性があるので、Supabase から最新を取得し直してから sync.
    // (n8n payload は Webhook 発火時の snapshot で、その後の変更が反映されないことがある)
    const fresh = await findCompanyById(companyId)
    if (!fresh) {
      return NextResponse.json(
        { ok: false, error: "company not found in Supabase" },
        { status: 404 },
      )
    }

    const result = await syncCompanyToNotion(fresh, dbId)
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
