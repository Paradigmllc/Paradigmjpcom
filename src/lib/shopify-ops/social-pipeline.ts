import { randomUUID } from "node:crypto"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { evaluateProductPublicationGate, productDestinationUrl } from "./product-readiness"
import { getSocialConnectorStatuses, publishSocialPost } from "./social-publisher"
import type { ShopifySocialAutomationStatus, ShopifySocialRun } from "./types"

type DbRow = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

function requireDatabase(): ServiceSupabase {
  const database = getServiceSalesSupabase()
  if (!database) throw new Error("SNS自動化用データベースが設定されていません")
  return database
}

function stringFrom(value: unknown): string { return typeof value === "string" ? value : "" }
function nullableStringFrom(value: unknown): string | null { return typeof value === "string" && value.length > 0 ? value : null }
function numberFrom(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) ? number : 0
}

function socialRunFromRow(row: DbRow): ShopifySocialRun {
  return {
    id: stringFrom(row.id), runDate: stringFrom(row.run_date), status: row.status as ShopifySocialRun["status"],
    eligibleProductCount: numberFrom(row.eligible_product_count), generatedPostCount: numberFrom(row.generated_post_count),
    publishedPostCount: numberFrom(row.published_post_count), failedPostCount: numberFrom(row.failed_post_count),
    blockedReason: nullableStringFrom(row.blocked_reason), startedAt: stringFrom(row.started_at),
    completedAt: nullableStringFrom(row.completed_at),
  }
}

export function tokyoDateString(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ""
  return `${part("year")}-${part("month")}-${part("day")}`
}

function productGateFromRow(row: DbRow) {
  return evaluateProductPublicationGate({
    status: stringFrom(row.status), inventoryOnHand: numberFrom(row.inventory_on_hand), photoReady: numberFrom(row.photo_ready),
    shopifyHandle: nullableStringFrom(row.shopify_handle), supplierUrl: nullableStringFrom(row.supplier_url),
    primaryImageUrl: nullableStringFrom(row.primary_image_url), originCountryCode: nullableStringFrom(row.origin_country_code),
    hsCode: nullableStringFrom(row.hs_code), fulfillmentDays: numberFrom(row.fulfillment_days),
    supplierVerified: row.supplier_verified === true, sampleVerified: row.sample_verified === true,
    imageRightsVerified: row.image_rights_verified === true, complianceVerified: row.compliance_verified === true,
    fulfillmentVerified: row.fulfillment_verified === true,
  })
}

function captionFor(row: DbRow, platform: "instagram" | "pinterest", destinationUrl: string): string {
  const name = stringFrom(row.name)
  const category = stringFrom(row.category)
  const price = numberFrom(row.price_usd)
  const lead = platform === "instagram"
    ? `A small piece of Japan, chosen for everyday life: ${name}.`
    : `${name} — Japanese ${category} selected by SERICIA.`
  return `${lead}\n\nShips from Japan. $${price.toFixed(2)} USD. See materials, dimensions and delivery details before ordering.\n\n${destinationUrl}\n\n#SERICIA #MadeInJapan #JapaneseCraft #ShopSmall`
}

