import { describe, expect, it } from "vitest"
import {
  inferCountrySignals,
  scoreCandidate,
  technologySlug,
  tldPatternsForCountry,
} from "./lead-candidate-scoring"

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

  it("maps country codes to Common Crawl CDX patterns", () => {
    expect(tldPatternsForCountry("ZA")).toContain("*.za")
    expect(tldPatternsForCountry("CH")).toContain("*.swiss")
    expect(tldPatternsForCountry("BR")).toEqual(["*.br"])
  })
})
