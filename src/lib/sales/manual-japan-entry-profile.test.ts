import { describe, expect, it } from "vitest"
import {
  groundManualCompanyProfile,
  hasDeterministicJapanEvidence,
  parseManualCompanyProfile,
} from "./manual-japan-entry-profile"

function modelProfile(overrides: Record<string, unknown> = {}) {
  return {
    companyName: "Screenshot to Code",
    countryCode: "US",
    isJapaneseCompany: false,
    smbStatus: "qualified",
    smbConfidence: 83,
    smbEvidence: ["Public software product and pricing are visible."],
    japanEntryFitStatus: "qualified",
    japanEntryFitConfidence: 78,
    japanEntryFitEvidence: ["The product is delivered online."],
    businessModel: "saas",
    industry: "Technology / IT",
    productContext: "AI-powered screenshot-to-code software for product teams.",
    observedFacts: ["The public website describes screenshot-to-code software."],
    outreachPlaybook: "saas_ai_devtools",
    positioningConcept: null,
    commercialSignals: [],
    ...overrides,
  }
}

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

  it("treats missing Japan readiness as the sales opportunity for an overseas SaaS", () => {
    const grounded = groundManualCompanyProfile({
      domain: "altairis.fr",
      fallbackCompanyName: "Altairis",
      evidenceText: "Altairis | ERP and CRM software for businesses",
      productContext: "ERP and CRM software for businesses | Cloud hosting and managed infrastructure",
      profile: parseManualCompanyProfile(modelProfile({
        companyName: "Altairis",
        countryCode: "FR",
        businessModel: "saas",
        japanEntryFitStatus: "rejected",
        japanEntryFitConfidence: 95,
        japanEntryFitEvidence: [
          "Website is entirely in French, with no Japanese language support.",
          "No indication of Japan market presence or localization.",
          "Japan readiness audit shows missing JPY currency and local payments.",
          "The ERP/CRM product is unlikely to fit the Japanese market without localization.",
        ],
      })),
    })

    expect(grounded.japanEntryFitStatus).toBe("qualified")
    expect(grounded.japanEntryFitConfidence).toBeGreaterThanOrEqual(70)
    expect(grounded.japanEntryFitEvidence).toContain(
      "Missing Japanese localization or current Japan presence is a market-entry readiness gap, not an offer-fit rejection criterion.",
    )
  })

  it("preserves an explicit structural rejection for a location-bound service", () => {
    const grounded = groundManualCompanyProfile({
      domain: "local-tour.example",
      fallbackCompanyName: "Local Tour",
      evidenceText: "Local Tour | In-person tours in one city",
      productContext: "In-person walking tours available only in one local city",
      profile: parseManualCompanyProfile(modelProfile({
        companyName: "Local Tour",
        countryCode: "FR",
        businessModel: "service",
        japanEntryFitStatus: "rejected",
        japanEntryFitEvidence: ["The service is delivered only in person at one fixed location and cannot be exported."],
      })),
    })

    expect(grounded.japanEntryFitStatus).toBe("rejected")
  })
})

describe("manual company DeepSeek response compatibility", () => {
  it("normalizes the production schema drift without weakening the canonical schema", () => {
    const parsed = parseManualCompanyProfile(modelProfile({
      countryCode: "us",
      isJapaneseCompany: "false",
      smbStatus: "Qualified",
      smbConfidence: "83",
      smbEvidence: "Public software product is visible; Public pricing is visible",
      japanEntryFitStatus: "review required",
      japanEntryFitConfidence: "78%",
      japanEntryFitEvidence: "The product is delivered online\nNo Japanese customer path was found",
      businessModel: "ecomerce",
      observedFacts: "Screenshot-to-code product\nPublic pricing page",
      positioningConcept: { concept: "AIサイト制作" },
      unexpectedModelKey: "must not pass the strict internal boundary",
    }))

    expect(parsed).toMatchObject({
      countryCode: "US",
      isJapaneseCompany: false,
      smbStatus: "qualified",
      smbConfidence: 83,
      smbEvidence: ["Public software product is visible", "Public pricing is visible"],
      japanEntryFitStatus: "review_required",
      japanEntryFitConfidence: 78,
      businessModel: "ecommerce",
      positioningConcept: null,
    })
    expect(parsed.japanEntryFitEvidence).toHaveLength(2)
    expect(parsed.observedFacts).toEqual(["Screenshot-to-code product", "Public pricing page"])
    expect(parsed).not.toHaveProperty("unexpectedModelKey")
  })

  it("keeps evidence bounded by item count and item length", () => {
    const parsed = parseManualCompanyProfile(modelProfile({
      smbEvidence: Array.from({ length: 12 }, (_, index) => `Evidence ${index + 1}`),
      japanEntryFitEvidence: `A${"b".repeat(300)}`,
    }))

    expect(parsed.smbEvidence).toHaveLength(8)
    expect(parsed.japanEntryFitEvidence).toHaveLength(1)
    expect(parsed.japanEntryFitEvidence[0]).toHaveLength(240)
  })

  it("preserves a complete canonical positioning concept while removing nested extras", () => {
    const parsed = parseManualCompanyProfile(modelProfile({
      positioningConcept: {
        sourcePhrase: "AI-powered screenshot-to-code software",
        japaneseHeadline: "スクリーンショットからコードへ",
        japaneseSupportLine: "公開されている製品説明に基づく日本語ポジショニング案です。",
        concept: "unexpected nested output",
      },
    }))

    expect(parsed.positioningConcept).toEqual({
      sourcePhrase: "AI-powered screenshot-to-code software",
      japaneseHeadline: "スクリーンショットからコードへ",
      japaneseSupportLine: "公開されている製品説明に基づく日本語ポジショニング案です。",
    })
  })

  it.each([
    ["confidence above the allowed range", { smbConfidence: "101" }],
    ["non-numeric confidence", { smbConfidence: "high" }],
    ["unknown business model", { businessModel: "marketplace" }],
    ["non-string evidence", { smbEvidence: { claim: "Public evidence" } }],
  ])("rejects %s", (_label, overrides) => {
    expect(() => parseManualCompanyProfile(modelProfile(overrides))).toThrow()
  })
})
