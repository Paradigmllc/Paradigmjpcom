import { describe, expect, it } from "vitest"
import { buildMarketVisibilityIndex } from "./market-visibility"
import { buildJapanEntryScore, normalizePublicDomain } from "./japan-entry-score"

const visibility = buildMarketVisibilityIndex({
  domain: "example.co.uk",
  tranco: { rank: 42_000 },
  cloudflareRadar: { rank: 50_000 },
  commonCrawl: { pagesInIndex: 240, lastCrawled: "2026-07-01T00:00:00Z" },
  countryNic: [{ ok: true, countryCode: "GB" }],
}, Date.parse("2026-07-12T00:00:00Z"))

describe("japan entry score", () => {
  it("normalizes public domains and rejects private hosts", () => {
    expect(normalizePublicDomain("https://www.example.com/path")).toBe("example.com")
    expect(normalizePublicDomain("http://localhost:3000")).toBeNull()
    expect(normalizePublicDomain("http://127.0.0.1")).toBeNull()
    expect(normalizePublicDomain("not a domain")).toBeNull()
  })

  it("separates public evidence, self-reported readiness, and unknown private metrics", () => {
    const result = buildJapanEntryScore({
      domain: "example.co.uk",
      targetCountry: "GB",
      visibility,
      audit: {
        engine: "local_heuristic",
        generated_at: "2026-07-12T00:00:00Z",
        score: 70,
        status: { tokushoho_missing: false, appi_missing: true, local_payments_missing: false },
        signals: { tokushoho: ["tokushoho"], appi: [], local_payments: ["JCB"] },
        pages_checked: ["https://example.co.uk/"],
        sales_pitch_context: "review",
        human_review_required: true,
        legal_disclaimer: "not legal advice",
      },
      homepage: {
        ok: true,
        hasJapaneseLanguage: true,
        hasJapaneseCurrency: true,
        hasJapanPayment: true,
        hasJapanShipping: false,
        hasCheckoutOrInquiry: true,
        title: "Example",
        observedAt: "2026-07-12T00:00:00Z",
      },
      sitemap: { totalUrls: 120, hasBlog: true, hasProducts: true },
      schema: { hasOrganization: true, hasProduct: true, hasPrice: true },
      selfReported: {
        japaneseLanguage: "yes",
        japanPayments: "yes",
        japanFulfillment: "unknown",
        japanSupport: "no",
        decisionReady: "yes",
      },
    })

    expect(result.score).not.toBeNull()
    expect(result.coverage).toBe(100)
    expect(result.countrySignals.some((signal) => signal.countryCode === "GB")).toBe(true)
    expect(result.actualMonthlyVisits).toBeNull()
    expect(result.actualRevenue).toBeNull()
    expect(result.unknowns).toContain("Actual monthly visits are not publicly observable")
    expect(result.factors.find((factor) => factor.id === "execution-readiness")?.source).toBe("self-reported")
  })

  it("does not treat missing data as a zero score", () => {
    const result = buildJapanEntryScore({
      domain: "example.invalid",
      targetCountry: "US",
      visibility: buildMarketVisibilityIndex({ domain: "example.invalid" }),
      audit: null,
      homepage: {
        ok: false,
        hasJapaneseLanguage: false,
        hasJapaneseCurrency: false,
        hasJapanPayment: false,
        hasJapanShipping: false,
        hasCheckoutOrInquiry: false,
        title: null,
        observedAt: "2026-07-12T00:00:00Z",
      },
      sitemap: { totalUrls: null, hasBlog: null, hasProducts: null },
      schema: { hasOrganization: false, hasProduct: false, hasPrice: false },
      selfReported: {
        japaneseLanguage: "unknown",
        japanPayments: "unknown",
        japanFulfillment: "unknown",
        japanSupport: "unknown",
        decisionReady: "unknown",
      },
    })

    expect(result.score).toBeNull()
    expect(result.band).toBe("no-data")
    expect(result.coverage).toBe(0)
  })
})
