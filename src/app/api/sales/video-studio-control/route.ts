import { NextRequest, NextResponse } from "next/server"
import { notifyBothChannels } from "@/lib/notify"
import { authorizeSalesApiRequest, type OperatorRole } from "@/lib/sales/api-auth"
import { generationControlMutationSchema } from "@/lib/video-studio-control/schemas"
import {
  getGenerationControlDashboard,
  recordGenerationQualityReview,
  reserveGenerationRun,
  updateGenerationPolicy,
} from "@/lib/video-studio-control/repository"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

const READ_ROLES: OperatorRole[] = ["admin", "commercial_lead", "finance", "legal", "delivery", "viewer"]
const WRITE_ROLES: OperatorRole[] = ["admin", "commercial_lead", "delivery"]

async function body(req: NextRequest): Promise<unknown> {
  try {
    return await req.json()
  } catch (error) {
    console.error("[video-studio-control] JSON parse failed:", error)
    return null
  }
}

function forbidden() {
  return NextResponse.json({ ok: false, error: "この操作を行う権限がありません" }, { status: 403 })
}

export async function GET(req: NextRequest) {
  const auth = await authorizeSalesApiRequest(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  if (!READ_ROLES.includes(auth.principal.role)) return forbidden()
  try {
    const dashboard = await getGenerationControlDashboard()
    return NextResponse.json({ ok: true, dashboard }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("[video-studio-control] dashboard load failed:", error)
    return NextResponse.json({ ok: false, error: "生成コントロール台帳を読み込めませんでした" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeSalesApiRequest(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  if (!WRITE_ROLES.includes(auth.principal.role)) return forbidden()
  const parsed = generationControlMutationSchema.safeParse(await body(req))
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "費用・品質ガードの入力を確認してください", fields: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  try {
    if (parsed.data.action === "review_quality") {
      const review = await recordGenerationQualityReview(parsed.data, auth.principal)
      const notification = await notifyBothChannels("Video Studio品質比較を記録しました。", {
        title: review.approved ? "動画品質レビュー合格" : "動画品質レビュー要改善",
        message: `総合 ${review.overallScore}/100。${review.note}`,
        link: "/ja/admin/video-studio-control", type: "video_studio_quality_reviewed", region: "global",
        priority: review.approved ? 60 : 90, leadId: review.runId,
        idempotencyKey: `video-studio-quality:${review.id}`,
      })
      if (!notification.ok) console.error("[video-studio-control] quality notification degraded:", notification)
      return NextResponse.json({ ok: true, review, notification }, { status: 201 })
    }
    if (parsed.data.action === "update_policy") {
      if (auth.principal.role !== "admin") return forbidden()
      const policy = await updateGenerationPolicy(parsed.data, auth.principal)
      const notification = await notifyBothChannels("Video Studio生成上限を更新しました。", {
        title: "Video Studio生成上限を更新", message: `日次 ${policy.dailyBudgetCents} cents・1実行 ${policy.perRunBudgetCents} cents・最大${policy.maxAttempts}回`,
        link: "/ja/admin/video-studio-control", type: "video_studio_policy_updated", region: "global", priority: 80,
        idempotencyKey: `video-studio-policy:${policy.updatedAt}`,
      })
      if (!notification.ok) console.error("[video-studio-control] policy notification degraded:", notification)
      return NextResponse.json({ ok: true, policy, notification })
    }

    const preflight = await reserveGenerationRun(parsed.data, auth.principal)
    const run = preflight.run && typeof preflight.run === "object" ? preflight.run as Record<string, unknown> : {}
    const decision = typeof run.decision === "string" ? run.decision : "block"
    const runId = typeof run.id === "string" ? run.id : parsed.data.idempotencyKey
    const reason = typeof run.block_reason === "string" ? run.block_reason : "none"
    const responseBody = {
      ok: decision !== "block", preflight,
      ...(decision === "block" ? { error: `生成予約を停止しました: ${reason}` } : {}),
    }
    if (preflight.idempotent_replay === true) {
      return NextResponse.json(responseBody, { status: decision === "block" ? 409 : 200 })
    }
    const notification = await notifyBothChannels(`Video Studio preflight: ${decision}`, {
      title: decision === "block" ? "動画生成を費用ガードで停止" : decision === "reuse" ? "動画生成キャッシュを再利用" : "動画生成を予算内で予約",
      message: `${parsed.data.shotKind} / ${parsed.data.qualityTier} / ${String(run.selected_provider ?? parsed.data.requestedProvider)} / reason=${reason}`,
      link: "/ja/admin/video-studio-control", type: `video_studio_preflight_${decision}`, region: "global",
      priority: decision === "block" ? 90 : 65, leadId: runId,
      idempotencyKey: `video-studio-preflight:${parsed.data.idempotencyKey}`,
    })
    if (!notification.ok) console.error("[video-studio-control] preflight notification degraded:", notification)
    return NextResponse.json({ ...responseBody, notification }, { status: decision === "block" ? 409 : 201 })
  } catch (error) {
    console.error("[video-studio-control] mutation failed:", error)
    return NextResponse.json({ ok: false, error: "生成コントロール操作に失敗しました" }, { status: 422 })
  }
}
