import { NextRequest, NextResponse } from "next/server"
import { authorizeWebhookRequest } from "@/lib/admin-auth"
import { notifyBothChannels } from "@/lib/notify"
import { runDailySocialPipeline, tokyoDateString } from "@/lib/shopify-ops/social-pipeline"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(request: NextRequest) {
  if (!authorizeWebhookRequest(request.headers).ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  try {
    const run = await runDailySocialPipeline(tokyoDateString())
    const message = run.status === "blocked"
      ? `${run.runDate}: ${run.blockedReason}`
      : `${run.runDate}: ${run.generatedPostCount}件生成 / ${run.publishedPostCount}件公開 / ${run.failedPostCount}件失敗`
    const notification = await notifyBothChannels(`SERICIA SNS日次: ${message}`, {
      title: "SERICIA SNS日次パイプライン", message, link: "/ja/admin/shopify",
      type: "shopify_social_scheduled_run", region: "global",
      priority: run.status === "failed" ? 95 : run.status === "blocked" ? 70 : 55,
      idempotencyKey: `shopify-social-scheduled:${run.runDate}:${run.status}:${run.publishedPostCount}:${run.failedPostCount}`,
    })
    if (!notification.ok) console.error("[shopify-social-daily] dual notification degraded:", notification)
    return NextResponse.json({ ok: true, run, notification }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("[shopify-social-daily] run failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "SNS日次実行に失敗しました" }, { status: 500 })
  }
}
