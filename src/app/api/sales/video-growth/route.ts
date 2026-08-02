import { NextRequest, NextResponse } from "next/server"
import { notifyBothChannels } from "@/lib/notify"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import {
  createVideoGrowthCampaignSchema,
  transitionVideoGrowthCampaignSchema,
  updateVideoGrowthVariantSchema,
} from "@/lib/video-growth/schemas"
import {
  createVideoGrowthCampaign,
  getVideoGrowthDashboard,
  transitionVideoGrowthCampaign,
  updateVideoGrowthVariant,
} from "@/lib/video-growth/repository"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

type JsonRecord = Record<string, unknown>

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

function publicError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Video Growth操作に失敗しました"
  const known = [
    "not found",
    "revision conflict",
    "Only draft",
    "All four",
    "Studio project",
    "Human approval",
    "future schedule",
    "ready for human approval",
    "Hook, caption",
    "deliverable",
    "scheduled or active",
    "approved for publication",
    "HTTPS publication URL",
    "non-decreasing",
    "Failure reason",
  ]
  return known.some((marker) => message.includes(marker)) ? message : "Video Growth操作に失敗しました"
}

async function notifyMutation(input: {
  title: string
  message: string
  type: string
  leadId: string
  priority?: number
}) {
  const result = await notifyBothChannels(`${input.title}: ${input.message}`, {
    title: input.title,
    message: input.message,
    link: "/ja/admin/video-growth",
    type: input.type,
    region: "global",
    priority: input.priority ?? 70,
    leadId: input.leadId,
    idempotencyKey: `${input.type}:${input.leadId}:${Date.now()}`,
  })
  if (!result.ok) console.error("[video-growth-api] dual notification degraded:", result)
  return result
}

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  try {
    const dashboard = await getVideoGrowthDashboard()
    return NextResponse.json({ ok: true, dashboard }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("[video-growth-api] dashboard load failed:", error)
    return NextResponse.json({ ok: false, error: "Video Growthダッシュボードを読み込めませんでした" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const parsed = createVideoGrowthCampaignSchema.safeParse(await requestJson(req))
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "キャンペーン入力を確認してください", fields: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  try {
    const campaignId = await createVideoGrowthCampaign(parsed.data)
    const notification = await notifyMutation({
      title: "動画直販キャンペーンを作成",
      message: `${parsed.data.name}を下書きとして作成しました。外部送信は行っていません。`,
      type: "video_growth_campaign_created",
      leadId: campaignId,
      priority: 60,
    })
    return NextResponse.json({ ok: true, campaignId, notification }, { status: 201 })
  } catch (error) {
    console.error("[video-growth-api] campaign creation failed:", error)
    return NextResponse.json({ ok: false, error: publicError(error) }, { status: 409 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const body = asRecord(await requestJson(req))
  const target = body.target
  try {
    if (target === "campaign") {
      const parsed = transitionVideoGrowthCampaignSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ ok: false, error: "キャンペーン操作を確認してください", fields: parsed.error.flatten().fieldErrors }, { status: 400 })
      }
      const status = await transitionVideoGrowthCampaign(parsed.data)
      const notification = await notifyMutation({
        title: parsed.data.action === "approve" ? "動画直販キャンペーンを人間承認" : "動画直販キャンペーンを更新",
        message: `${parsed.data.action} → ${status}。${parsed.data.note}`,
        type: `video_growth_campaign_${parsed.data.action}`,
        leadId: parsed.data.campaignId,
        priority: parsed.data.action === "approve" ? 90 : 70,
      })
      return NextResponse.json({ ok: true, status, notification })
    }

    if (target === "variant") {
      const parsed = updateVideoGrowthVariantSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ ok: false, error: "媒体別クリエイティブ操作を確認してください", fields: parsed.error.flatten().fieldErrors }, { status: 400 })
      }
      const status = await updateVideoGrowthVariant(parsed.data)
      const notification = await notifyMutation({
        title: parsed.data.action === "publish" ? "動画クリエイティブの公開を記録" : "媒体別クリエイティブを更新",
        message: `${parsed.data.action} → ${status}。${parsed.data.note}`,
        type: `video_growth_variant_${parsed.data.action}`,
        leadId: parsed.data.variantId,
        priority: parsed.data.action === "publish" || parsed.data.action === "fail" ? 85 : 55,
      })
      return NextResponse.json({ ok: true, status, notification })
    }

    return NextResponse.json({ ok: false, error: "未対応の操作対象です" }, { status: 400 })
  } catch (error) {
    console.error("[video-growth-api] mutation failed:", error)
    const conflict = error instanceof Error && error.message.includes("revision conflict")
    return NextResponse.json({ ok: false, error: publicError(error) }, { status: conflict ? 409 : 422 })
  }
}
