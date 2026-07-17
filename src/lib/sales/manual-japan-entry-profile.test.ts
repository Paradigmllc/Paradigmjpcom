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
      productContext: "Workflow software for independent retailers | Inventory coordination | We serve customers in 30 countries",
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
        outreachPlaybook: "saas_ai_devtools",
        positioningConcept: {
          sourcePhrase: "Workflow software for independent retailers",
          japaneseHeadline: "独立系小売向けワークフロー",
          japaneseSupportLine: "在庫調整を支えるソフトウェアの日本語ポジショニング案です。",
        },
        commercialSignals: [
          { kind: "global_customers", sourcePhrase: "customers in 30 countries", detail: "The public page states an international customer footprint." },
          { kind: "funding", sourcePhrase: "Raised $10M", detail: "This statement was invented by the model." },
        ],
      },
    })

    expect(grounded.productContext).toBe("Workflow software for independent retailers | Inventory coordination | We serve customers in 30 countries")
    expect(grounded.observedFacts).toEqual([
      "Workflow software for independent retailers",
      "Inventory coordination",
      "We serve customers in 30 countries",
    ])
    expect(JSON.stringify(grounded)).not.toContain("Invented")
    expect(grounded.positioningConcept?.sourcePhrase).toBe("Workflow software for independent retailers")
    expect(grounded.commercialSignals).toEqual([
      { kind: "global_customers", sourcePhrase: "customers in 30 countries", detail: "海外顧客を示す公開原文です。予算・支払能力は別途確認が必要です。" },
    ])
    expect(grounded.marketLens).toMatchObject({ priority: "individual_review", commercialEvidenceStatus: "partial" })
  })

  it("does not retain an unobserved model-generated company name", () => {
    const grounded = groundManualCompanyProfile({
      domain: "example.com",
      fallbackCompanyName: null,
      evidenceText: "Workflow software for independent retailers",
      productContext: "Workflow software for independent retailers",
      profile: {
        companyName: "Invented Holdings",
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
        productContext: "Invented claim",
        observedFacts: ["Invented customer outcome"],
        outreachPlaybook: "saas_ai_devtools",
        positioningConcept: null,
        commercialSignals: [],
      },
    })

    expect(grounded.companyName).toBe("example.com")
  })
})
