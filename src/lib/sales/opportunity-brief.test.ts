import { describe, expect, it, vi } from "vitest"
import type { DiagnosticReportData } from "./diagnostic"
import { buildOpportunityBrief, readCompetitiveLandscape, readOpportunityProjection } from "./opportunity-brief"

const projection = {
  modelVersion: "public-opportunity-v1",
  generatedAt: "2026-07-13T00:00:00.000Z",
  classification: "modeled-estimate",
  estimatedMonthlyVisits: 130_000,
  monthlyVisitRange: { low: 45_000, high: 350_000 },
  markets: [{ code: "JP", label: "Japan", estimatedMonthlyVisits: 1_950, share: 0.015, confidence: 0.35, classification: "estimated" }],
  assumptions: {
    businessModel: "ecommerce",
    averageOrderValueUsd: 110,
    conversionRate: 0.018,
    grossMargin: 0.55,
    currentJapanShare: 0.015,
    targetJapanShareMonth24: 0.055,
    monthlyManagedFeeUsdAfterMonth6: 995,
    setupFeeUsd: 12_000,
  },
  scenarios: ["conservative", "base", "upside"].map((scenario) => ({
    scenario,
    months: [],
    horizons: [
      { horizon: 6, month: 6, japanVisits: 3_000, incrementalRevenueUsd: 1, incrementalGrossProfitUsd: 1, cumulativeGrossProfitUsd: 1, cumulativeCostUsd: 12_000, cumulativeNetBenefitUsd: -1, roiPercent: -0.1 },
      { horizon: 12, month: 12, japanVisits: 4_000, incrementalRevenueUsd: 1, incrementalGrossProfitUsd: 1, cumulativeGrossProfitUsd: 20_000, cumulativeCostUsd: 17_970, cumulativeNetBenefitUsd: 2_030, roiPercent: 16.9 },
      { horizon: 24, month: 24, japanVisits: 7_000, incrementalRevenueUsd: 1, incrementalGrossProfitUsd: 1, cumulativeGrossProfitUsd: 50_000, cumulativeCostUsd: 29_910, cumulativeNetBenefitUsd: 20_090, roiPercent: 167.4 },
    ],
  })),
  monthlyOpportunityGapUsd: 10_296,
  paybackMonth: 11,
  evidence: [],
  limitations: ["Public-signal planning model."],
}

function report(meta: Record<string, unknown>): DiagnosticReportData {
  return {
    company_name: "Acme",
    report_locale: "en",
    target_country: "US",
    template_variant: "japan_entry",
    industry: null,
    prefecture: null,
    expires_at: "2026-08-13",
    hook: "Japan opportunity",
    total_loss: "0",
    acts: [],
    cta_text: "Review",
    video_thumbnail: null,
    demo_url: null,
    source_coverage: { score: 0, collected: 0, configured: 0, missing: 0, items: [] },
    intelligence: { signals: [], painPoints: [], nextActions: [] },
    meta,
    content_template: { title: "", purpose: "", quality_bar: "", dify_selection_rule: "", prompt_template: "", offer_code: "", appeal_angle: "speed_conversion" },
    report_url: "https://paradigmjp.com/en/report/acme",
    localized_report_urls: [],
  }
}

describe("opportunity brief publication gate", () => {
  it("publishes only a complete public-opportunity projection", () => {
    expect(readOpportunityProjection({ japan_entry_projection: projection })?.monthlyOpportunityGapUsd).toBe(10_296)
    expect(readOpportunityProjection({ japan_entry_projection: { ...projection, scenarios: [] } })).toBeNull()
  })

  it("builds readiness findings from the persisted public-page audit", () => {
    const brief = buildOpportunityBrief(report({
      japan_entry_projection: projection,
      japan_market_audit: {
        status: { japanese_language_missing: true, jpy_currency_missing: false, local_payments_missing: true, japan_shipping_missing: true, tokushoho_missing: true, appi_missing: false },
        signals: { japanese_language: [], jpy_currency: ["JPY"], local_payments: [], japan_shipping: [], tokushoho: [], appi: ["privacy policy"] },
      },
    }))
    expect(brief?.findings.find((item) => item.id === "japanese-language")?.status).toBe("gap")
    expect(brief?.findings.find((item) => item.id === "jpy-pricing")?.status).toBe("observed")
  })

  it("shows named competitors only when each has HTTPS public evidence", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const landscape = readCompetitiveLandscape({
      japan_entry_competitor_analysis: {
        reviewed_at: "2026-07-13T00:00:00.000Z",
        methodology: "Public pricing and product pages reviewed.",
        competitors: [
          { name: "Verified Co", domain: "verified.example", category: "direct", summary: "Japan-ready checkout.", strengths: ["JPY"], gaps: [], evidence: [{ label: "Pricing", source_url: "https://verified.example/pricing" }] },
          { name: "Unverified Co", domain: "unverified.example", category: "direct", summary: "No source.", evidence: [{ label: "Claim", source_url: "http://unverified.example" }] },
        ],
      },
    })
    expect(landscape.status).toBe("verified")
    expect(landscape.competitors.map((item) => item.name)).toEqual(["Verified Co"])
  })

  it("fails closed when no verified competitor evidence exists", () => {
    expect(readCompetitiveLandscape({ japan_entry_competitor_analysis: { competitors: [] } })).toMatchObject({
      status: "pending_verification",
      competitors: [],
    })
  })
})
