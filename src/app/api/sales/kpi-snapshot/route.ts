/**
 * POST /api/sales/kpi-snapshot — 日次 KPI スナップショット (Phase 4)
 *
 * 役割: その日 (or 指定日) の営業 KPI を集計し sales_kpi に upsert。
 *       cron (1 日 1 回) or admin から呼ぶ。
 *
 * 認証: X-Webhook-Secret
 * Body: { date?: "YYYY-MM-DD" }  (省略時 = 今日 UTC)
 * 出力: { ok, snapshot }
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { snapshotKpi } from "@/lib/sales/kpi"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr

  let date: string | undefined
  try {
    const body = (await req.json()) as { date?: string }
    date = body.date
  } catch {
    date = undefined
  }

  const result = await snapshotKpi(date)
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true, snapshot: result.snapshot })
}
