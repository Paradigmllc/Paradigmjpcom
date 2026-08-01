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
import {
  createContentSchema,
  dailyMetricSchema,
  updateContentStatusSchema,
  updateProductSchema,
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
