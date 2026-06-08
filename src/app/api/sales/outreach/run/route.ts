/**
 * POST /api/sales/outreach/run — ④フォーム営業バッチ起動 (Phase 3)
 *
 * 役割: report_ready のリードに対し outreach パイプラインを 1 バッチ回す。
 *       judgment は本ルート (Next)、実ブラウザ送信は BrowserProvider 経由。
 *
 * 認証: X-Webhook-Secret (Trigger.dev / cron / admin から呼ぶ)
 * Body: { region?, limit?, dryRun?, first5Approval?, enableLlm?, checkRobots?, dedupDays? }
 *   - dryRun は **default true** (安全側)。実送信は明示的に dryRun:false が必要。
 * 出力: OutreachBatchResult (processed/submitted/manualQueue/skipped/failed/items)
 *
 * AE-PHP-4 準拠 (役割/入力/出力 明示)。
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { runOutreachBatch } from "@/lib/sales/outreach/orchestrator"
import { isValidRegion } from "@/lib/sales/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

interface Body {
  region?: string
  limit?: number
  dryRun?: boolean
  first5Approval?: boolean
  enableLlm?: boolean
  checkRobots?: boolean
  dedupDays?: number
}

export async function POST(req: NextRequest) {
  const dashboardAuth = await isSalesApiAuthorized(req)
  const webhookAuthErr = dashboardAuth ? null : verifyWebhookSecret(req)
  if (webhookAuthErr) return webhookAuthErr

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch (e) {
    console.warn("[sales-outreach-run] empty or invalid JSON body:", e)
    body = {}
  }

  const region = body.region && isValidRegion(body.region) ? body.region : "jp"
  const limit = Math.min(Math.max(body.limit ?? 5, 1), 50)

  const result = await runOutreachBatch({
    region,
    limit,
    dryRun: body.dryRun ?? false,
    first5Approval: body.first5Approval ?? true,
    enableLlm: body.enableLlm ?? false,
    checkRobots: body.checkRobots ?? true,
    dedupDays: body.dedupDays ?? 30,
  })

  return NextResponse.json({ ok: true, ...result })
}
