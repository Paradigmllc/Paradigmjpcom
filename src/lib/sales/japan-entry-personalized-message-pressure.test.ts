import { describe, expect, it } from "vitest"
import { buildJapanEntryProjection } from "./japan-entry-projection"
import { buildJapanEntryPersonalizationFacts, reviewPersonalizedJapanEntryMessage } from "./japan-entry-personalized-message"
import type { MarketVisibilityIndex } from "./market-visibility"

const visibility: MarketVisibilityIndex = {
  version: "public-signals-v1",
  index: 63,
  band: "top-100k",
  bestRank: 52_000,
  countrySignals: [{ countryCode: "US", signal: "ccTLD", value: ".us", confidence: 0.72 }],
  evidence: [{ id: "rank", label: "Rank", value: "#52,000", source: "Tranco", sourceUrl: "https://tranco-list.eu/", observedAt: "2026-07-13", confidence: 0.7, limitation: "Public proxy." }],
  unknowns: [],
  actualMonthlyVisits: null,
  actualRevenue: null,
}

const projection = buildJapanEntryProjection({ companyName: "Example", domain: "example.com", targetCountry: "US", visibility, observedAt: "2026-07-13T00:00:00.000Z" })
const audit = {
  status: { tokushoho_missing: true, appi_missing: true, local_payments_missing: true, japanese_language_missing: true, jpy_currency_missing: true, japan_shipping_missing: true },
  signals: { tokushoho: [], appi: [], local_payments: [], japanese_language: [], jpy_currency: [], japan_shipping: [] },
  pages_checked: ["https://example.com/", "https://example.com/payment", "https://example.com/terms"],
}
const competitorAnalysis = {
  competitors: [{ name: "Japan Analytics Co", domain: "japan-analytics.example", category: "direct", summary: "Offers Japanese-language retail analytics with JPY pricing.", evidence: [{ label: "Product page", source_url: "https://japan-analytics.example/product" }] }],
  demand_signals: [{ label: "Category demand", statement: "A verified public dataset shows sustained Japanese search interest in retail inventory analytics.", evidence_url: "https://example.com/japan-demand", confidence: 0.74 }],
}

describe("Japan Entry competitor and regulatory pressure copy", () => {
  it("adds only source-backed competitor, demand, market, and conditional regulation facts", () => {
    const facts = buildJapanEntryPersonalizationFacts(audit, "ecommerce", projection, { competitorAnalysis })
    expect(facts.map((fact) => fact.id)).toEqual(expect.arrayContaining([
      "verified-competitor-1", "verified-japan-demand-1", "official-japan-ecommerce-market",
      "regulatory-commerce-enforcement", "regulatory-privacy-review",
    ]))
    expect(facts.find((fact) => fact.id === "verified-competitor-1")?.anchors).toContain("Japan Analytics Co")
    expect(facts.every((fact) => !fact.source.startsWith("http://"))).toBe(true)
  })

  it("accepts dual-pressure copy only when positive and regulatory evidence are both selected", () => {
    const facts = buildJapanEntryPersonalizationFacts(audit, "ecommerce", projection, { competitorAnalysis })
    const message = `Hello, I’m Sato from Paradigm LLC in Japan. We help overseas companies enter the Japanese market.

I reviewed Example’s subscription analytics platform for independent retailers, including its inventory insights described on the public site.

The public-signal planning model estimates approximately 1,950 monthly visits from Japan and a potential monthly revenue opportunity gap of approximately $10,296 under stated assumptions; these are modeled estimates, not measured analytics. Public-source analysis identifies Japan Analytics Co as a direct comparator. A verified public dataset shows sustained Japanese search interest in retail inventory analytics. The checked pages did not show a Japanese-language customer path. The Consumer Affairs Agency says in-scope failures can bring business-improvement instructions or suspension orders. This screen does not establish applicability or breach. Waiting preserves an untested customer-path gap, while launching without scoping the rules can increase exposure.

Paradigm addresses these items through our Japan Entry Package, which validates the opportunity and addresses the named customer-path gap. The package is $12,000 paid upfront, with the first six months of managed support included at no additional monthly charge. Would a detailed Japan opportunity analysis be useful?`
    const factIds = ["japan-audit-language", "modeled-japan-monthly-visits", "modeled-monthly-opportunity-gap", "verified-competitor-1", "verified-japan-demand-1", "regulatory-commerce-enforcement"]
    const review = reviewPersonalizedJapanEntryMessage({
      message,
      companyName: "Example",
      productContext: "Example provides a subscription analytics platform for independent retailers with inventory insights.",
      productEvidence: "subscription analytics platform for independent retailers",
      factIds,
      facts,
    })
    expect(review.passed).toBe(true)
    expect(review.wordCount).toBeGreaterThanOrEqual(140)
  })
})
