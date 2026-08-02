export const PRODUCT_STATUSES = [
  "candidate",
  "sourcing",
  "sample_ready",
  "listing_ready",
  "live",
  "paused",
  "sold_out",
] as const

export const CONTENT_STATUSES = [
  "idea",
  "scripted",
  "filmed",
  "edited",
  "scheduled",
  "published",
  "blocked",
] as const

export const CONTENT_PLATFORMS = ["multi", "tiktok", "instagram", "youtube", "pinterest"] as const
export const CONTENT_TYPES = ["discovery", "product_demo", "usage", "gift", "comparison", "brand", "shipping", "ugc"] as const

export type ProductStatus = (typeof PRODUCT_STATUSES)[number]
export type ContentStatus = (typeof CONTENT_STATUSES)[number]
export type ContentPlatform = (typeof CONTENT_PLATFORMS)[number]
export type ContentType = (typeof CONTENT_TYPES)[number]
export type ProductTier = "s_plus" | "s" | "a" | "b" | "c" | "d"

export type ShopifyOpsProduct = {
  id: string
  sku: string
  name: string
  category: string
  tier: ProductTier
  status: ProductStatus
  isHero: boolean
  procurementCostJpy: number
  domesticShippingJpy: number
  priceUsd: number
  weightGrams: number
  inventoryOnHand: number
  clipTarget: number
  clipReady: number
  photoTarget: number
  photoReady: number
  shopifyProductId: string | null
  shopifyHandle: string | null
  riskFlags: string[]
  notes: string | null
  sortOrder: number
  estimatedMarginPercent: number
  estimatedProfitJpy: number
}

export type ShopifyOpsContentItem = {
  id: string
  productId: string | null
  productName: string | null
  contentCode: string
  platform: ContentPlatform
  contentType: ContentType
  status: ContentStatus
  locale: string
  hook: string
  postUrl: string | null
  utmCampaign: string | null
  videoViews: number
  profileVisits: number
  linkClicks: number
  ordersAttributed: number
  revenueUsd: number
  scheduledFor: string | null
  publishedAt: string | null
  errorMessage: string | null
}

export type ShopifyOpsDailyMetric = {
  id: string
  metricDate: string
  sessions: number
  videoViews: number
  profileVisits: number
  linkClicks: number
  productViews: number
  addToCarts: number
  checkouts: number
  orders: number
  revenueUsd: number
  variableCostJpy: number
  returnsCount: number
  tiktokFollowers: number
  instagramFollowers: number
  notes: string | null
}

export type BaseSyncRunStatus = "running" | "succeeded" | "failed" | "blocked"
export type BaseSyncMode = "dry_run" | "apply"

export type BaseSyncRun = {
  id: string
  mode: BaseSyncMode
  status: BaseSyncRunStatus
  sourceCount: number
  createdCount: number
  updatedCount: number
  skippedCount: number
  failedCount: number
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
}

export type BaseSyncPreviewItem = {
  baseItemId: number
  title: string
  sku: string
  priceJpy: number
  inventory: number
  imageCount: number
  variationCount: number
  collectionHandle: "tableware" | "craft" | "living" | "gifts"
  visibleInBase: boolean
}

export type BaseSyncStatus = {
  baseAppConfigured: boolean
  baseShopConnected: boolean
  shopifyConfigured: boolean
  syncRunning: boolean
  readyToSync: boolean
  lastRun: BaseSyncRun | null
  recentRuns: BaseSyncRun[]
  linkedProductCount: number
  previewItems: BaseSyncPreviewItem[]
}

export type ShopifyOpsTotals = {
  sessions: number
  videoViews: number
  linkClicks: number
  orders: number
  revenueUsd: number
  estimatedProfitJpy: number
  conversionRate: number
  linkClickRate: number
}

export type LaunchReadinessItem = {
  key: string
  label: string
  current: number
  target: number
  unit: string
  ready: boolean
}

export type ShopifyOpsDashboard = {
  generatedAt: string
  storeConnection: {
    configured: boolean
    domain: string | null
    apiVersion: string | null
  }
  products: ShopifyOpsProduct[]
  contentItems: ShopifyOpsContentItem[]
  dailyMetrics: ShopifyOpsDailyMetric[]
  baseSync: BaseSyncStatus
  totals30d: ShopifyOpsTotals
  launchReadiness: LaunchReadinessItem[]
  goals: {
    orders: number
    sessions: number
    videoViews: number
    profitJpy: number
    freeShippingUsd: number
  }
}
