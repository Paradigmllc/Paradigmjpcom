import { describe, expect, it } from "vitest"
import { buildMarketVisibilityIndex } from "./market-visibility"

describe("public market visibility index", () => {
  it("combines public rank and crawl signals without inventing traffic or revenue", () => {
    const result = buildMarketVisibilityIndex({
      domain: "example.co.uk",
      targetCountry: "GB",
      tranco: { rank: 42_000 },
      cloudflareRadar: { rankBucket: "top-100k" },
      commonCrawl: { pagesInIndex: 240, lastCrawled: "2026-07-01T00:00:00Z" },
      sitemap: { data: { totalUrls: 120, lastModified: "2026-06-28T00:00:00Z" } },
      countryNic: [{ ok: true, countryCode: "GB" }],
    }, Date.parse("2026-07-12T00:00:00Z"))

    expect(result.index).toBeGreaterThan(0)
    expect(result.band).toBe("top-100k")
    expect(result.countrySignals.some((signal) => signal.countryCode === "GB")).toBe(true)
    expect(result.actualMonthlyVisits).toBeNull()
    expect(result.actualRevenue).toBeNull()
    expect(result.unknowns).toContain("Actual country traffic share is not publicly observable")
  })

  it("returns an explicit unknown state when no public observations exist", () => {
    const result = buildMarketVisibilityIndex({ domain: "example.invalid" }, Date.parse("2026-07-12T00:00:00Z"))

    expect(result.index).toBeNull()
    expect(result.band).toBe("not-observed")
    expect(result.evidence).toEqual([])
    expect(result.actualMonthlyVisits).toBeNull()
    expect(result.actualRevenue).toBeNull()
  })
})
