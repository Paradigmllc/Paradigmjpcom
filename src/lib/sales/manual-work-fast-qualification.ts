import type { JapanMarketAudit } from "./sources/japan-market-audit"
import { buildManualMarketLens } from "./manual-japan-entry-market-lens"
import type { ManualCompanyProfile } from "./manual-japan-entry-types"
import type { BusinessModel } from "./japan-entry-projection"

export type ManualFastPriority = "promote" | "review" | "low"

export interface ManualFastQualification {
  score: number
  priority: ManualFastPriority
  promotionRecommended: boolean
  reasons: string[]
  analysisMode: "fast_qualification"
  generatedAt: string
}

interface FastEvidenceInput {
  domain: string
  companyName: string | null
  productContext: string
  productNames: string[]
  businessModel: BusinessModel
  title: string | null
  description: string | null
  headings: string[]
  audit: JapanMarketAudit
  contact?: { contactUrl: string | null; publicEmail: string | null }
}

const COUNTRY_BY_TLD: Record<string, string> = {
  au: "AU", br: "BR", ca: "CA", ch: "CH", cl: "CL", cn: "CN", co: "CO",
  de: "DE", dk: "DK", ee: "EE", es: "ES", fi: "FI", fr: "FR", hk: "HK",
  id: "ID", ie: "IE", in: "IN", is: "IS", it: "IT", kr: "KR", lt: "LT",
  lv: "LV", mx: "MX", my: "MY", nl: "NL", no: "NO", nz: "NZ", ph: "PH",
  pl: "PL", pt: "PT", se: "SE", sg: "SG", th: "TH", tr: "TR", tw: "TW",
  uk: "GB", us: "US", vn: "VN", za: "ZA",
}

const COMMERCIAL_SIGNAL = /(?:pricing|plans?|free trial|start trial|buy now|add to cart|shop now|customers?|clients?|reviews?|testimonials?|stockists?|retailers?|distributors?|partners?|available in|ships? worldwide|global|international)/i
const FUNDING_SIGNAL = /(?:raised|funded|funding|venture-backed|backed by|seed round|series [a-z])/i
const ENTERPRISE_OR_INFRASTRUCTURE = /(?:hyperscale|data cent(?:er|re)|critical infrastructure|industrial infrastructure|publicly traded|fortune 500|global infrastructure|government contract|enterprise-only)/i
const LOCATION_BOUND_SERVICE = /(?:commercial real estate|construction|physical facility|data cent(?:er|re)|utility network|local installation|onsite service)/i

function countryCodeFromDomain(domain: string): string | null {
  const suffix = domain.toLowerCase().split(".").at(-1) ?? ""
  return COUNTRY_BY_TLD[suffix] ?? null
}

function allText(input: FastEvidenceInput): string {
  return [input.title, input.description, ...input.headings, input.productContext]
    .filter((value): value is string => Boolean(value))
    .join(" ")
}

function isJapaneseCompany(input: FastEvidenceInput): boolean {
  if (input.domain.toLowerCase().endsWith(".jp")) return true
  return /株式会社|有限会社|合同会社|所在地.{0,30}(?:日本|東京都|大阪府|京都府)/.test(allText(input))
}

function observedFacts(productContext: string): string[] {
  return [...new Set(productContext
    .split(" | ")
    .map((value) => value.trim().slice(0, 240))
    .filter((value) => value.length >= 3))]
    .slice(0, 10)
}

