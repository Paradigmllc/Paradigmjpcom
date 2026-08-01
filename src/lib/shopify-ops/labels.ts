import type { ContentPlatform, ContentStatus, ContentType, ProductStatus, ProductTier } from "./types"

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  candidate: "候補",
  sourcing: "仕入先確認",
  sample_ready: "サンプル準備済み",
  listing_ready: "商品ページ準備済み",
  live: "販売中",
  paused: "停止中",
  sold_out: "完売",
}

export const PRODUCT_TIER_LABELS: Record<ProductTier, string> = {
  s_plus: "S+",
  s: "S",
  a: "A",
  b: "B",
  c: "C",
  d: "D",
}

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  idea: "企画",
  scripted: "台本済み",
  filmed: "撮影済み",
  edited: "編集済み",
  scheduled: "公開予約",
  published: "公開済み",
  blocked: "要対応",
}

export const CONTENT_PLATFORM_LABELS: Record<ContentPlatform, string> = {
  multi: "全SNS",
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube Shorts",
  pinterest: "Pinterest",
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  discovery: "発見・驚き",
  product_demo: "商品説明",
  usage: "使用・実演",
  gift: "ギフト",
  comparison: "比較・ランキング",
  brand: "ブランド",
  shipping: "梱包・配送",
  ugc: "購入者UGC",
}
