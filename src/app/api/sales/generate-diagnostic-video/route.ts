/**
 * POST /api/sales/generate-diagnostic-video — Sprint 10-B
 *
 * 役割: 診断動画 (60 秒 MP4) を生成して URL を返す.
 *       Trigger.dev や手動で呼び出す.
 *
 * 認証: X-Webhook-Secret header 必須
 * Body:  { company_id_or_domain: string }
 * 出力:  { ok, video_url?, script?, html?, duration_sec?, error? }
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { generateDiagnosticVideo } from "@/lib/sales/video-generator"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr

  try {
    const body = (await req.json()) as { company_id_or_domain?: string; report_locale?: unknown }
    if (!body?.company_id_or_domain || typeof body.company_id_or_domain !== "string") {
      return NextResponse.json(
        { ok: false, error: "company_id_or_domain is required" },
        { status: 400 },
      )
    }
    const result = await generateDiagnosticVideo(
      body.company_id_or_domain,
      typeof body.report_locale === "string" ? body.report_locale : null,
    )
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (e) {
    console.error("[sales-generate-diagnostic-video] failed:", e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
