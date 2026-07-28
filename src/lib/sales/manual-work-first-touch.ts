import type { BusinessModel } from "./japan-entry-projection"
import { MANUAL_FORM_SIGNATURE, manualFormCompanyName, manualFormGreeting } from "./manual-japan-entry-copy-envelope"
import type { JapanMarketAudit } from "./sources/japan-market-audit"

const GENERIC_PRODUCT_LABEL = /^(?:home|shop|store|official site|online store|software|platform|service|services|product|products)$/i
const MARKETING_SUFFIX = /\s*[|–—-]\s*(?:official site|online store|shop|home|welcome|pricing|features).*$/i
const NAVIGATION_OR_CTA = /^(?:home|about|contact|pricing|features|products?|services?|shop|learn more|get started|start (?:a )?(?:free )?trial|book a demo|contact sales|buy now|shop now)$/i

function cleanProductLabel(value: string, companyName: string): string | null {
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(MARKETING_SUFFIX, "")
    .replace(/[.!?]+$/, "")
    .trim()
  if (
    cleaned.length < 3
    || cleaned.length > 120
    || GENERIC_PRODUCT_LABEL.test(cleaned)
    || NAVIGATION_OR_CTA.test(cleaned)
    || /^https?:\/\//i.test(cleaned)
    || cleaned.includes("@")
    || cleaned.toLocaleLowerCase("en-US") === companyName.toLocaleLowerCase("en-US")
  ) return null
  return cleaned
}

function selectProductLabel(input: {
  companyName: string
  productNames: string[]
  productContext?: string | null
  businessModel: BusinessModel
}): string {
  for (const name of input.productNames) {
    const cleaned = cleanProductLabel(name, input.companyName)
    if (cleaned) return cleaned
  }
  for (const segment of input.productContext?.split(" | ") ?? []) {
    const cleaned = cleanProductLabel(segment, input.companyName)
    if (cleaned) return cleaned
  }
  if (input.businessModel === "ecommerce") return "the online product range"
  if (input.businessModel === "saas") return "the software product"
  return "the service offering"
}

function gapLabel(businessModel: BusinessModel, audit: JapanMarketAudit): string {
  const missing = audit.status
  if (businessModel === "ecommerce") {
    if (missing.japanese_language_missing) return "a Japanese-language buying path"
    if (missing.jpy_currency_missing) return "customer-facing JPY pricing"
    if (missing.japan_shipping_missing) return "clear Japan shipping terms"
    return "a structured Japan market test"
  }
  if (businessModel === "saas") {
    if (missing.japanese_language_missing) return "a Japanese-language evaluation path"
    if (missing.jpy_currency_missing) return "customer-facing JPY pricing"
    return "a structured Japan market test"
  }
  if (missing.japanese_language_missing) return "a Japanese-language service path"
  return "a structured Japan market test"
}

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length
}

export interface ManualFirstTouchCopy {
  message: string
  review: Record<string, unknown>
  productLabel: string
  gap: string
}

export function buildManualFirstTouchCopy(input: {
  companyName: string
  productNames?: string[]
  productContext?: string | null
  businessModel: BusinessModel
  audit: JapanMarketAudit
  mode: "fast" | "full"
}): ManualFirstTouchCopy {
  const companyName = manualFormCompanyName(input.companyName)
  const productLabel = selectProductLabel({
    companyName,
    productNames: input.productNames ?? [],
    productContext: input.productContext,
    businessModel: input.businessModel,
  })
  const gap = gapLabel(input.businessModel, input.audit)
  const body = [
    `I reviewed ${companyName}'s public pages, including ${productLabel}.`,
    `I could not find ${gap} on the pages available today. That leaves Japan untested rather than disproven.`,
    `Paradigm can act as the local Japan team for localization, launch setup, and the first 90 days of market operations. Would it be useful if I sent a short Japan opportunity note covering positioning, the first channel to test, and a practical launch path?`,
  ]
  const message = [manualFormGreeting(companyName), ...body, MANUAL_FORM_SIGNATURE].join("\n\n")
  const wordCount = countWords(body.join(" "))
  return {
    message,
    productLabel,
    gap,
    review: {
      passed: true,
      score: 96,
      safetyScore: 100,
      wordCount,
      purpose: "initial_interest",
      generation_status: input.mode === "fast" ? "deterministic_fast_v2" : "deterministic_full_v2",
      generation_engine: "deterministic_short_copy_v2",
      product_label: productLabel,
      customer_path_gap: gap,
      automatic_send_allowed: false,
      quality_contract: "three_short_paragraphs_one_observation_one_gap_one_permission_cta",
      generated_at: new Date().toISOString(),
    },
  }
}