async function publishDuePosts(database: ServiceSupabase): Promise<{ published: number; failed: number }> {
  const { data, error } = await database.from(DB_TABLES.SHOPIFY_OPS_CONTENT_ITEMS).select("*")
    .eq("status", "scheduled").not("approved_at", "is", null).is("external_post_id", null)
    .lte("scheduled_for", new Date().toISOString()).in("platform", ["instagram", "pinterest"]).limit(10)
  if (error) throw new Error(`SNS公開キューの取得に失敗しました: ${error.message}`)
  const connectorMap = new Map(getSocialConnectorStatuses().map((item) => [item.platform, item]))
  let published = 0
  let failed = 0
  for (const row of (data ?? []) as DbRow[]) {
    const platform = row.platform === "instagram" ? "instagram" : "pinterest"
    if (!connectorMap.get(platform)?.configured) continue
    const caption = nullableStringFrom(row.caption)
    const mediaUrl = nullableStringFrom(row.media_url)
    const destinationUrl = nullableStringFrom(row.destination_url)
    if (!caption || !mediaUrl || !destinationUrl) {
      failed += 1
      const { error: updateError } = await database.from(DB_TABLES.SHOPIFY_OPS_CONTENT_ITEMS).update({
        status: "blocked", error_message: "公開本文・画像・商品URLのいずれかが不足しています", updated_at: new Date().toISOString(),
      }).eq("id", row.id)
      if (updateError) console.error("[social-pipeline] invalid post update failed:", updateError)
      continue
    }
    try {
      const result = await publishSocialPost({ platform, caption, mediaUrl, destinationUrl })
      const { error: updateError } = await database.from(DB_TABLES.SHOPIFY_OPS_CONTENT_ITEMS).update({
        status: "published", post_url: result.postUrl, external_post_id: result.externalPostId,
        published_at: new Date().toISOString(), publish_attempts: numberFrom(row.publish_attempts) + 1,
        last_publish_attempt_at: new Date().toISOString(), error_message: null, updated_at: new Date().toISOString(),
      }).eq("id", row.id)
      if (updateError) throw new Error(updateError.message)
      published += 1
    } catch (error) {
      console.error(`[social-pipeline] ${platform} publish failed:`, error)
      failed += 1
      const attempts = numberFrom(row.publish_attempts) + 1
      const { error: updateError } = await database.from(DB_TABLES.SHOPIFY_OPS_CONTENT_ITEMS).update({
        status: attempts >= 3 ? "blocked" : "scheduled", publish_attempts: attempts,
        last_publish_attempt_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message.slice(0, 500) : "SNS公開に失敗しました",
        updated_at: new Date().toISOString(),
      }).eq("id", row.id)
      if (updateError) console.error("[social-pipeline] publish failure persistence failed:", updateError)
    }
  }
  return { published, failed }
}

export async function getSocialAutomationStatus(): Promise<ShopifySocialAutomationStatus> {
  const database = requireDatabase()
  const [products, runs, scheduled, published, failed] = await Promise.all([
    database.from(DB_TABLES.SHOPIFY_OPS_PRODUCTS).select("*"),
    database.from(DB_TABLES.SHOPIFY_SOCIAL_RUNS).select("*").order("run_date", { ascending: false }).limit(14),
    database.from(DB_TABLES.SHOPIFY_OPS_CONTENT_ITEMS).select("id", { count: "exact", head: true }).eq("auto_generated", true).eq("status", "scheduled"),
    database.from(DB_TABLES.SHOPIFY_OPS_CONTENT_ITEMS).select("id", { count: "exact", head: true }).eq("auto_generated", true).eq("status", "published"),
    database.from(DB_TABLES.SHOPIFY_OPS_CONTENT_ITEMS).select("id", { count: "exact", head: true }).eq("auto_generated", true).eq("status", "blocked"),
  ])
  for (const result of [products, runs, scheduled, published, failed]) {
    if (result.error) throw new Error(`SNS運用状況の取得に失敗しました: ${result.error.message}`)
  }
  const readyProductCount = ((products.data ?? []) as DbRow[]).filter((row) => productGateFromRow(row).ready).length
  return {
    connectors: getSocialConnectorStatuses(), recentRuns: ((runs.data ?? []) as DbRow[]).map(socialRunFromRow), readyProductCount,
    scheduledPostCount: scheduled.count ?? 0, publishedPostCount: published.count ?? 0, failedPostCount: failed.count ?? 0,
  }
}

