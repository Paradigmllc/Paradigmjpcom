import { NextRequest, NextResponse } from "next/server"
import { authorizeWebhookRequest } from "@/lib/admin-auth"
import { notifyBothChannels } from "@/lib/notify"
import { runLaunchAudit } from "@/lib/shopify-ops/launch-control"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(request: NextRequest) {
  if (!authorizeWebhookRequest(request.headers).ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await runLaunchAudit("scheduled")
    const message = result.audit.status === "ready"
      ? `全${result.audit.totalGateCount}項目を通過し、公開可能です`
      : `${result.audit.readyGateCount}/${result.audit.totalGateCount}項目を通過。残り${result.audit.blockers.length}件は安全停止中です`
    const notification = result.notifyOperator
      ? await notifyBothChannels(`SERICIA ローンチ監査: ${message}`, {
          title: "SERICIA ローンチ監査",
          message: `${message}\n${result.audit.blockers.slice(0, 5).join("\n")}`.trim(),
          link: "/ja/admin/shopify",
          type: "shopify_launch_audit",
          region: "global",
          priority: result.audit.status === "ready" ? 90 : 75,
          idempotencyKey: `shopify-launch-audit:${result.audit.fingerprint}:${result.audit.status}`,
        })
      : null
    if (notification && !notification.ok) {
      console.error("[shopify-launch-audit] dual notification degraded:", notification)
    }
    return NextResponse.json(
      { ok: true, result, notification },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("[shopify-launch-audit] scheduled audit failed:", error)
    const message = error instanceof Error ? error.message : "ローンチ監査に失敗しました"
    const notification = await notifyBothChannels(`SERICIA ローンチ監査失敗: ${message}`, {
      title: "SERICIA ローンチ監査失敗",
      message,
      link: "/ja/admin/shopify",
      type: "shopify_launch_audit_failed",
      region: "global",
      priority: 95,
    })
    if (!notification.ok) console.error("[shopify-launch-audit] failure notification degraded:", notification)
    return NextResponse.json({ ok: false, error: message, notification }, { status: 500 })
  }
}
