import type { BusinessModel } from "./japan-entry-projection"
import type { ManualCompanyProfile, QualificationStatus } from "./manual-japan-entry-types"

export const JAPAN_ENTRY_FIT_CONTRACT_VERSION = "opportunity-first-v1" as const

const READINESS_GAP_PATTERNS = [
  /\b(?:no|not|without|missing|lack(?:s|ing)?|absen(?:t|ce)|unavailable)\b.{0,120}\b(?:japan(?:ese)?|locali[sz](?:ation|ed)?|jpy|yen|payment|shipping|market presence|customer path|language support)\b/i,
  /\b(?:japan(?:ese)?|locali[sz](?:ation|ed)?|jpy|yen|payment|shipping|market presence|customer path|language support)\b.{0,120}\b(?:no|not|without|missing|lack(?:s|ing)?|absen(?:t|ce)|unavailable)\b/i,
  /\b(?:unlikely|not ready|unprepared|cannot|unable)\b.{0,120}\bwithout\b.{0,80}\blocali[sz](?:ation|ing|ed)?\b/i,
] as const

interface FitPolicyInput {
  isJapaneseCompany: boolean
  businessModel: BusinessModel
  japanEntryFitStatus: QualificationStatus
  japanEntryFitEvidence: string[]
}

export function isReadinessGapOnlyJapanEntryRejection(input: FitPolicyInput): boolean {
  if (input.isJapaneseCompany || input.japanEntryFitStatus !== "rejected") return false
  if (input.businessModel !== "saas" && input.businessModel !== "ecommerce") return false
  if (input.japanEntryFitEvidence.length === 0) return false
  return input.japanEntryFitEvidence.every((evidence) => (
    READINESS_GAP_PATTERNS.some((pattern) => pattern.test(evidence))
  ))
}

export function applyJapanEntryFitPolicy(profile: ManualCompanyProfile): ManualCompanyProfile {
  if (!isReadinessGapOnlyJapanEntryRejection(profile)) return profile
  const observedProduct = profile.observedFacts[0]?.trim()
  const observedEvidence = observedProduct
    ? `Public product evidence: ${observedProduct}`.slice(0, 240)
    : null
  return {
    ...profile,
    japanEntryFitStatus: "qualified",
    japanEntryFitConfidence: Math.max(70, Math.min(profile.smbConfidence, 85)),
    japanEntryFitEvidence: [
      ...(observedEvidence ? [observedEvidence] : []),
      "Missing Japanese localization or current Japan presence is a market-entry readiness gap, not an offer-fit rejection criterion.",
      `Decision contract: ${JAPAN_ENTRY_FIT_CONTRACT_VERSION}.`,
    ].slice(0, 8),
  }
}
