import type {
  VideoGrowthApprovalStage,
  VideoGrowthCampaign,
  VideoGrowthCampaignStatus,
  VideoGrowthChannel,
  VideoGrowthCheckKey,
  VideoGrowthVariant,
} from "./types"

export const CHANNEL_DEFINITIONS: Record<VideoGrowthChannel, {
  label: string
  purpose: string
  format: string
  maxCaptionLength: number
}> = {
  x: { label: "X", purpose: "短い問題提起からLPクリックを獲得", format: "1:1 · 1080×1080 · 30秒", maxCaptionLength: 280 },
  instagram: { label: "Instagram", purpose: "縦型Reelsで制作品質と変化を視覚訴求", format: "9:16 · 1080×1920 · 30秒", maxCaptionLength: 2200 },
  linkedin: { label: "LinkedIn", purpose: "B2B意思決定者へ証拠と業務成果を提示", format: "1:1 · 1080×1080 · 45秒", maxCaptionLength: 3000 },
  cold_email: { label: "コールド営業", purpose: "許可ベースの個別メールから動画とLPへ誘導", format: "16:9 · 1280×720 · 45秒", maxCaptionLength: 1200 },
}

export const CAMPAIGN_STATUS_LABELS: Record<VideoGrowthCampaignStatus, string> = {
  draft: "制作中", review_ready: "案件レビュー待ち", human_approved: "案件承認済み",
  scheduled: "公開予定", active: "公開中", paused: "一時停止", completed: "完了", cancelled: "中止",
}

export const READINESS_CHECK_LABELS: Record<VideoGrowthCheckKey, string> = {
  contract: "契約", payment: "請求・入金", brief: "制作ブリーフ", brand_assets: "ブランド素材",
  usage_rights: "素材・出演者の利用権", landing_page: "遷移先LP", tracking: "計測設定",
}

export function variantIsComplete(variant: VideoGrowthVariant): boolean {
  const limit = CHANNEL_DEFINITIONS[variant.channel].maxCaptionLength
  return variant.hook.trim().length >= 5
    && variant.caption.trim().length >= 10
    && variant.caption.length <= limit
    && variant.cta.trim().length >= 2
    && Boolean(variant.deliverableName)
}

export function campaignReviewReadiness(campaign: VideoGrowthCampaign): { ready: boolean; missing: string[] } {
  const missing = campaign.variants.flatMap((variant) => {
    if (variant.status === "review_ready") return []
    const label = CHANNEL_DEFINITIONS[variant.channel].label
    return [variantIsComplete(variant) ? `${label}をレビュー準備済みにする` : `${label}のコピーとStudio納品物を完成する`]
  })
  if (!["final_approved", "delivered"].includes(campaign.studioProjectStatus)) {
    missing.unshift("Studio案件を最終承認または納品済みにする")
  }
  if (!campaign.workOrder) missing.unshift("商用ワークオーダーを登録する")
  const incompleteChecks = campaign.readinessChecks.filter((item) => !["passed", "waived"].includes(item.status))
  if (incompleteChecks.length > 0) missing.unshift(`入稿・契約チェックを完了する（残り${incompleteChecks.length}件）`)
  return { ready: missing.length === 0, missing }
}

export function approvalForRevision(variant: VideoGrowthVariant, stage: VideoGrowthApprovalStage) {
  return variant.approvals.find((item) => item.stage === stage && item.contentRevision === variant.contentRevision) ?? null
}

export function variantHasReleaseApproval(variant: VideoGrowthVariant): boolean {
  return (["internal_quality", "client_release"] as const)
    .every((stage) => approvalForRevision(variant, stage)?.decision === "approved")
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

export function deliverySla(workOrder: VideoGrowthCampaign["workOrder"]): "missing" | "overdue" | "due_soon" | "on_track" | "done" {
  if (!workOrder) return "missing"
  if (["delivered", "closed"].includes(workOrder.workStatus)) return "done"
  const remaining = new Date(workOrder.deliveryDueAt).getTime() - Date.now()
  if (remaining < 0) return "overdue"
  return remaining <= 48 * 60 * 60 * 1000 ? "due_soon" : "on_track"
}
