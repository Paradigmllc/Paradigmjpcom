import { describe, expect, it } from "vitest"
import { buildFastManualCompanyProfile } from "./manual-work-fast-qualification"
import type { JapanMarketAudit } from "./sources/japan-market-audit"

function audit(overrides: Partial<JapanMarketAudit["status"]> = {}): JapanMarketAudit {
  const status = {
    tokushoho_missing: true,
    appi_missing: true,
    local_payments_missing: true,
    japanese_language_missing: true,
    jpy_currency_missing: true,
    japan_shipping_missing: true,
    ...overrides,
  }
  return {
    engine: "local_heuristic",
    generated_at: "2026-07-29T00:00:00.000Z",
    score: 10,
    status,
    signals: { tokushoho: [], appi: [], local_payments: [], japanese_language: [], jpy_currency: [], japan_shipping: [] },
    pages_checked: ["https://example.com/"],
    sales_pitch_context: "Fast homepage audit",
    human_review_required: true,
    legal_disclaimer: "Not legal advice",
  }
}

describe("fast manual work qualification", () => {
  it("promotes a non-Japanese SaaS with grounded product evidence and Japan readiness gaps", () => {
    const result = buildFastManualCompanyProfile({
      domain: "example.sg",
      companyName: "Example Cloud",
      productContext: "Example Cloud | AI workflow automation for ecommerce teams | Start a free trial",
      productNames: ["Example Cloud"],
      businessModel: "saas",
      title: "Example Cloud",
      description: "AI workflow automation for ecommerce teams",
      headings: ["Automate your operations"],
      audit: audit(),
    })

    expect(result.profile.countryCode).toBe("SG")
    expect(result.profile.businessModel).toBe("saas")
    expect(result.profile.japanEntryFitStatus).toBe("qualified")
    expect(result.qualification.priority).toBe("promote")
    expect(result.qualification.score).toBeGreaterThanOrEqual(65)
  })

  it("deprioritizes hyperscale data-centre infrastructure rather than leaving it in generic review", () => {
    const result = buildFastManualCompanyProfile({
      domain: "airtrunk.com",
      companyName: "AirTrunk",
      productContext: "Hyperscale data centres and critical infrastructure campuses delivering hundreds of megawatts of capacity",
      productNames: [],
      businessModel: "service",
      title: "AirTrunk | Hyperscale Data Centres",
      description: "Developing and operating hyperscale data centre campuses across Asia Pacific",
      headings: ["Critical infrastructure at hyperscale", "Power capacity for cloud growth"],
      audit: audit(),
    })

    expect(result.qualification.priority).toBe("low")
    expect(result.qualification.score).toBe(25)
    expect(result.qualification.reasons.join(" ")).toContain("大規模な物理インフラ")
  })

  it("rejects a Japanese company deterministically", () => {
    const result = buildFastManualCompanyProfile({
      domain: "example.jp",
      companyName: "Example株式会社",
      productContext: "Example株式会社 | 日本国内向けサービス",
      productNames: ["Example"],
      businessModel: "service",
      title: "Example株式会社",
      description: "東京都に所在する日本国内向けサービス",
      headings: [],
      audit: audit({ japanese_language_missing: false, jpy_currency_missing: false }),
    })

    expect(result.profile.isJapaneseCompany).toBe(true)
    expect(result.profile.japanEntryFitStatus).toBe("rejected")
    expect(result.qualification.score).toBe(0)
    expect(result.qualification.priority).toBe("low")
  })

  it("never invents commercial signals or a positioning concept", () => {
    const result = buildFastManualCompanyProfile({
      domain: "brand.co",
      companyName: "Brand",
      productContext: "Premium desk accessories designed for compact workspaces",
      productNames: [],
      businessModel: "ecommerce",
      title: "Brand",
      description: "Premium desk accessories designed for compact workspaces",
      headings: [],
      audit: audit(),
    })

    expect(result.profile.commercialSignals).toEqual([])
    expect(result.profile.positioningConcept).toBeNull()
    expect(result.profile.smbStatus).toBe("review_required")
  })
})
