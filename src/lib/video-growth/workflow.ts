import type {
  VideoGrowthCampaign,
  VideoGrowthCampaignStatus,
  VideoGrowthChannel,
  VideoGrowthVariant,
} from "./types"

export const CHANNEL_DEFINITIONS: Record<VideoGrowthChannel, {
  label: string
  purpose: string
  format: string
  maxCaptionLength: number
}> = {
  x: {
    label: "X",
    purpose: "専門性と短い問題提起でLPクリックを獲得",
    format: "1:1 · 1080×1080 · 30秒",
    maxCaptionLength: 280,
  },
  instagram: {
    label: "Instagram",
    purpose: "縦型Reelsで制作品質と変化を視覚訴求",
    format: "9:16 · 1080×1920 · 30秒",
    maxCaptionLength: 2200,
  },
  linkedin: {
    label: "LinkedIn",
    purpose: "B2B意思決定者へ証拠と業務成果を提示",
    format: "1:1 · 1080×1080 · 45秒",
    maxCaptionLength: 3000,
  },
  cold_email: {
    label: "コールド営業",
    purpose: "許可ベースの短いメールから個別動画とLPへ誘導",
    format: "16:9 · 1280×720 · 45秒",
    maxCaptionLength: 1200,
  },
}

export const CAMPAIGN_STATUS_LABELS: Record<VideoGrowthCampaignStatus, string> = {
  draft: "制作中",
  review_ready: "レビュー待ち",
  human_approved: "人間承認済み",
  scheduled: "配信予定",
  active: "配信中",
  paused: "一時停止",
  completed: "完了",
  cancelled: "中止",
}

export function variantIsComplete(variant: VideoGrowthVariant): boolean {
  const limit = CHANNEL_DEFINITIONS[variant.channel].maxCaptionLength
  return variant.hook.trim().length >= 5
    && variant.caption.trim().length >= 10
    && variant.caption.length <= limit
    && variant.cta.trim().length >= 2
    && Boolean(variant.deliverableName)
}

export function campaignReviewReadiness(campaign: VideoGrowthCampaign): {
  ready: boolean
  missing: string[]
} {
  const missing = campaign.variants.flatMap((variant) => {
    if (variant.status === "review_ready") return []
    const label = CHANNEL_DEFINITIONS[variant.channel].label
    return [variantIsComplete(variant) ? `${label}をレビュー準備済みにする` : `${label}のコピー・動画を完成する`]
  })
  if (!["final_approved", "delivered"].includes(campaign.studioProjectStatus)) {
    missing.unshift("Studio案件の最終承認または納品を完了する")
  }
  return { ready: missing.length === 0, missing }
}

export function nextCampaignActions(status: VideoGrowthCampaignStatus): string[] {
  if (status === "draft") return ["request_review", "cancel"]
  if (status === "review_ready") return ["approve", "cancel"]
  if (status === "human_approved") return ["schedule", "cancel"]
  if (status === "scheduled") return ["pause", "cancel"]
  if (status === "active") return ["pause", "complete", "cancel"]
  if (status === "paused") return ["resume", "complete", "cancel"]
  return []
}
