import { describe, expect, it } from "vitest"
import { manualWorkEligibility, normalizeManualWorkUrl } from "./manual-japan-entry-service"
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
})
