import { NextRequest, NextResponse } from "next/server"
import { authorizeWebhookRequest } from "@/lib/admin-auth"
import { notifyBothChannels } from "@/lib/notify"
import { runScheduledBaseSync } from "@/lib/shopify-ops/base-sync-automation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(request: NextRequest) {
  if (!authorizeWebhookRequest(request.headers).ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await runScheduledBaseSync()
    const changedCount = result.run.createdCount + result.run.updatedCount
    const message = result.status === "succeeded"
      ? `差分同期完了: 取得 ${result.run.sourceCount}件 / 変更 ${changedCount}件 / 変更なし ${result.run.skippedCount}件`
      : `安全停止: ${result.reason ?? "理由不明"}`
    const notification = result.notifyOperator
      ? await notifyBothChannels(`SERICIA BASE在庫同期: ${message}`, {
          title: "SERICIA BASE在庫同期",
          message,
          link: "/ja/admin/shopify",
          type: "shopify_base_scheduled_sync",
          region: "global",
          priority: result.status === "failed" ? 95 : result.status === "blocked" ? 80 : 55,
          idempotencyKey: `shopify-base-scheduled:${result.run.id}:${result.status}`,
        })
      : null
    if (notification && !notification.ok) console.error("[base-sync-scheduled] dual notification degraded:", notification)
    return NextResponse.json(
      { ok: result.status !== "failed", result, notification },
      { status: result.status === "failed" ? 503 : 200, headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("[base-sync-scheduled] run failed:", error)
    const message = error instanceof Error ? error.message : "BASE在庫同期に失敗しました"
    const notification = await notifyBothChannels(`SERICIA BASE在庫同期失敗: ${message}`, {
      title: "SERICIA BASE在庫同期失敗",
      message,
      link: "/ja/admin/shopify",
      type: "shopify_base_scheduled_sync_failed",
      region: "global",
      priority: 95,
    })
    if (!notification.ok) console.error("[base-sync-scheduled] failure notification degraded:", notification)
    return NextResponse.json({ ok: false, error: message, notification }, { status: 500 })
  }
}
