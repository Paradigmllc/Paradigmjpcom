import type {
  ManualCommercialSignal,
  ManualCommercialSignalKind,
  ManualMarketLens,
  ManualMarketPriority,
} from "./manual-japan-entry-types"

interface MarketProfile {
  priority: ManualMarketPriority
  label: string
  rationale: string
  focusIndustries: string[]
}

const MARKET_PROFILES: Record<string, MarketProfile> = {
  SG: { priority: "global_priority", label: "グローバル優先", rationale: "国際販売を前提とする企業を企業単位で評価する市場", focusIndustries: ["SaaS", "AI", "FinTech infrastructure", "Web3"] },
  AE: { priority: "global_priority", label: "グローバル優先", rationale: "Founder・owner決裁と国際収益の公開根拠を優先する市場", focusIndustries: ["AI", "Web3", "Luxury ecommerce", "Hospitality Tech"] },
  PL: { priority: "regional_core", label: "Regional主要母集団", rationale: "自社プロダクトを持つ輸出型テック企業を優先する市場", focusIndustries: ["SaaS", "DevTools", "Cybersecurity", "Gaming"] },
  MY: { priority: "regional_core", label: "Regional主要母集団", rationale: "英語サイトと複数国販売の公開根拠を優先する市場", focusIndustries: ["SaaS", "Ecommerce", "Education", "FinTech infrastructure"] },
  MX: { priority: "regional_core", label: "Regional主要母集団", rationale: "米国・海外顧客を持つオンライン企業を優先する市場", focusIndustries: ["SaaS", "Ecommerce", "MarTech", "Creator tools"] },
  EE: { priority: "precision", label: "高精度少数市場", rationale: "大量処理ではなくFounder到達性と公開根拠を重視する市場", focusIndustries: ["SaaS", "Cybersecurity", "FinTech infrastructure", "Web3"] },
  CZ: { priority: "precision", label: "高精度少数市場", rationale: "セルフサーブ可能な技術・B2B製品を優先する市場", focusIndustries: ["SaaS", "DevTools", "Engineering software", "Cybersecurity"] },
  CL: { priority: "precision", label: "高精度少数市場", rationale: "母数より海外売上とB2B適合の根拠を優先する市場", focusIndustries: ["SaaS", "Mining Tech", "AgTech", "ClimateTech"] },
  TR: { priority: "selective", label: "企業厳選市場", rationale: "外貨収入のあるゲーム・デジタル製品企業だけを優先する市場", focusIndustries: ["Gaming", "Mobile apps", "SaaS", "Creator tools"] },
  IN: { priority: "selective", label: "企業厳選市場", rationale: "現地価格ではなく海外顧客・外貨売上・資金調達の企業根拠を優先する市場", focusIndustries: ["Global SaaS", "AI", "DevTools", "Cybersecurity"] },
  BR: { priority: "selective", label: "企業厳選市場", rationale: "すでに海外展開しているオンライン企業だけを優先する市場", focusIndustries: ["Global SaaS", "Ecommerce", "Creator tools", "Gaming"] },
  ZA: { priority: "selective", label: "企業厳選市場", rationale: "海外顧客と契約主体・支払能力を個別確認する市場", focusIndustries: ["SaaS", "FinTech infrastructure", "Cybersecurity", "Mining software"] },
}

const DEFAULT_PROFILE: MarketProfile = {
  priority: "individual_review",
  label: "企業別評価",
  rationale: "国の物価ではなく、企業固有の海外収益・商品・意思決定根拠で判断する市場",
  focusIndustries: [],
}

const SIGNAL_PATTERNS: Record<ManualCommercialSignalKind, RegExp> = {
  foreign_currency_revenue: /(?:USD|USDC|EUR|GBP|dollars?|euros?).{0,40}(?:revenue|sales|ARR|fees)|(?:revenue|sales|ARR|fees).{0,40}(?:USD|USDC|EUR|GBP|dollars?|euros?)/i,
  global_customers: /(?:customers?|clients?|users?).{0,50}(?:global|worldwide|international|countries|markets)|(?:global|worldwide|international).{0,50}(?:customers?|clients?|users?)/i,
  funding: /(?:raised|funding|funded|backed by|seed round|series [a-z]|venture-backed)/i,
  founder_led: /(?:founder-led|founder owned|founder-owned|owner-led)/i,
  employee_range: /(?:team of|employs?|employees?|people).{0,20}\b\d{1,3}\b|\b\d{1,3}\b.{0,20}(?:employees?|people|team members?)/i,
  international_operations: /(?:operat(?:e|es|ing)|available|serv(?:e|es|ing)|offices?).{0,50}(?:globally|worldwide|internationally|countries|markets)|(?:global|international|worldwide).{0,50}(?:operations?|presence|offices?|markets?)/i,
}

export const MANUAL_COMMERCIAL_SIGNAL_LABELS: Record<ManualCommercialSignalKind, string> = {
  foreign_currency_revenue: "外貨売上",
  global_customers: "海外顧客",
  funding: "資金調達",
  founder_led: "Founder-led",
  employee_range: "従業員規模",
  international_operations: "海外展開",
}

export function groundManualCommercialSignals(
  signals: ManualCommercialSignal[] | undefined,
  productContext: string,
): ManualCommercialSignal[] {
  if (!signals?.length) return []
  const normalizedContext = productContext.toLocaleLowerCase("en-US")
  const seen = new Set<string>()
  return signals.filter((signal) => {
    const sourcePhrase = signal.sourcePhrase.trim()
    const key = `${signal.kind}:${sourcePhrase.toLocaleLowerCase("en-US")}`
    if (
      sourcePhrase.length < 3
      || !normalizedContext.includes(sourcePhrase.toLocaleLowerCase("en-US"))
      || !SIGNAL_PATTERNS[signal.kind].test(sourcePhrase)
      || seen.has(key)
    ) return false
    seen.add(key)
    return true
  }).map((signal) => ({
    kind: signal.kind,
    sourcePhrase: signal.sourcePhrase.trim(),
    detail: `${MANUAL_COMMERCIAL_SIGNAL_LABELS[signal.kind]}を示す公開原文です。予算・支払能力は別途確認が必要です。`,
  })).slice(0, 6)
}

export function buildManualMarketLens(input: {
  countryCode: string | null
  commercialSignals?: ManualCommercialSignal[]
}): ManualMarketLens {
  const profile = input.countryCode ? MARKET_PROFILES[input.countryCode] ?? DEFAULT_PROFILE : DEFAULT_PROFILE
  const signalCount = input.commercialSignals?.length ?? 0
  return {
    ...profile,
    commercialEvidenceStatus: signalCount >= 2 ? "observed" : signalCount === 1 ? "partial" : "unverified",
    commercialSignalCount: signalCount,
    pricingPolicy: "no_automatic_country_adjustment",
    requiresHumanReview: true,
  }
}
