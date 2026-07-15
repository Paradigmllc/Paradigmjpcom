import { describe, expect, it } from "vitest"
import { groundManualCompanyProfile, hasDeterministicJapanEvidence } from "./manual-japan-entry-profile"

describe("manual company Japan exclusion", () => {
  it("rejects .jp domains regardless of model output", () => {
    expect(hasDeterministicJapanEvidence({ domain: "example.co.jp", text: "Example", countryCode: "US", llmJapanese: false })).toBe(true)
  })

  it("rejects explicit Japanese corporate markers", () => {
    expect(hasDeterministicJapanEvidence({ domain: "example.com", text: "株式会社 Example", countryCode: null, llmJapanese: false })).toBe(true)
  })

  it("does not reject an overseas domain without Japan evidence", () => {
    expect(hasDeterministicJapanEvidence({ domain: "example.com", text: "A Delaware software company", countryCode: "US", llmJapanese: false })).toBe(false)
  })

  it("replaces model-written product claims with exact public-page evidence", () => {
    const grounded = groundManualCompanyProfile({
      domain: "example.com",
      fallbackCompanyName: "Example",
      evidenceText: "Example | Workflow software for independent retailers",
      productContext: "Workflow software for independent retailers | Inventory coordination",
      profile: {
        companyName: "Example",
        countryCode: "US",
        isJapaneseCompany: false,
        smbStatus: "qualified",
        smbConfidence: 90,
        smbEvidence: ["Public evidence"],
        japanEntryFitStatus: "qualified",
        japanEntryFitConfidence: 88,
        japanEntryFitEvidence: ["Public evidence"],
        businessModel: "saas",
        industry: "Technology / IT",
        productContext: "Invented AI outcomes that were not present on the website.",
        observedFacts: ["Invented customer outcome"],
      },
    })

    expect(grounded.productContext).toBe("Workflow software for independent retailers | Inventory coordination")
    expect(grounded.observedFacts).toEqual([
      "Workflow software for independent retailers",
      "Inventory coordination",
    ])
    expect(JSON.stringify(grounded)).not.toContain("Invented")
  })
})
