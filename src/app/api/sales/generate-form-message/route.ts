/**
 * POST /api/sales/generate-form-message — Sprint 10-A
 *
 * 役割: Trigger.dev が「フォーム送信前に文面を生成する」ステップで呼ぶ endpoint.
 *       Dify workflow で 200-300 字の営業文面を生成し、Supabase に audit ログを残す.
 *
 * 認証: X-Webhook-Secret header 必須
 * Body:  { company_id: uuid }
 * 出力:  { ok, message?, used_template_id?, usage?, error? }
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { generateFormMessage } from "@/lib/sales/form-message"
import { requiresVerifiedOutreachMetrics } from "@/lib/sales/outreach/evidence-mode"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

export async function POST(req: NextRequest) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr

  try {
    const body = (await req.json()) as { company_id?: string }
    if (!body?.company_id || typeof body.company_id !== "string") {
      return NextResponse.json(
        { ok: false, error: "company_id (uuid) is required" },
        { status: 400 },
      )
    }
    const result = await generateFormMessage(body.company_id, { requireVerifiedMetrics: requiresVerifiedOutreachMetrics() })
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (e) {
    console.error("[generate-form-message] failed:", e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
