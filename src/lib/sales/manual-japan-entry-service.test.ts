import { describe, expect, it } from "vitest"
import {
  buildManualInitialMessageInput,
  isRetryableManualWork,
  manualWorkEligibility,
  normalizeManualWorkUrl,
  selectBestManualFormResult,
} from "./manual-japan-entry-service"
import type { ManualCompanyProfile } from "./manual-japan-entry-types"

const qualifiedProfile: ManualCompanyProfile = {
  companyName: "Acme",
  countryCode: "US",
  isJapaneseCompany: false,
  smbStatus: "qualified",
  smbConfidence: 88,
  smbEvidence: ["Public product and company evidence"],
  japanEntryFitStatus: "qualified",
  japanEntryFitConfidence: 82,
  japanEntryFitEvidence: ["Product can be localized for Japan"],
  businessModel: "saas",
  industry: "Technology / IT",
  productContext: "A public software platform for small business teams.",
  observedFacts: ["Offers a software platform"],
  outreachPlaybook: "saas_ai_devtools",
  positioningConcept: null,
}

const verifiedForm = {
  formUrl: "https://acme.com/contact",
  method: "crawl4ai" as const,
  verification: "form" as const,
  confidence: 94,
  inspection: null,
  candidates: ["https://acme.com/contact"],
  traceMs: 20,
}

describe("manual Japan Entry work safety gates", () => {
  it("allows failed persistent work to be analyzed again without creating a duplicate", () => {
    expect(isRetryableManualWork({ status: "failed" })).toBe(true)
    expect(isRetryableManualWork({ status: "completed" })).toBe(false)
  })

  it("normalizes one public company domain", () => {
    expect(normalizeManualWorkUrl("acme.com/about")).toEqual({
      inputUrl: "acme.com/about",
      canonicalUrl: "https://acme.com",
      domain: "acme.com",
    })
  })

  it("allows Twenty sync only after every manual-work gate passes", () => {
    expect(manualWorkEligibility({ profile: qualifiedProfile, form: verifiedForm, messageOk: true, messagePassed: true }))
      .toEqual({ eligible: true, reasons: [] })
  })

  it("blocks Japanese companies and unverified forms", () => {
    const result = manualWorkEligibility({
      profile: { ...qualifiedProfile, countryCode: "JP", isJapaneseCompany: true },
      form: { ...verifiedForm, verification: "page", confidence: 74 },
      messageOk: true,
      messagePassed: true,
    })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain("Japanese companies are excluded")
    expect(result.reasons).toContain("A high-confidence public form was not verified")
  })

  it("wires manual work to the light initial-interest contract and raw public evidence", () => {
    const input = buildManualInitialMessageInput({
      profile: { ...qualifiedProfile, productContext: "A model-written summary that must not be used." },
      evidence: {
        companyName: "Acme",
        productContext: "Public homepage wording | Workflow software for small business teams",
        businessModel: "saas",
        sourceUrl: "https://acme.com/",
        title: "Acme",
        description: "Public homepage wording",
        headings: ["Workflow software for small business teams"],
        audit: {
          engine: "local_heuristic",
          generated_at: "2026-07-15T00:00:00.000Z",
          score: 40,
          status: { tokushoho_missing: true, appi_missing: true, local_payments_missing: true, japanese_language_missing: true, jpy_currency_missing: true, japan_shipping_missing: true },
          signals: { tokushoho: [], appi: [], local_payments: [], japanese_language: [], jpy_currency: [], japan_shipping: [] },
          pages_checked: ["https://acme.com/"],
          sales_pitch_context: "Public-page observations",
          human_review_required: true,
          legal_disclaimer: "Not legal advice",
        },
      },
    })

    expect(input).toMatchObject({
      purpose: "initial_interest",
      productContext: "Public homepage wording | Workflow software for small business teams",
    })
    expect(input.productContext).not.toContain("model-written")
  })

  it("uses a Crawl4AI result only after HTML form verification", () => {
    const baseline = { ...verifiedForm, method: "dom" as const, confidence: 94 }
    const crawlVerified = { ...verifiedForm, method: "crawl4ai" as const, confidence: 90 }
    const crawlPageOnly = { ...crawlVerified, verification: "page" as const, confidence: 74 }

    expect(selectBestManualFormResult([baseline, crawlVerified])).toEqual(baseline)
    expect(selectBestManualFormResult([{ ...baseline, verification: "fallback", confidence: 20 }, crawlVerified])).toEqual(crawlVerified)
    expect(selectBestManualFormResult([{ ...baseline, verification: "fallback", confidence: 20 }, crawlPageOnly])).toEqual(crawlPageOnly)
  })
})
