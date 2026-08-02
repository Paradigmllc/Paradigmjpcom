"use server"

import { revalidatePath } from "next/cache"
import { cookies, headers } from "next/headers"
import { authorizePayloadAdminRequest } from "@/lib/admin-auth"
import { notifyBothChannels } from "@/lib/notify"
import {
  createShopifyOpsContent,
  updateShopifyOpsContentStatus,
  updateShopifyOpsProduct,
  upsertShopifyOpsDailyMetric,
} from "@/lib/shopify-ops/repository"
import { runBaseToShopifySync } from "@/lib/shopify-ops/base-sync-service"
import { runDailySocialPipeline, tokyoDateString } from "@/lib/shopify-ops/social-pipeline"
import { runLaunchAudit } from "@/lib/shopify-ops/launch-control"
import {
  createContentSchema,
  dailyMetricSchema,
  updateContentStatusSchema,
  updateProductSchema,
  baseSyncSchema,
  socialRunSchema,
} from "@/lib/shopify-ops/schemas"

export type ShopifyOpsActionResult = { ok: true; message: string } | { ok: false; error: string }

async function requireAdmin(): Promise<void> {
  const cookieStore = await cookies()
  const requestHeaders = await headers()
  const auth = await authorizePayloadAdminRequest({
    headers: new Headers(requestHeaders),
    legacyToken: cookieStore.get("paradigm_admin_token")?.value,
  })
  if (!auth.ok) throw new Error("管理者認証が必要です")
}

function localeFrom(formData: FormData): string {
  const value = formData.get("pageLocale") ?? formData.get("locale")
  return typeof value === "string" && /^[a-z]{2}(?:-[A-Z]{2})?$/.test(value) ? value : "ja"
}

function formObject(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries())
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "予期せぬエラーが発生しました"
}

export async function updateProductAction(formData: FormData): Promise<ShopifyOpsActionResult> {
  try {
    await requireAdmin()
    const input = updateProductSchema.parse(formObject(formData))
    const product = await updateShopifyOpsProduct(input)
    await notifyBothChannels(`Shopify商品更新: ${product.name} → ${product.status}`, {
      title: "Tiny Shops 商品更新",
      message: `${product.name} の状態を ${product.status} に更新しました。`,
      link: "/ja/admin/shopify",
      type: "shopify_ops_product_update",
      region: "global",
      priority: product.status === "live" ? 90 : 60,
    })
    revalidatePath(`/${localeFrom(formData)}/admin/shopify`)
    return { ok: true, message: `${product.name}を更新しました` }
  } catch (error) {
    console.error("[shopify-ops-action] product update failed:", error)
    return { ok: false, error: errorMessage(error) }
  }
}

export async function createContentAction(formData: FormData): Promise<ShopifyOpsActionResult> {
  try {
    await requireAdmin()
    const input = createContentSchema.parse(formObject(formData))
    const item = await createShopifyOpsContent(input)
    await notifyBothChannels(`Shopifyコンテンツ作成: ${item.contentCode}`, {
      title: "Tiny Shops コンテンツ追加",
      message: `${item.platform}向けの制作カードを追加しました。`,
      link: "/ja/admin/shopify",
      type: "shopify_ops_content_created",
      region: "global",
      priority: 55,
    })
    revalidatePath(`/${localeFrom(formData)}/admin/shopify`)
    return { ok: true, message: "コンテンツ制作カードを追加しました" }
  } catch (error) {
    console.error("[shopify-ops-action] content creation failed:", error)
    return { ok: false, error: errorMessage(error) }
  }
}

export async function updateContentStatusAction(formData: FormData): Promise<ShopifyOpsActionResult> {
  try {
    await requireAdmin()
    const input = updateContentStatusSchema.parse(formObject(formData))
    const item = await updateShopifyOpsContentStatus(input)
    await notifyBothChannels(`Shopifyコンテンツ更新: ${item.contentCode} → ${item.status}`, {
      title: "Tiny Shops コンテンツ更新",
      message: `${item.contentCode} の状態を ${item.status} に更新しました。`,
      link: "/ja/admin/shopify",
      type: "shopify_ops_content_update",
      region: "global",
      priority: item.status === "published" ? 75 : 50,
    })
    revalidatePath(`/${localeFrom(formData)}/admin/shopify`)
    return { ok: true, message: "コンテンツ状態を更新しました" }
  } catch (error) {
    console.error("[shopify-ops-action] content status update failed:", error)
    return { ok: false, error: errorMessage(error) }
  }
}