export async function runDailySocialPipeline(runDate = tokyoDateString()): Promise<ShopifySocialRun> {
  const database = requireDatabase()
  const { data: existing, error: existingError } = await database.from(DB_TABLES.SHOPIFY_SOCIAL_RUNS).select("*").eq("run_date", runDate).maybeSingle()
  if (existingError) throw new Error(`SNS日次実行履歴の確認に失敗しました: ${existingError.message}`)
  let runId = existing ? stringFrom((existing as DbRow).id) : randomUUID()
  if (!existing) {
    const { error } = await database.from(DB_TABLES.SHOPIFY_SOCIAL_RUNS).upsert(
      { id: runId, run_date: runDate, status: "running" },
      { onConflict: "run_date", ignoreDuplicates: true },
    )
    if (error) throw new Error(`SNS日次実行の開始に失敗しました: ${error.message}`)
    const { data: claimed, error: claimedError } = await database.from(DB_TABLES.SHOPIFY_SOCIAL_RUNS).select("id").eq("run_date", runDate).single()
    if (claimedError) throw new Error(`SNS日次実行IDの取得に失敗しました: ${claimedError.message}`)
    runId = stringFrom((claimed as DbRow).id)
  }

  try {
    const { data, error } = await database.from(DB_TABLES.SHOPIFY_OPS_PRODUCTS).select("*").order("sort_order", { ascending: true })
    if (error) throw new Error(`商品公開ゲートの取得に失敗しました: ${error.message}`)
    const rows = (data ?? []) as DbRow[]
    const eligible = rows.filter((row) => productGateFromRow(row).ready)
    let generated = 0
    let blockedReason: string | null = null
    if (eligible.length === 0) {
      blockedReason = rows.length === 0
        ? "実在商品がまだ登録されていません"
        : "公開ゲート（在庫・現物・画像権利・輸出情報・Shopify URL）を通過した商品がありません"
    } else {
      const dayNumber = Number(runDate.replaceAll("-", ""))
      const product = eligible[dayNumber % eligible.length]
      const destinationUrl = productDestinationUrl(nullableStringFrom(product.shopify_handle))
      const mediaUrl = nullableStringFrom(product.primary_image_url)
      if (!destinationUrl || !mediaUrl) throw new Error("公開ゲート通過後に商品URLまたは画像URLが失われました")
      const posts = [
        { platform: "instagram" as const, contentType: "product_demo", scheduledFor: `${runDate}T09:00:00.000Z` },
        { platform: "pinterest" as const, contentType: "discovery", scheduledFor: `${runDate}T17:00:00.000Z` },
      ]
      for (const post of posts) {
        const { error: insertError } = await database.from(DB_TABLES.SHOPIFY_OPS_CONTENT_ITEMS).upsert({
          product_id: product.id, content_code: `SERICIA-${runDate.replaceAll("-", "")}-${post.platform.toUpperCase()}`,
          platform: post.platform, content_type: post.contentType, status: "scheduled", locale: "en",
          hook: captionFor(product, post.platform, destinationUrl).split("\n")[0],
          caption: captionFor(product, post.platform, destinationUrl), media_url: mediaUrl, destination_url: destinationUrl,
          utm_campaign: `sericia_daily_${runDate.replaceAll("-", "")}`, auto_generated: true, generation_date: runDate,
          approved_at: new Date().toISOString(), approved_by: "sericia:auto-policy-v1", scheduled_for: post.scheduledFor,
          updated_at: new Date().toISOString(),
        }, { onConflict: "content_code", ignoreDuplicates: true })
        if (insertError) throw new Error(`SNS下書きの保存に失敗しました: ${insertError.message}`)
        generated += 1
      }
    }
    const delivery = await publishDuePosts(database)
    const completedAt = new Date().toISOString()
    const status = blockedReason ? "blocked" : "succeeded"
    const { data: updated, error: updateError } = await database.from(DB_TABLES.SHOPIFY_SOCIAL_RUNS).update({
      status, eligible_product_count: eligible.length, generated_post_count: generated,
      published_post_count: delivery.published, failed_post_count: delivery.failed,
      blocked_reason: blockedReason, completed_at: completedAt, updated_at: completedAt,
      summary: { connectorStatus: getSocialConnectorStatuses() },
    }).eq("id", runId).select("*").single()
    if (updateError) throw new Error(`SNS日次実行履歴の更新に失敗しました: ${updateError.message}`)
    return socialRunFromRow(updated as DbRow)
  } catch (error) {
    console.error("[social-pipeline] daily run failed:", error)
    const completedAt = new Date().toISOString()
    const { error: updateError } = await database.from(DB_TABLES.SHOPIFY_SOCIAL_RUNS).update({
      status: "failed", blocked_reason: error instanceof Error ? error.message.slice(0, 500) : "SNS日次実行に失敗しました",
      failed_post_count: 1, completed_at: completedAt, updated_at: completedAt,
    }).eq("id", runId)
    if (updateError) console.error("[social-pipeline] failed run persistence failed:", updateError)
    throw error
  }
}
