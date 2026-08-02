import { randomUUID } from "node:crypto"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { calculateProductEconomics, calculateStoreProfitJpy } from "./economics"
import { getBaseSyncStatus } from "./base-sync-service"
import type {
  ShopifyOpsContentItem,
  ShopifyOpsDailyMetric,
  ShopifyOpsDashboard,
  ShopifyOpsProduct,
} from "./types"
import type {
  CreateContentInput,
  DailyMetricInput,
  UpdateContentStatusInput,
  UpdateProductInput,
} from "./schemas"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>
type DbRow = Record<string, unknown>

function requireDatabase(): ServiceSupabase {
  const database = getServiceSalesSupabase()
  if (!database) throw new Error("Shopify運営OSのデータベース接続が設定されていません")
  return database
}

function numberFrom(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function stringFrom(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function nullableStringFrom(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function productFromRow(row: DbRow): ShopifyOpsProduct {
  const priceUsd = numberFrom(row.price_usd)
  const procurementCostJpy = numberFrom(row.procurement_cost_jpy)
  const domesticShippingJpy = numberFrom(row.domestic_shipping_jpy)
  const economics = calculateProductEconomics({ priceUsd, procurementCostJpy, domesticShippingJpy })

  return {
    id: stringFrom(row.id),
    sku: stringFrom(row.sku),
    name: stringFrom(row.name),
    category: stringFrom(row.category),
    tier: row.tier as ShopifyOpsProduct["tier"],
    status: row.status as ShopifyOpsProduct["status"],
    isHero: row.is_hero === true,
    procurementCostJpy,
    domesticShippingJpy,
    priceUsd,
    weightGrams: numberFrom(row.weight_grams),
    inventoryOnHand: numberFrom(row.inventory_on_hand),
    clipTarget: numberFrom(row.clip_target),
    clipReady: numberFrom(row.clip_ready),
    photoTarget: numberFrom(row.photo_target),
    photoReady: numberFrom(row.photo_ready),
    shopifyProductId: nullableStringFrom(row.shopify_product_id),
    shopifyHandle: nullableStringFrom(row.shopify_handle),
    riskFlags: Array.isArray(row.risk_flags) ? row.risk_flags.filter((value): value is string => typeof value === "string") : [],
    notes: nullableStringFrom(row.notes),
    sortOrder: numberFrom(row.sort_order),
    estimatedMarginPercent: economics.estimatedMarginPercent,
    estimatedProfitJpy: economics.estimatedProfitJpy,
  }
}

function relatedProductName(value: unknown): string | null {
  if (Array.isArray(value)) return nullableStringFrom((value[0] as DbRow | undefined)?.name)
  if (value && typeof value === "object") return nullableStringFrom((value as DbRow).name)
  return null
}

function contentFromRow(row: DbRow): ShopifyOpsContentItem {
  return {
    id: stringFrom(row.id),
    productId: nullableStringFrom(row.product_id),
    productName: relatedProductName(row.shopify_ops_products),
    contentCode: stringFrom(row.content_code),
    platform: row.platform as ShopifyOpsContentItem["platform"],
    contentType: row.content_type as ShopifyOpsContentItem["contentType"],
    status: row.status as ShopifyOpsContentItem["status"],
    locale: stringFrom(row.locale),
    hook: stringFrom(row.hook),
    postUrl: nullableStringFrom(row.post_url),
    utmCampaign: nullableStringFrom(row.utm_campaign),
    videoViews: numberFrom(row.video_views),
    profileVisits: numberFrom(row.profile_visits),
    linkClicks: numberFrom(row.link_clicks),
    ordersAttributed: numberFrom(row.orders_attributed),
    revenueUsd: numberFrom(row.revenue_usd),
    scheduledFor: nullableStringFrom(row.scheduled_for),
    publishedAt: nullableStringFrom(row.published_at),
    errorMessage: nullableStringFrom(row.error_message),
  }
}

function metricFromRow(row: DbRow): ShopifyOpsDailyMetric {
  return {
    id: stringFrom(row.id),
    metricDate: stringFrom(row.metric_date),
    sessions: numberFrom(row.sessions),
    videoViews: numberFrom(row.video_views),
    profileVisits: numberFrom(row.profile_visits),
    linkClicks: numberFrom(row.link_clicks),
    productViews: numberFrom(row.product_views),
    addToCarts: numberFrom(row.add_to_carts),
    checkouts: numberFrom(row.checkouts),
    orders: numberFrom(row.orders),
    revenueUsd: numberFrom(row.revenue_usd),
    variableCostJpy: numberFrom(row.variable_cost_jpy),
    returnsCount: numberFrom(row.returns_count),
    tiktokFollowers: numberFrom(row.tiktok_followers),
    instagramFollowers: numberFrom(row.instagram_followers),
    notes: nullableStringFrom(row.notes),
  }
}

function connectionStatus(): ShopifyOpsDashboard["storeConnection"] {
  const domain = process.env.SHOPIFY_STORE_DOMAIN?.trim() || null
  const legacyToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim() || null
  const clientId = process.env.SHOPIFY_CLIENT_ID?.trim() || null
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET?.trim() || null
  const apiVersion = process.env.SHOPIFY_API_VERSION?.trim() || null
  return { configured: Boolean(domain && apiVersion && (legacyToken || (clientId && clientSecret))), domain, apiVersion }
}

export async function getShopifyOpsDashboard(): Promise<ShopifyOpsDashboard> {
  const database = requireDatabase()
  const [productsResult, contentResult, metricsResult, baseSync] = await Promise.all([
    database.from(DB_TABLES.SHOPIFY_OPS_PRODUCTS).select("*").order("sort_order", { ascending: true }),
    database
      .from(DB_TABLES.SHOPIFY_OPS_CONTENT_ITEMS)
      .select("*, shopify_ops_products(name)")
      .order("created_at", { ascending: false })
      .limit(200),
    database
      .from(DB_TABLES.SHOPIFY_OPS_DAILY_METRICS)
      .select("*")
      .order("metric_date", { ascending: false })
      .limit(30),
    getBaseSyncStatus(),
  ])

  if (productsResult.error) throw new Error(`商品データの取得に失敗しました: ${productsResult.error.message}`)
  if (contentResult.error) throw new Error(`コンテンツデータの取得に失敗しました: ${contentResult.error.message}`)
  if (metricsResult.error) throw new Error(`KPIデータの取得に失敗しました: ${metricsResult.error.message}`)

  const products = ((productsResult.data ?? []) as DbRow[]).map(productFromRow)
  const contentItems = ((contentResult.data ?? []) as DbRow[]).map(contentFromRow)
  const dailyMetrics = ((metricsResult.data ?? []) as DbRow[]).map(metricFromRow)
  const totals30d = dailyMetrics.reduce(
    (totals, row) => ({
      sessions: totals.sessions + row.sessions,
      videoViews: totals.videoViews + row.videoViews,
      linkClicks: totals.linkClicks + row.linkClicks,
      orders: totals.orders + row.orders,
      revenueUsd: totals.revenueUsd + row.revenueUsd,
      estimatedProfitJpy: totals.estimatedProfitJpy + calculateStoreProfitJpy(row.revenueUsd, row.variableCostJpy),
      conversionRate: 0,
      linkClickRate: 0,
    }),
    { sessions: 0, videoViews: 0, linkClicks: 0, orders: 0, revenueUsd: 0, estimatedProfitJpy: 0, conversionRate: 0, linkClickRate: 0 },
  )
  totals30d.conversionRate = totals30d.sessions > 0 ? Math.round((totals30d.orders / totals30d.sessions) * 10_000) / 100 : 0
  totals30d.linkClickRate = totals30d.videoViews > 0 ? Math.round((totals30d.linkClicks / totals30d.videoViews) * 10_000) / 100 : 0

  const heroProducts = products.filter((product) => product.isHero)
  const listingReadyHeroes = heroProducts.filter((product) => ["listing_ready", "live"].includes(product.status)).length
  const readyVideos = contentItems.filter((item) => ["edited", "scheduled", "published"].includes(item.status)).length
  const publishedPosts = contentItems.filter((item) => item.status === "published").length
  const readyPhotos = heroProducts.reduce((sum, product) => sum + product.photoReady, 0)
  const storeConnection = connectionStatus()

  return {
    generatedAt: new Date().toISOString(),
    storeConnection,
    products,
    contentItems,
    dailyMetrics,
    baseSync,
    totals30d,
    launchReadiness: [
      { key: "hero", label: "Hero商品", current: listingReadyHeroes, target: 6, unit: "商品", ready: listingReadyHeroes >= 6 },
      { key: "video", label: "完成動画", current: readyVideos, target: 40, unit: "本", ready: readyVideos >= 40 },
      { key: "posts", label: "初期公開投稿", current: publishedPosts, target: 12, unit: "本", ready: publishedPosts >= 12 },
      { key: "photos", label: "Hero商品写真", current: readyPhotos, target: 48, unit: "枚", ready: readyPhotos >= 48 },
      { key: "shopify", label: "Shopify接続", current: storeConnection.configured ? 1 : 0, target: 1, unit: "接続", ready: storeConnection.configured },
    ],
    goals: { orders: 500, sessions: 25_000, videoViews: 2_500_000, profitJpy: 5_000_000, freeShippingUsd: 120 },
  }
}

export async function updateShopifyOpsProduct(input: UpdateProductInput): Promise<ShopifyOpsProduct> {
  const database = requireDatabase()
  const { data: existing, error: existingError } = await database
    .from(DB_TABLES.SHOPIFY_OPS_PRODUCTS)
    .select("clip_target, photo_target")
    .eq("id", input.id)
    .single()
  if (existingError) throw new Error(`商品が見つかりません: ${existingError.message}`)
  if (input.clipReady > numberFrom(existing.clip_target) || input.photoReady > numberFrom(existing.photo_target)) {
    throw new Error("完成素材数は目標数を超えて登録できません")
  }

  const { data, error } = await database
    .from(DB_TABLES.SHOPIFY_OPS_PRODUCTS)
    .update({
      status: input.status,
      inventory_on_hand: input.inventoryOnHand,
      clip_ready: input.clipReady,
      photo_ready: input.photoReady,
      shopify_handle: input.shopifyHandle || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("*")
    .single()
  if (error) throw new Error(`商品の更新に失敗しました: ${error.message}`)
  return productFromRow(data as DbRow)
}

export async function createShopifyOpsContent(input: CreateContentInput): Promise<ShopifyOpsContentItem> {
  const database = requireDatabase()
  const suffix = randomUUID().slice(0, 8).toUpperCase()
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "")
  const { data, error } = await database
    .from(DB_TABLES.SHOPIFY_OPS_CONTENT_ITEMS)
    .insert({
      product_id: input.productId || null,
      content_code: `TSJ-${date}-${suffix}`,
      platform: input.platform,
      content_type: input.contentType,
      hook: input.hook,
      locale: input.locale,
    })
    .select("*, shopify_ops_products(name)")
    .single()
  if (error) throw new Error(`コンテンツの作成に失敗しました: ${error.message}`)
  return contentFromRow(data as DbRow)
}

export async function updateShopifyOpsContentStatus(input: UpdateContentStatusInput): Promise<ShopifyOpsContentItem> {
  const database = requireDatabase()
  const patch: Record<string, unknown> = { status: input.status, updated_at: new Date().toISOString() }
  if (input.status === "published") patch.published_at = new Date().toISOString()
  if (input.status !== "blocked") patch.error_message = null

  const { data, error } = await database
    .from(DB_TABLES.SHOPIFY_OPS_CONTENT_ITEMS)
    .update(patch)
    .eq("id", input.id)
    .select("*, shopify_ops_products(name)")
    .single()
  if (error) throw new Error(`コンテンツ状態の更新に失敗しました: ${error.message}`)
  return contentFromRow(data as DbRow)
}

export async function upsertShopifyOpsDailyMetric(input: DailyMetricInput): Promise<ShopifyOpsDailyMetric> {
  const database = requireDatabase()
  const { data, error } = await database
    .from(DB_TABLES.SHOPIFY_OPS_DAILY_METRICS)
    .upsert({
      metric_date: input.metricDate,
      sessions: input.sessions,
      video_views: input.videoViews,
      profile_visits: input.profileVisits,
      link_clicks: input.linkClicks,
      product_views: input.productViews,
      add_to_carts: input.addToCarts,
      checkouts: input.checkouts,
      orders: input.orders,
      revenue_usd: input.revenueUsd,
      variable_cost_jpy: input.variableCostJpy,
      tiktok_followers: input.tiktokFollowers,
      instagram_followers: input.instagramFollowers,
      notes: input.notes || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "metric_date" })
    .select("*")
    .single()
  if (error) throw new Error(`KPIの保存に失敗しました: ${error.message}`)
  return metricFromRow(data as DbRow)
}
