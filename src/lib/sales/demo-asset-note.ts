import type { DemoAssetApprovalStatus, DemoAssetReview } from "./demo-private-access"

export function buildPremiumAssetNote(
  review: DemoAssetReview | null,
  approvalStatus: DemoAssetApprovalStatus,
): string {
  const visualAssets = review?.assets.filter((asset) => asset.kind !== "logo") ?? []
  if (visualAssets.length > 0 && visualAssets.every((asset) => asset.useBasis === "generated")) {
    return "掲載画像は提案用の生成イメージです。正式公開時は事業者承認済みの素材へ差し替えます。"
  }
  if (approvalStatus === "consented") return "掲載写真は権利確認済みの公式素材です。"
  return "掲載写真は相手企業の公式公開アカウントから取得した非公開提案用素材です。正式公開前に権利者の許諾を確認します。"
}
