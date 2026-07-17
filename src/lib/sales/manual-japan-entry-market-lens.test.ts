import { describe, expect, it } from "vitest"
import { buildManualMarketLens, groundManualCommercialSignals } from "./manual-japan-entry-market-lens"

describe("manual Japan Entry market lens", () => {
  it("uses country only as a research-priority lens, never as a price tier", () => {
    expect(buildManualMarketLens({ countryCode: "PL", commercialSignals: [] })).toMatchObject({
      priority: "regional_core",
      label: "Regional主要母集団",
      commercialEvidenceStatus: "unverified",
      pricingPolicy: "no_automatic_country_adjustment",
      requiresHumanReview: true,
    })
  })

  it("keeps unknown markets eligible for individual company review", () => {
    expect(buildManualMarketLens({ countryCode: "NZ", commercialSignals: [] })).toMatchObject({
      priority: "individual_review",
      label: "企業別評価",
    })
  })

  it("keeps only exact, kind-compatible phrases from the public product context", () => {
    const signals = groundManualCommercialSignals([
      { kind: "global_customers", sourcePhrase: "customers in 30 countries", detail: "Global customer footprint" },
      { kind: "funding", sourcePhrase: "Raised $20M", detail: "Invented funding" },
      { kind: "founder_led", sourcePhrase: "Our founder writes product notes", detail: "Founder presence is not founder-led ownership" },
    ], "We support customers in 30 countries | Workflow software")

    expect(signals).toEqual([
      { kind: "global_customers", sourcePhrase: "customers in 30 countries", detail: "海外顧客を示す公開原文です。予算・支払能力は別途確認が必要です。" },
    ])
  })
})
