import { NextRequest, NextResponse } from "next/server"
import { notifyBothChannels } from "@/lib/notify"
import { authorizeSalesApiRequest, type OperatorRole, type SalesApiPrincipal } from "@/lib/sales/api-auth"
import {
  createVideoGrowthCampaignSchema,
  manageVideoGrowthApprovalSchema,
  manageVideoGrowthRevisionSchema,
  recordVideoGrowthDailyMetricsSchema,
  transitionVideoGrowthCampaignSchema,
  updateVideoGrowthBillingSchema,
  updateVideoGrowthReadinessSchema,
  updateVideoGrowthVariantSchema,
  updateVideoGrowthWorkOrderSchema,
} from "@/lib/video-growth/schemas"
import {
  createVideoGrowthCampaign,
  getVideoGrowthDashboard,
  manageVideoGrowthApproval,
  manageVideoGrowthRevision,
  recordVideoGrowthDailyMetrics,
  transitionVideoGrowthCampaign,
  updateVideoGrowthBilling,
  updateVideoGrowthReadiness,
  updateVideoGrowthVariant,
  updateVideoGrowthWorkOrder,
} from "@/lib/video-growth/repository"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

type JsonRecord = Record<string, unknown>
const CORE_ROLES: OperatorRole[] = ["admin", "commercial_lead", "delivery"]
const READ_ROLES: OperatorRole[] = ["admin", "commercial_lead", "finance", "legal", "delivery", "viewer"]

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
}

async function requestJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json()
  } catch (error) {
    console.error("[video-growth-api] JSON parse failed:", error)
    return null
  }
}

function hasRole(principal: SalesApiPrincipal, allowed: OperatorRole[]): boolean {
  return allowed.includes(principal.role)
}

function forbidden() {
  return NextResponse.json({ ok: false, error: "この操作を行う権限がありません" }, { status: 403 })
}

function publicPrincipal(principal: SalesApiPrincipal) {
  return {
    key: principal.key,
    email: principal.email,
    displayName: principal.email ?? principal.key,
    role: principal.role,
    authSource: principal.authSource,
  }
}

function publicError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Video Growth操作に失敗しました"
  const known = [
    "not found", "revision conflict", "Only draft", "All four", "All seven",
    "Studio project", "Human approval", "human approval", "future schedule", "future commercial",
    "ready for human approval", "Hook, caption", "deliverable", "scheduled or active",
    "approved for publication", "approval", "publication", "HTTPS", "metrics date",
    "Failure reason", "terminal", "work order", "Requester and approver", "pending approval",
    "waiver or failure", "resolution note",
  ]
  return known.some((marker) => message.toLowerCase().includes(marker.toLowerCase()))
    ? message
    : "Video Growth操作に失敗しました"
}

async function notifyMutation(input: { title: string; message: string; type: string; leadId: string; priority?: number }) {
  const result = await notifyBothChannels(`${input.title}: ${input.message}`, {
    title: input.title, message: input.message, link: "/ja/admin/video-growth",
    type: input.type, region: "global", priority: input.priority ?? 70,
    leadId: input.leadId, idempotencyKey: `${input.type}:${input.leadId}:${Date.now()}`,
  })
  if (!result.ok) console.error("[video-growth-api] dual notification degraded:", result)
  return result
}

function mutationResponse(status: string, notification: unknown) {
  return NextResponse.json({ ok: true, status, notification })
}

