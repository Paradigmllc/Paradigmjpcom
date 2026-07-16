import { isCustomerFacingBusinessDomain } from "./data-quality-guard"
import { normalizeDomain } from "./dedup"
import type { collectInitialFormDraftEvidence } from "./initial-form-draft-evidence"
import type { generatePersonalizedJapanEntryMessage } from "./japan-entry-personalized-message"
import type { collectManualMarketProjection } from "./manual-japan-entry-market-context"
import { variantOptions, type ManualMessageVariant } from "./manual-japan-entry-experiment"
import type { ManualMessageAngle } from "./manual-japan-entry-angle"
import type { ManualCompanyProfile } from "./manual-japan-entry-types"
import type { FormDiscoveryResult } from "./sources/form-discovery"

export interface ManualWorkEligibility {
  eligible: boolean
  reasons: string[]
}

export function normalizeManualWorkUrl(input: string): {
  inputUrl: string
  canonicalUrl: string
  domain: string
} {
  const trimmed = input.trim()
  if (!trimmed) throw new Error("URL is required")
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch (error) {
    console.error("[manual-work] invalid URL:", { input: trimmed, error })
    throw new Error("A valid public company URL is required")
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Only public HTTP(S) company URLs are allowed")
  }
  const domain = normalizeDomain(url.hostname)
  if (!domain || !isCustomerFacingBusinessDomain(domain)) {
    throw new Error("A customer-facing company domain is required")
  }
  return { inputUrl: trimmed, canonicalUrl: `https://${domain}`, domain }
}

export function manualWorkEligibility(input: {
  profile: ManualCompanyProfile
  form: FormDiscoveryResult
  messageOk: boolean
  messagePassed: boolean
}): ManualWorkEligibility {
  const reasons: string[] = []
  if (!input.profile.countryCode) reasons.push("Country is unconfirmed")
  if (input.profile.isJapaneseCompany || input.profile.countryCode === "JP") reasons.push("Japanese companies are excluded")
  if (input.profile.smbStatus !== "qualified" || input.profile.smbConfidence < 70) reasons.push("SMB classification needs review")
  if (input.profile.japanEntryFitStatus !== "qualified" || input.profile.japanEntryFitConfidence < 70) reasons.push("Japan Entry fit needs review")
  if (input.form.verification !== "form" || input.form.confidence < 90 || !input.form.formUrl) reasons.push("A high-confidence public form was not verified")
  if (!input.messageOk || !input.messagePassed) reasons.push("The initial message did not pass the production quality gate")
  return { eligible: reasons.length === 0, reasons }
}

function formResultRank(result: FormDiscoveryResult): number {
  if (result.verification === "form") return 300 + result.confidence
  if (result.verification === "page") return 200 + result.confidence
  if (result.verification === "fallback") return 100 + result.confidence
  return result.confidence
}

export function selectBestManualFormResult(
  results: Array<FormDiscoveryResult | null>,
): FormDiscoveryResult {
  const available = results.filter((result): result is FormDiscoveryResult => Boolean(result))
  const selected = [...available].sort((a, b) => formResultRank(b) - formResultRank(a))[0]
  return selected ?? {
    formUrl: null,
    method: "none",
    verification: "none",
    confidence: 0,
    inspection: null,
    candidates: [],
    traceMs: 0,
  }
}

export function buildManualInitialMessageInput(input: {
  profile: ManualCompanyProfile
  evidence: Awaited<ReturnType<typeof collectInitialFormDraftEvidence>>
  variant?: ManualMessageVariant
  angle?: ManualMessageAngle
  projection?: Awaited<ReturnType<typeof collectManualMarketProjection>>["projection"]
}): Parameters<typeof generatePersonalizedJapanEntryMessage>[0] {
  const variant = input.variant ?? "estimate_off_price_off"
  return {
    companyName: input.profile.companyName,
    industry: input.profile.industry,
    productContext: input.evidence.productContext,
    targetCountry: input.profile.countryCode,
    businessModel: input.profile.businessModel,
    audit: input.evidence.audit,
    purpose: "initial_interest",
    projection: input.projection ?? undefined,
    initialInterestOptions: variantOptions(variant),
    messageAngle: input.angle ?? "problem",
    outreachPlaybook: input.profile.outreachPlaybook,
    positioningConcept: input.profile.positioningConcept,
  }
}