export async function upsertDailyMetricAction(formData: FormData): Promise<ShopifyOpsActionResult> {
  try {
    await requireAdmin()
    const input = dailyMetricSchema.parse(formObject(formData))
    const metric = await upsertShopifyOpsDailyMetric(input)
    await notifyBothChannels(`Shopify KPI保存: ${metric.metricDate} / ${metric.orders}注文`, {
      title: "Tiny Shops 日次KPI",
      message: `${metric.metricDate}のKPIを保存しました。注文 ${metric.orders}件、売上 $${metric.revenueUsd.toLocaleString()}。`,
      link: "/ja/admin/shopify",
      type: "shopify_ops_daily_metric",
      region: "global",
      priority: metric.orders > 0 ? 70 : 45,
    })
    revalidatePath(`/${localeFrom(formData)}/admin/shopify`)
    return { ok: true, message: `${metric.metricDate}のKPIを保存しました` }
  } catch (error) {
    console.error("[shopify-ops-action] metric upsert failed:", error)
    return { ok: false, error: errorMessage(error) }
  }
}

export async function runBaseSyncAction(formData: FormData): Promise<ShopifyOpsActionResult> {
  try {
    await requireAdmin()
    const input = baseSyncSchema.parse(formObject(formData))
    const run = await runBaseToShopifySync(input.mode)
    const modeLabel = input.mode === "dry_run" ? "dry-run" : "本同期"
    const message = `${modeLabel}: BASE ${run.sourceCount}件 / 新規 ${run.createdCount}件 / 更新 ${run.updatedCount}件 / 失敗 ${run.failedCount}件`
    const notification = await notifyBothChannels(`SERICIA BASE同期 ${message}`, {
      title: "SERICIA BASE同期",
      message,
      link: "/ja/admin/shopify",
      type: "shopify_base_sync",
      region: "global",
      priority: run.failedCount > 0 ? 90 : 70,
    })
    if (!notification.ok) console.error("[shopify-ops-action] BASE sync notification incomplete:", notification)
    revalidatePath(`/${localeFrom(formData)}/admin/shopify`)
    return run.failedCount > 0
      ? { ok: false, error: message }
      : { ok: true, message }
  } catch (error) {
    console.error("[shopify-ops-action] BASE sync failed:", error)
    return { ok: false, error: errorMessage(error) }
  }
}

export async function runSocialPipelineAction(formData: FormData): Promise<ShopifyOpsActionResult> {
  try {
    await requireAdmin()
    const input = socialRunSchema.parse(formObject(formData))
    const run = await runDailySocialPipeline(input.runDate || tokyoDateString())
    const message = run.status === "blocked"
      ? `SNS日次準備を停止: ${run.blockedReason}`
      : `SNS日次準備: ${run.generatedPostCount}件生成 / ${run.publishedPostCount}件公開 / ${run.failedPostCount}件失敗`
    const notification = await notifyBothChannels(`SERICIA ${message}`, {
      title: "SERICIA SNS日次パイプライン", message, link: "/ja/admin/shopify", type: "shopify_social_daily_run",
      region: "global", priority: run.status === "failed" ? 95 : run.status === "blocked" ? 70 : 60,
      idempotencyKey: `shopify-social:${run.runDate}:${run.status}`,
    })
    if (!notification.ok) console.error("[shopify-ops-action] social notification incomplete:", notification)
    revalidatePath(`/${localeFrom(formData)}/admin/shopify`)
    return run.status === "failed" ? { ok: false, error: message } : { ok: true, message }
  } catch (error) {
    console.error("[shopify-ops-action] social pipeline failed:", error)
    return { ok: false, error: errorMessage(error) }
  }
}

export async function runLaunchAuditAction(formData: FormData): Promise<ShopifyOpsActionResult> {
  try {
    await requireAdmin()
    const result = await runLaunchAudit("manual")
    const message = result.audit.status === "ready"
      ? `ローンチ条件 ${result.audit.totalGateCount}/${result.audit.totalGateCount} を通過しました`
      : `ローンチ条件 ${result.audit.readyGateCount}/${result.audit.totalGateCount}。未達${result.audit.blockers.length}件は安全停止中です`
    const notification = result.notifyOperator
      ? await notifyBothChannels(`SERICIA ${message}`, {
          title: "SERICIA ローンチ監査",
          message,
          link: "/ja/admin/shopify",
          type: "shopify_launch_audit_manual",
          region: "global",
          priority: result.audit.status === "ready" ? 90 : 70,
          idempotencyKey: `shopify-launch-audit:${result.audit.fingerprint}:${result.audit.status}`,
        })
      : null
    if (notification && !notification.ok) console.error("[shopify-ops-action] launch audit notification incomplete:", notification)
    revalidatePath(`/${localeFrom(formData)}/admin/shopify`)
    return { ok: true, message }
  } catch (error) {
    console.error("[shopify-ops-action] launch audit failed:", error)
    return { ok: false, error: errorMessage(error) }
  }
}
