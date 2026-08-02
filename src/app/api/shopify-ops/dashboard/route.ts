import { NextRequest, NextResponse } from "next/server"
import { authorizePayloadAdminRequest, authorizeWebhookRequest } from "@/lib/admin-auth"
import { notifyBothChannels } from "@/lib/notify"
import {
  createShopifyOpsContent,
  getShopifyOpsDashboard,
  updateShopifyOpsContentStatus,
  updateShopifyOpsProduct,
  upsertShopifyOpsDailyMetric,
} from "@/lib/shopify-ops/repository"
import { runBaseToShopifySync } from "@/lib/shopify-ops/base-sync-service"
import { runDailySocialPipeline, tokyoDateString } from "@/lib/shopify-ops/social-pipeline"
import {
  createContentSchema,
  dailyMetricSchema,
  updateContentStatusSchema,
  updateProductSchema,
  baseSyncSchema,
  socialRunSchema,
} from "@/lib/shopify-ops/schemas"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function authorized(request: NextRequest): Promise<boolean> {
  if (authorizeWebhookRequest(request.headers).ok) return true
  const auth = await authorizePayloadAdminRequest({
    headers: request.headers,
    legacyToken: request.cookies.get("paradigm_admin_token")?.value,
  })
  return auth.ok
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  try {
    return NextResponse.json({ ok: true, dashboard: await getShopifyOpsDashboard() })
  } catch (error) {
    console.error("[shopify-ops-api] dashboard read failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Dashboard read failed" },
      { status: 500 },
    )
  }
}
export async function POST(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const action = body.action
    let result: unknown
    let message: string

    if (action === "update_product") {
      result = await updateShopifyOpsProduct(updateProductSchema.parse(body))
      message = "商品を更新しました"
    } else if (action === "create_content") {
      result = await createShopifyOpsContent(createContentSchema.parse(body))
      message = "コンテンツを作成しました"
    } else if (action === "update_content_status") {
      result = await updateShopifyOpsContentStatus(updateContentStatusSchema.parse(body))
      message = "コンテンツ状態を更新しました"
    } else if (action === "upsert_daily_metric") {
      result = await upsertShopifyOpsDailyMetric(dailyMetricSchema.parse(body))
      message = "日次KPIを保存しました"
    } else if (action === "run_base_sync") {
      const input = baseSyncSchema.parse(body)
      result = await runBaseToShopifySync(input.mode)
      message = input.mode === "dry_run" ? "BASE同期dry-runを実行しました" : "BASEからShopifyへ商品を同期しました"
    } else if (action === "run_social_daily") {
      const input = socialRunSchema.parse(body)
      result = await runDailySocialPipeline(input.runDate || tokyoDateString())
      message = "SNS日次生成・公開キューを実行しました"
    } else {
      return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 })
    }

    await notifyBothChannels(`Shopify運営API: ${message}`, {
      title: "Tiny Shops API更新",
      message,
      link: "/ja/admin/shopify",
      type: "shopify_ops_api_update",
      region: "global",
      priority: 60,
    })
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error("[shopify-ops-api] mutation failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Mutation failed" },
      { status: 400 },
    )
  }
}
