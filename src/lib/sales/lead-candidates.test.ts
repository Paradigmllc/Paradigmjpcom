import { describe, expect, it } from "vitest"
import {
  inferCountrySignals,
  scoreCandidate,
  technologySlug,
  tldPatternsForCountry,
} from "./lead-candidate-scoring"
import { inferFreshDomainSignals } from "./global-smb-scoring"
import { getGlobalSmbMarketConfig } from "./global-smb-market-config"
import { freshDomainRowsFromSeeds } from "./fresh-domain-discovery"

describe("lead candidate acquisition", () => {
  it("normalizes technology names for stack filters", () => {
    expect(technologySlug("WooCommerce")).toBe("woocommerce")
    expect(technologySlug("Zoho CRM")).toBe("zoho-crm")
    expect(technologySlug("C++ Runtime")).toBe("cplusplus-runtime")
  })

  it("scores country confidence from TLD and local evidence", () => {
    const southAfrica = inferCountrySignals({
      domain: "example.co.za",
      targetCountry: "ZA",
      evidenceText: "Cape Town +27 21 000 0000",
    })
    const switzerland = inferCountrySignals({
      domain: "example.swiss",
      targetCountry: "CH",
      evidenceText: "Zurich CHF 120",
    })

    expect(Math.max(...southAfrica.map((signal) => signal.confidence))).toBeGreaterThanOrEqual(90)
    expect(southAfrica.some((signal) => signal.signalType === "phone")).toBe(true)
    expect(Math.max(...switzerland.map((signal) => signal.confidence))).toBeGreaterThanOrEqual(90)
    expect(switzerland.some((signal) => signal.signalType === "currency")).toBe(true)
  })

  it("keeps local SMB no-website leads promotable without stack evidence", () => {
    const score = scoreCandidate({
      countrySignals: [{ countryCode: "CH", signalType: "phone", confidence: 92, evidence: "+41" }],
      lane: "no_website_local_smb",
      hasWebsite: false,
      hasContactSignal: true,
      source: "local_smb_directory",
    })

    expect(score.websiteAbsenceScore).toBeGreaterThan(80)
    expect(score.geoConfidence).toBe(92)
    expect(score.opportunityScore).toBeGreaterThan(55)
  })

  it("scores fresh parked local-service domains without using WHOIS contacts as proof", () => {
    const signals = inferFreshDomainSignals({
      domain: "austin-roof-care.com",
      countryCode: "US",
      registeredAt: new Date().toISOString(),
      companyName: "Austin Roof Care",
      industryHint: "Roofing",
      websiteState: "parked",
      hasPublicContact: false,
      evidenceText: "Austin roofing contractor",
    })
    const score = scoreCandidate({
      countrySignals: inferCountrySignals({
        domain: "austin-roof-care.com",
        targetCountry: "US",
        evidenceText: "Austin roofing contractor",
      }),
      lane: "dns_freshness",
      hasWebsite: false,
      hasContactSignal: signals.contactabilityHint,
      source: "dns_freshness",
      isEnterpriseLike: signals.isEnterpriseLike,
      websiteWeaknessScore: signals.websiteWeaknessScore,
      freshnessHintScore: signals.freshnessHintScore,
      marketFitScore: signals.localServiceFitScore,
    })

    expect(signals.freshnessHintScore).toBeGreaterThanOrEqual(90)
    expect(signals.websiteWeaknessScore).toBeGreaterThan(80)
    expect(score.opportunityScore).toBeGreaterThan(55)
    expect(score.contactabilityScore).toBeLessThan(50)
  })

  it("flags enterprise-like fresh domains before promotion", () => {
    const signals = inferFreshDomainSignals({
      domain: "global-bank-holdings.com",
      countryCode: "US",
      companyName: "Global Bank Holdings Corporation",
      websiteState: "under_construction",
    })

    expect(signals.isEnterpriseLike).toBe(true)
  })

  it("normalizes UK input to the existing GB country scope", () => {
    const market = getGlobalSmbMarketConfig("UK")
    const signals = inferCountrySignals({
      domain: "example.co.uk",
      targetCountry: "UK",
      evidenceText: "London £120",
    })

    expect(market.countryCode).toBe("GB")
    expect(tldPatternsForCountry("UK")).toContain("*.co.uk")
    expect(signals.every((signal) => signal.countryCode === "GB")).toBe(true)
    expect(Math.max(...signals.map((signal) => signal.confidence))).toBeGreaterThanOrEqual(90)
  })

  it("builds fresh-domain ingestion rows without persisting contact data", () => {
    const rows = freshDomainRowsFromSeeds({
      countryCode: "UK",
      websiteState: "under_construction",
      seeds: [{
        domain: "example.co.uk",
        sources: ["crtsh_bulk", "zone_file", "crtsh_bulk"],
        rdap: {
          registeredAt: "2026-06-01T00:00:00Z",
          changedAt: "2026-06-10T00:00:00Z",
          eventActions: ["registration"],
          statuses: ["active"],
          lookupUrl: "https://rdap.example/domain/example.co.uk",
        },
      }],
    })

    expect(rows[0]?.countryCode).toBe("GB")
    expect(rows[0]?.websiteState).toBe("under_construction")
    expect(rows[0]?.raw?.acquisition_sources).toEqual(["crtsh_bulk", "zone_file"])
    expect(JSON.stringify(rows[0])).not.toContain("@")
  })

  it("maps country codes to Common Crawl CDX patterns", () => {
    expect(tldPatternsForCountry("ZA")).toContain("*.co.za")
    expect(tldPatternsForCountry("ZA")).toContain("*.za")
    expect(tldPatternsForCountry("CH")).toContain("*.swiss")
    expect(tldPatternsForCountry("GB")).toContain("*.co.uk")
    expect(tldPatternsForCountry("EG")).toContain("*.com.eg")
    expect(tldPatternsForCountry("BR")).toEqual(["*.br"])
  })
})