function scoreFastQualification(input: FastEvidenceInput, japaneseCompany: boolean): ManualFastQualification {
  if (japaneseCompany) {
    return {
      score: 0,
      priority: "low",
      promotionRecommended: false,
      reasons: ["日本企業を示す決定的な公開情報を確認しました。"],
      analysisMode: "fast_qualification",
      generatedAt: new Date().toISOString(),
    }
  }

  const text = allText(input)
  let score = 10
  const reasons: string[] = ["海外企業の公開サイトと商品・サービス説明を確認しました。"]

  if (input.businessModel === "ecommerce" || input.businessModel === "saas") {
    score += 25
    reasons.push(input.businessModel === "ecommerce"
      ? "オンライン販売可能な商品ブランドです。"
      : "オンライン提供可能なSaaS・デジタルサービスです。")
  } else {
    score += 5
    reasons.push("サービス型のため、日本で再現可能な提供形態かを選別します。")
  }

  if (input.productNames.length > 0 || input.productContext.length >= 120) {
    score += 10
    reasons.push("公開ページに具体的な商品・サービス説明があります。")
  }
  if (COMMERCIAL_SIGNAL.test(text)) {
    score += 10
    reasons.push("販売・顧客・海外展開の商業シグナルを公開ページで確認しました。")
  }
  if (FUNDING_SIGNAL.test(text)) {
    score += 8
    reasons.push("資金調達シグナルを公開ページで確認しました。")
  }
  if (input.contact?.contactUrl || input.contact?.publicEmail) {
    score += 10
    reasons.push("連絡可能な公開窓口候補があります。")
  }

  let gapPoints = 0
  if (input.audit.status.japanese_language_missing) gapPoints += 4
  if (input.audit.status.jpy_currency_missing) gapPoints += 4
  if (input.businessModel === "ecommerce" && input.audit.status.japan_shipping_missing) gapPoints += 4
  score += Math.min(8, gapPoints)
  if (gapPoints > 0) reasons.push("日本向け顧客導線は未整備です。")

  if (countryCodeFromDomain(input.domain)) score += 5
  if (ENTERPRISE_OR_INFRASTRUCTURE.test(text)) {
    score -= 30
    reasons.push("大規模インフラ・エンタープライズ型の可能性があり、即決型SMB営業には不向きです。")
  }
  if (input.businessModel === "service" && LOCATION_BOUND_SERVICE.test(text)) {
    score -= 20
    reasons.push("物理拠点依存のサービスで、日本展開の再現性が低い可能性があります。")
  }

  const boundedScore = Math.max(0, Math.min(100, score))
  const priority: ManualFastPriority = boundedScore >= 65
    ? "promote"
    : boundedScore >= 45
      ? "review"
      : "low"

  return {
    score: boundedScore,
    priority,
    promotionRecommended: priority === "promote",
    reasons: reasons.slice(0, 8),
    analysisMode: "fast_qualification",
    generatedAt: new Date().toISOString(),
  }
}

function companyName(input: FastEvidenceInput): string {
  const candidate = input.companyName?.trim()
  return candidate && candidate.length >= 2 && candidate.length <= 120 ? candidate : input.domain
}

export function buildFastManualCompanyProfile(input: FastEvidenceInput): {
  profile: ManualCompanyProfile
  qualification: ManualFastQualification
} {
  const japaneseCompany = isJapaneseCompany(input)
  const countryCode = japaneseCompany ? "JP" : countryCodeFromDomain(input.domain)
  const qualification = scoreFastQualification(input, japaneseCompany)
  const isDigital = input.businessModel === "saas"
  const isCommerce = input.businessModel === "ecommerce"
  const fitStatus = japaneseCompany
    ? "rejected"
    : qualification.priority === "promote"
      ? "qualified"
      : "review_required"
  const smbStatus = japaneseCompany
    ? "rejected"
    : qualification.priority === "promote"
      ? "qualified"
      : "review_required"

  const profile: ManualCompanyProfile = {
    companyName: companyName(input),
    countryCode,
    isJapaneseCompany: japaneseCompany,
    smbStatus,
    smbConfidence: japaneseCompany ? 100 : qualification.score,
    smbEvidence: japaneseCompany
      ? ["日本企業を示す決定的な公開情報を確認しました。"]
      : qualification.reasons,
    japanEntryFitStatus: fitStatus,
    japanEntryFitConfidence: japaneseCompany ? 100 : qualification.score,
    japanEntryFitEvidence: qualification.reasons,
    businessModel: input.businessModel,
    industry: isCommerce ? "E-Commerce / Retail" : isDigital ? "Technology / IT" : "Other",
    productContext: input.productContext,
    observedFacts: observedFacts(input.productContext),
    outreachPlaybook: isCommerce ? "premium_hobby_ecommerce" : isDigital ? "saas_ai_devtools" : "general_online_smb",
    positioningConcept: null,
    commercialSignals: [],
    marketLens: buildManualMarketLens({ countryCode, commercialSignals: [] }),
  }

  return { profile, qualification }
}