export async function GET(req: NextRequest) {
  const auth = await authorizeSalesApiRequest(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  if (!hasRole(auth.principal, READ_ROLES)) return forbidden()
  try {
    const dashboard = await getVideoGrowthDashboard()
    return NextResponse.json(
      { ok: true, dashboard, principal: publicPrincipal(auth.principal) },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("[video-growth-api] dashboard load failed:", error)
    return NextResponse.json({ ok: false, error: "Video Growthダッシュボードを読み込めませんでした" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeSalesApiRequest(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  if (!hasRole(auth.principal, CORE_ROLES)) return forbidden()
  const parsed = createVideoGrowthCampaignSchema.safeParse(await requestJson(req))
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "案件と商用ワークオーダーの入力を確認してください", fields: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  try {
    const campaignId = await createVideoGrowthCampaign(parsed.data, auth.principal)
    const notification = await notifyMutation({
      title: "動画サブスク案件を作成", message: "商用ワークオーダーと7項目の入稿確認を作成しました。外部送信は行っていません。",
      type: "video_growth_commercial_created", leadId: campaignId, priority: 75,
    })
    return NextResponse.json({ ok: true, campaignId, notification }, { status: 201 })
  } catch (error) {
    console.error("[video-growth-api] campaign creation failed:", error)
    return NextResponse.json({ ok: false, error: publicError(error) }, { status: 409 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await authorizeSalesApiRequest(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const body = asRecord(await requestJson(req))
  try {
    if (body.target === "campaign") {
      const parsed = transitionVideoGrowthCampaignSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ ok: false, error: "案件操作を確認してください", fields: parsed.error.flatten().fieldErrors }, { status: 400 })
      const allowed = parsed.data.action === "approve" || parsed.data.action === "schedule"
        ? ["admin", "commercial_lead"] as OperatorRole[] : CORE_ROLES
      if (!hasRole(auth.principal, allowed)) return forbidden()
      const status = await transitionVideoGrowthCampaign(parsed.data, auth.principal)
      const notification = await notifyMutation({
        title: parsed.data.action === "approve" ? "動画案件を人手承認" : "動画案件の工程を更新",
        message: `${parsed.data.action} → ${status}。${parsed.data.note}`,
        type: `video_growth_campaign_${parsed.data.action}`, leadId: parsed.data.campaignId,
        priority: parsed.data.action === "approve" ? 90 : 70,
      })
      return mutationResponse(status, notification)
    }

    if (body.target === "variant") {
      if (!hasRole(auth.principal, CORE_ROLES)) return forbidden()
      const parsed = updateVideoGrowthVariantSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ ok: false, error: "動画クリエイティブ操作を確認してください", fields: parsed.error.flatten().fieldErrors }, { status: 400 })
      const status = await updateVideoGrowthVariant(parsed.data, auth.principal)
      const notification = await notifyMutation({
        title: parsed.data.action === "publish" ? "動画の手動公開を記録" : "動画クリエイティブを更新",
        message: `${parsed.data.action} → ${status}。${parsed.data.note}`,
        type: `video_growth_variant_${parsed.data.action}`, leadId: parsed.data.variantId,
        priority: parsed.data.action === "publish" || parsed.data.action === "fail" ? 85 : 55,
      })
      return mutationResponse(status, notification)
    }

    if (body.target === "work_order") {
      if (!hasRole(auth.principal, CORE_ROLES)) return forbidden()
      const parsed = updateVideoGrowthWorkOrderSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ ok: false, error: "ワークオーダー入力を確認してください", fields: parsed.error.flatten().fieldErrors }, { status: 400 })
      const status = await updateVideoGrowthWorkOrder(parsed.data, auth.principal)
      const notification = await notifyMutation({ title: "動画制作ワークオーダーを更新", message: `工程を${status}へ更新しました。`, type: "video_growth_work_order_updated", leadId: parsed.data.campaignId })
      return mutationResponse(status, notification)
    }

    if (body.target === "readiness") {
      const parsed = updateVideoGrowthReadinessSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ ok: false, error: "入稿・契約チェックを確認してください", fields: parsed.error.flatten().fieldErrors }, { status: 400 })
      const role = auth.principal.role
      const specialized = (role === "finance" && parsed.data.checkKey === "payment")
        || (role === "legal" && ["contract", "usage_rights"].includes(parsed.data.checkKey))
      if (!hasRole(auth.principal, CORE_ROLES) && !specialized) return forbidden()
      const status = await updateVideoGrowthReadiness(parsed.data, auth.principal)
      const notification = await notifyMutation({ title: "商用入稿チェックを更新", message: `${parsed.data.checkKey} → ${status}`, type: "video_growth_readiness_updated", leadId: parsed.data.checkId, priority: status === "failed" ? 90 : 60 })
      return mutationResponse(status, notification)
    }

    if (body.target === "billing") {
      const parsed = updateVideoGrowthBillingSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ ok: false, error: "請求状態の入力を確認してください", fields: parsed.error.flatten().fieldErrors }, { status: 400 })
      if (!hasRole(auth.principal, ["admin", "commercial_lead", "finance"])) return forbidden()
      const status = await updateVideoGrowthBilling(parsed.data, auth.principal)
      const notification = await notifyMutation({ title: "動画案件の請求状態を更新", message: `請求状態を${status}へ更新しました。`, type: "video_growth_billing_updated", leadId: parsed.data.campaignId, priority: status === "overdue" ? 90 : 70 })
      return mutationResponse(status, notification)
    }

    if (body.target === "approval") {
      const parsed = manageVideoGrowthApprovalSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ ok: false, error: "品質・顧客承認操作を確認してください", fields: parsed.error.flatten().fieldErrors }, { status: 400 })
      const allowed = parsed.data.stage === "client_release" && parsed.data.action !== "request"
        ? ["admin", "commercial_lead"] as OperatorRole[] : CORE_ROLES
      if (!hasRole(auth.principal, allowed)) return forbidden()
      const status = await manageVideoGrowthApproval(parsed.data, auth.principal)
      const notification = await notifyMutation({ title: "動画承認を更新", message: `${parsed.data.stage} / ${parsed.data.action} → ${status}`, type: "video_growth_approval_updated", leadId: parsed.data.variantId, priority: parsed.data.action === "changes_requested" ? 90 : 75 })
      return mutationResponse(status, notification)
    }

    if (body.target === "revision") {
      if (!hasRole(auth.principal, CORE_ROLES)) return forbidden()
      const parsed = manageVideoGrowthRevisionSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ ok: false, error: "修正依頼を確認してください", fields: parsed.error.flatten().fieldErrors }, { status: 400 })
      const status = await manageVideoGrowthRevision(parsed.data, auth.principal)
      const leadId = parsed.data.action === "open" ? parsed.data.variantId : parsed.data.revisionRequestId
      const notification = await notifyMutation({ title: "動画修正依頼を更新", message: `${parsed.data.action} → ${status}`, type: "video_growth_revision_updated", leadId, priority: 80 })
      return mutationResponse(status, notification)
    }

    if (body.target === "metrics") {
      if (!hasRole(auth.principal, CORE_ROLES)) return forbidden()
      const parsed = recordVideoGrowthDailyMetricsSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ ok: false, error: "日次成果を確認してください", fields: parsed.error.flatten().fieldErrors }, { status: 400 })
      const status = await recordVideoGrowthDailyMetrics(parsed.data, auth.principal)
      const notification = await notifyMutation({ title: "動画の日次成果を記録", message: `${status} の成果を集計しました。`, type: "video_growth_daily_metrics_recorded", leadId: parsed.data.variantId, priority: 45 })
      return mutationResponse(status, notification)
    }

    return NextResponse.json({ ok: false, error: "未対応の操作対象です" }, { status: 400 })
  } catch (error) {
    console.error("[video-growth-api] mutation failed:", error)
    const conflict = error instanceof Error && error.message.includes("revision conflict")
    return NextResponse.json({ ok: false, error: publicError(error) }, { status: conflict ? 409 : 422 })
  }
}
