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
}

const COUNTRY_BY_TLD: Record<string, string> = {
  au: "AU", br: "BR", ca: "CA", ch: "CH", cl: "CL", cn: "CN", co: "CO",
  de: "DE", dk: "DK", ee: "EE", es: "ES", fi: "FI", fr: "FR", hk: "HK",
  id: "ID", ie: "IE", in: "IN", is: "IS", it: "IT", kr: "KR", lt: "LT",
  lv: "LV", mx: "MX", my: "MY", nl: "NL", no: "NO", nz: "NZ", ph: "PH",
  pl: "PL", pt: "PT", se: "SE", sg: "SG", th: "TH", tr: "TR", tw: "TW",
  uk: "GB", us: "US", vn: "VN", za: "ZA",
}

const STRUCTURAL_LOW_FIT = /\b(?:hyperscale|data cent(?:er|re)s?|colocation|critical infrastructure|industrial campus|megawatts?|power capacity|subsea cable|telecom(?:munications)? towers?|large-scale construction|property development)\b/i

function countryCodeFromDomain(domain: string): string | null {
  const suffix = domain.toLowerCase().split(".").at(-1) ?? ""
  return COUNTRY_BY_TLD[suffix] ?? null
}

function evidenceText(input: FastEvidenceInput): string {
  return [input.title, input.description, ...input.headings, input.productContext]
    .filter((value): value is string => Boolean(value))
    .join(" ")
}

function isJapaneseCompany(input: FastEvidenceInput): boolean {
  if (input.domain.toLowerCase().endsWith(".jp")) return true
  return /株式会社|有限会社|合同会社|所在地.{0,30}(?:日本|東京都|大阪府|京都府)/.test(evidenceText(input))
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

  if (input.businessModel === "service" && STRUCTURAL_LOW_FIT.test(evidenceText(input))) {
    return {
      score: 25,
      priority: "low",
      promotionRecommended: false,
      reasons: [
        "公開情報は大規模な物理インフラ・不動産・建設型事業を示しています。",
        "Paradigmの初期Japan Country Partner対象であるSaaS・デジタルサービス・Premium D2Cとは提供構造が大きく異なります。",
      ],
      analysisMode: "fast_qualification",
      generatedAt: new Date().toISOString(),
    }
  }

  let score = 20
  const reasons: string[] = ["海外企業の公開サイトと商品・サービス説明を確認しました。"]

  if (input.businessModel === "ecommerce" || input.businessModel === "saas") {
    score += 25
    reasons.push(input.businessModel === "ecommerce"
      ? "オンライン販売可能な商品ブランドとして一次適性があります。"
      : "オンライン提供可能なSaaS・デジタルサービスとして一次適性があります。")
  } else {
    score += 8
    reasons.push("サービス型のため、日本で提供可能かは追加確認が必要です。")
  }

  if (input.productNames.length > 0) {
    score += 15
    reasons.push("公開ページから具体的な商品・サービス名を確認しました。")
  } else if (input.productContext.length >= 140) {
    score += 10
    reasons.push("公開ページに十分な商品・サービス説明があります。")
  }

  if (input.audit.status.japanese_language_missing) {
    score += 12
    reasons.push("日本語の顧客導線を公開ページで確認できませんでした。")
  }
  if (input.audit.status.jpy_currency_missing) {
    score += 8
    reasons.push("JPY価格表示を公開ページで確認できませんでした。")
  }
  if (input.businessModel === "ecommerce" && input.audit.status.japan_shipping_missing) {
    score += 8
    reasons.push("日本向け配送条件を公開ページで確認できませんでした。")
  }
  if (input.companyName && input.companyName.toLowerCase() !== input.domain.toLowerCase()) score += 5
  if (countryCodeFromDomain(input.domain)) score += 5

  const boundedScore = Math.min(100, score)
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
    : qualification.priority === "low"
      ? "review_required"
      : (isDigital || isCommerce ? "qualified" : "review_required")

  const profile: ManualCompanyProfile = {
    companyName: companyName(input),
    countryCode,
    isJapaneseCompany: japaneseCompany,
    smbStatus: japaneseCompany ? "rejected" : "review_required",
    smbConfidence: japaneseCompany ? 100 : 55,
    smbEvidence: japaneseCompany
      ? ["日本企業を示す決定的な公開情報を確認しました。"]
      : ["高速一次判定では従業員数・売上・決裁者を確定しません。"],
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
