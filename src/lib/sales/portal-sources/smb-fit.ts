export interface PortalSmbFitInput {
  companyName: string
  category: string
  description: string
  address: string | null
  websiteUrl: string | null
  imageCount: number
}

export interface PortalSmbFitAssessment {
  eligible: boolean
  score: number
  decisionSignals: string[]
  enterpriseSignals: string[]
  reasons: string[]
}

const ENTERPRISE_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "上場企業", pattern: /上場|東証|証券取引所/iu },
  { label: "全国展開", pattern: /全国(?:展開|対応)|全国\s*\d+\s*(?:拠点|店舗|支店)/iu },
  { label: "多拠点・多店舗", pattern: /(?:\d{2,}|十数|数十)\s*(?:拠点|店舗|支店|営業所)|支社・支店|全国各地/iu },
  { label: "企業グループ", pattern: /グループ企業|企業グループ|連結子会社|ホールディングス/iu },
  { label: "フランチャイズ", pattern: /フランチャイズ|FC本部|加盟店募集/iu },
  { label: "大規模雇用", pattern: /従業員(?:数)?\s*[:：]?\s*(?:[1-9]\d{2,}|千|万)/iu },
  { label: "大規模資本", pattern: /資本金\s*[:：]?\s*(?:[1-9]\d{2,}(?:,\d{3})*\s*万円|[1-9]\d*(?:\.\d+)?\s*億円)/iu },
  { label: "ハウスメーカー", pattern: /ハウスメーカー/iu },
]

const DECISION_PATTERNS: Array<{ label: string; pattern: RegExp; direct: boolean }> = [
  { label: "代表者・店主本人", pattern: /代表(?:者|取締役)?|店主|院長|所長|オーナー|創業者|本人/iu, direct: true },
  { label: "職人・専門家直結", pattern: /職人|大工|建築士|税理士|会計士|行政書士|司法書士|社労士|美容師|施術者/iu, direct: false },
  { label: "個人・少人数運営", pattern: /個人事業|一人で|夫婦で|家族経営|少人数/iu, direct: true },
  { label: "地域密着", pattern: /地域密着|地元(?:密着)?|地域に根(?:ざ|差)した|街の|近隣地域/iu, direct: false },
  { label: "具体的な沿革", pattern: /創業|設立|開業|\d{4}年|\d{1,3}年間?/u, direct: false },
  { label: "資格・許認可", pattern: /資格|免許|許可|認定|登録(?:番号|事業者)/iu, direct: false },
]

function uniqueMatches(text: string, patterns: Array<{ label: string; pattern: RegExp }>): string[] {
  return patterns.filter((item) => item.pattern.test(text)).map((item) => item.label)
}

export function assessPortalSmbFit(input: PortalSmbFitInput): PortalSmbFitAssessment {
  const evidence = [input.companyName, input.category, input.description, input.address ?? ""].join("\n")
  const enterpriseSignals = uniqueMatches(evidence, ENTERPRISE_PATTERNS)
  const matchedDecisions = DECISION_PATTERNS.filter((item) => item.pattern.test(evidence))
  const decisionSignals = matchedDecisions.map((item) => item.label)
  const hasDirectDecisionSignal = matchedDecisions.some((item) => item.direct)
  const hasOperatingEvidence = decisionSignals.some((signal) => ["職人・専門家直結", "地域密着", "具体的な沿革", "資格・許認可"].includes(signal))
  const hasLocalOperatorEvidence = decisionSignals.includes("地域密着")
    && (decisionSignals.includes("具体的な沿革") || decisionSignals.includes("資格・許認可"))

  let score = 20
  if (!input.websiteUrl) score += 15
  if (input.address) score += 10
  if (input.imageCount >= 3) score += 10
  if (input.description.trim().length >= 80) score += 10
  if (hasDirectDecisionSignal) score += 25
  if (hasLocalOperatorEvidence) score += 15
  score += Math.min(10, decisionSignals.length * 2)
  if (enterpriseSignals.length > 0) score = Math.min(score, 15)
  score = Math.max(0, Math.min(100, score))

  const eligible = enterpriseSignals.length === 0
    && hasDirectDecisionSignal
    && (hasOperatingEvidence || hasLocalOperatorEvidence)
    && score >= 70
  const reasons = enterpriseSignals.length > 0
    ? [`大企業シグナルを検出: ${enterpriseSignals.join("、")}`]
    : eligible
      ? [`経営者直結シグナル: ${decisionSignals.join("、")}`]
      : ["代表者・店主本人と、地域性・沿革・資格・専門性の両方を確認する必要があります"]

  return { eligible, score, decisionSignals, enterpriseSignals, reasons }
}
