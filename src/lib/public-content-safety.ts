export const JAPANESE_WORK_PUBLICATION_TAG = "公開確認済み"

type PublicHomepageBlock = {
  blockType?: string
  [key: string]: unknown
}

const UNSAFE_ENGLISH_JAPAN_ENTRY_PATTERNS = [
  /\$(?:1,?300|1,?500|3,?000|5,?000|8,?000)\b/i,
  /cancel\s+anytime/i,
  /book\s+(?:a\s+)?free/i,
  /free\s+(?:consult|call|assessment)/i,
  /(?:three|3)[-\s]?tier/i,
  /(?:sales|revenue|ranking|result)\s+guarantee/i,
] as const

const UNVERIFIED_JAPANESE_MARKETING_PATTERNS = [
  /成果(?:保証|報酬)/,
  /返金(?:対応|制度|保証)/,
  /Googleマップ(?:検索)?(?:で)?(?:の)?(?:表示)?\s*1位/,
  /Googleマップで上位表示/,
  /AI検索でも上位表示/,
  /問い合わせ(?:が|を)?\s*\d+(?:\.\d+)?倍/,
  /来店数[^。]*\d+(?:\.\d+)?倍/,
  /人的コスト[^。]*ゼロ/,
  /Lighthouse(?:スコア)?\s*\d+\+?/i,
  /依頼(?:し放題|無制限)/,
  /修正無制限/,
  /\d{1,3}(?:\s*[-–]\s*\d{1,3})?\s*時間納品/,
  /最も選ばれて/,
  /地域検索1位/,
  /月額数万円から/,
] as const

export function containsUnverifiedJapaneseMarketingClaim(value: unknown): boolean {
  const copy = typeof value === "string" ? value : JSON.stringify(value)
  return UNVERIFIED_JAPANESE_MARKETING_PATTERNS.some((pattern) => pattern.test(copy))
}

export function isSafeJapaneseHomepageBlock(
  block: { blockType?: string; [key: string]: unknown },
): boolean {
  if (block.blockType === "testimonials") return false
  return !containsUnverifiedJapaneseMarketingClaim(block)
}

export function isSafeEnglishJapanEntryHomepage(
  blocks: PublicHomepageBlock[],
): boolean {
  const pricingBlocks = blocks.filter((block) => block.blockType === "pricing")
  if (pricingBlocks.length !== 1) return false

  const tiers = pricingBlocks[0].tiers
  if (!Array.isArray(tiers) || tiers.length !== 1) return false
  const tier = tiers[0]
  if (typeof tier !== "object" || tier === null) return false

  const price = "price" in tier ? tier.price : null
  const features = "features" in tier ? tier.features : null
  if (price !== "$13,000" || typeof features !== "string") return false

  const copy = JSON.stringify(blocks)
  const normalizedCopy = copy.toLowerCase()
  const requiredCopy = [
    "$2,000/month",
    "$2,000/month × 6 months = $12,000 value included",
    "Month 7 onward: $2,000/month",
    "availability and scope are confirmed in writing",
    "Month-one target: 20 qualified launches",
    "not a customer outcome guarantee",
    "/en/contact?intent=japan-entry",
  ] as const

  return (
    requiredCopy.every((value) => normalizedCopy.includes(value.toLowerCase())) &&
    !UNSAFE_ENGLISH_JAPAN_ENTRY_PATTERNS.some((pattern) => pattern.test(copy))
  )
}

export function isVerifiedJapaneseWork(
  tags: Array<{ tag?: string }> | undefined,
): boolean {
  return (tags ?? []).some(
    ({ tag }) => tag?.trim() === JAPANESE_WORK_PUBLICATION_TAG,
  )
}
