import { describe, expect, it } from "vitest"
import { callDeepSeek } from "@/lib/deepseek"
import { aiAdjudicationMode, applyAiSmbReview, requiresAiSmbAdjudication, reviewUnknownSmbCandidate } from "./lead-candidate-ai-smb-review"
import type { HomepageQualityProfile, LeadQualityGate } from "./lead-quality-gate"

const homepage: HomepageQualityProfile = {
  url: "https://alpha.example",
  html: "",
  title: "Alpha Cloud",
  description: "Founder-led inventory software for independent retailers.",
  organizationNames: ["Alpha Cloud"],
  organizationTypes: ["SoftwareApplication"],
  visibleText: "Our 18-person team builds inventory software for independent retailers. Start a free trial and choose a monthly plan.",
}

const gate: LeadQualityGate = {
  status: "review_required",
  reasons: ["smb_evidence_missing"],
  identity: { passed: true, score: 90, sourceName: "Alpha", siteNames: ["Alpha Cloud"], canonicalName: "Alpha Cloud" },
  country: { passed: true, target: "GB", signals: [] },
  business: { passed: true, isForProfit: null, excludedType: null },
  smb: { passed: false, score: 0, evidence: [] },
  offerFit: { passed: true, score: 70, evidence: ["saas_signal:software+free trial"] },
  source: { passed: true, sourceId: "source-1", sourcePageUrl: "https://index.commoncrawl.org", trustTier: 2 },
}

function responseJson(patch: Record<string, unknown> = {}) {
  return JSON.stringify({
    smb_fit: true,
    enterprise: false,
    employee_band: "11-50",
    business_model: "saas",
    japan_entry_fit: true,
    confidence: 0.98,
    evidence_quotes: [
      "Our 18-person team builds inventory software for independent retailers.",
      "Start a free trial and choose a monthly plan.",
    ],
    risk_flags: [],
    reason: "Explicit team size and product-conversion evidence support the classification.",
    ...patch,
  })
}

describe("DeepSeek SMB adjudication", () => {
  it("passes only a high-confidence result with two exact website quotes", async () => {
    const caller: typeof callDeepSeek = async () => ({ ok: true, text: responseJson(), usedModel: "deepseek-v4-pro" })
    const result = await reviewUnknownSmbCandidate({ companyName: "Alpha Cloud", countryCode: "GB", homepage, qualityGate: gate, detections: [] }, caller)

    expect(result).toMatchObject({ passed: true, confidence: 0.98, employeeBand: "11-50", businessModel: "saas" })
    expect(applyAiSmbReview(gate, result)).toMatchObject({ status: "passed", smb: { passed: true, score: 90 } })
  })

  it("requires the same 96% grounded review for Tier 2 site-marker SMB evidence", async () => {
    const tierTwoGate: LeadQualityGate = {
      ...gate,
      status: "passed",
      reasons: [],
      smb: { passed: true, score: 82, evidence: ["site_marker:independently owned"] },
    }
    const caller: typeof callDeepSeek = async () => ({ ok: true, text: responseJson(), usedModel: "deepseek-v4-pro" })

    expect(requiresAiSmbAdjudication(tierTwoGate)).toBe(true)
    const result = await reviewUnknownSmbCandidate({ companyName: "Alpha Cloud", countryCode: "GB", homepage, qualityGate: tierTwoGate, detections: [] }, caller)

    expect(result).toMatchObject({ passed: true, confidence: 0.98 })
    expect(applyAiSmbReview(tierTwoGate, result).smb.evidence).toContain("deepseek_v4_pro:11-50:98")
  })

  it("does not override Tier 3 deterministic SMB evidence", () => {
    const tierThreeGate: LeadQualityGate = {
      ...gate,
      status: "passed",
      reasons: [],
      source: { ...gate.source, trustTier: 3 },
      smb: { passed: true, score: 82, evidence: ["official_sme_flag:Official SME directory"] },
    }

    expect(requiresAiSmbAdjudication(tierThreeGate)).toBe(false)
  })

  it("adjudicates product fit for an official Tier 3 SMB without requiring website size text", async () => {
    const productHomepage: HomepageQualityProfile = {
      ...homepage,
      title: "Nova Sensor Systems",
      description: "Autonomous optical sensors for industrial inspection.",
      visibleText: "Nova Sensor Systems designs autonomous optical sensors for industrial inspection. Our modular sensor platform ships to manufacturers worldwide.",
    }
    const officialOfferGate: LeadQualityGate = {
      ...gate,
      status: "review_required",
      reasons: ["japan_entry_offer_fit_missing"],
      source: { ...gate.source, trustTier: 3 },
      smb: { passed: true, score: 100, evidence: ["employee_count:36", "official_sme_flag:SBA SBIR"] },
      offerFit: { passed: false, score: 0, evidence: [] },
    }
    const caller: typeof callDeepSeek = async () => ({
      ok: true,
      usedModel: "deepseek-v4-pro",
      text: responseJson({
        smb_fit: false,
        employee_band: "unknown",
        business_model: "product_brand",
        confidence: 0.9,
        evidence_quotes: [
          "Nova Sensor Systems designs autonomous optical sensors for industrial inspection.",
          "Our modular sensor platform ships to manufacturers worldwide.",
        ],
      }),
    })

    expect(aiAdjudicationMode(officialOfferGate)).toBe("offer_fit")
    const result = await reviewUnknownSmbCandidate({ companyName: "Nova Sensor Systems", countryCode: "US", homepage: productHomepage, qualityGate: officialOfferGate, detections: [] }, caller)
    expect(result).toMatchObject({ passed: true, mode: "offer_fit", businessModel: "product_brand" })
    expect(applyAiSmbReview(officialOfferGate, result)).toMatchObject({
      status: "passed",
      smb: { passed: true, score: 100 },
      offerFit: { passed: true, score: 90 },
    })
  })

  it("keeps official product-fit adjudication fail-closed below 90%", async () => {
    const officialOfferGate: LeadQualityGate = {
      ...gate,
      status: "review_required",
      reasons: ["japan_entry_offer_fit_missing"],
      source: { ...gate.source, trustTier: 3 },
      smb: { passed: true, score: 100, evidence: ["employee_count:18", "official_sme_flag:SBA SBIR"] },
      offerFit: { passed: false, score: 0, evidence: [] },
    }
    const caller: typeof callDeepSeek = async () => ({
      ok: true,
      usedModel: "deepseek-v4-pro",
      text: responseJson({ confidence: 0.89, business_model: "product_brand" }),
    })

    const result = await reviewUnknownSmbCandidate({ companyName: "Alpha Cloud", countryCode: "US", homepage, qualityGate: officialOfferGate, detections: [] }, caller)
    expect(result).toMatchObject({ passed: false, mode: "offer_fit", confidence: 0.89 })
  })

  it("does not use offer-fit adjudication without official Tier 3 SMB evidence", () => {
    const ungroundedOfferGate: LeadQualityGate = {
      ...gate,
      status: "review_required",
      reasons: ["japan_entry_offer_fit_missing"],
      smb: { passed: true, score: 82, evidence: ["site_marker:small business"] },
      offerFit: { passed: false, score: 0, evidence: [] },
    }

    expect(aiAdjudicationMode(ungroundedOfferGate)).toBeNull()
  })

  it("fails closed when model quotes are not present in the supplied page", async () => {
    const caller: typeof callDeepSeek = async () => ({
      ok: true,
      text: responseJson({ evidence_quotes: ["We employ 22 people.", "We are headquartered in London."] }),
      usedModel: "deepseek-v4-pro",
    })
    const result = await reviewUnknownSmbCandidate({ companyName: "Alpha Cloud", countryCode: "GB", homepage, qualityGate: gate, detections: [] }, caller)

    expect(result.passed).toBe(false)
    expect(result.error).toContain("two evidence quotes")
  })

  it("accepts bounded surplus quotes but retains only exact website evidence", async () => {
    const caller: typeof callDeepSeek = async () => ({
      ok: true,
      text: responseJson({
        evidence_quotes: [
          "Our 18-person team builds inventory software for independent retailers.",
          "Start a free trial and choose a monthly plan.",
          "Not present one",
          "Not present two",
          "Not present three",
          "Not present four",
        ],
      }),
      usedModel: "deepseek-v4-pro",
    })
    const result = await reviewUnknownSmbCandidate({ companyName: "Alpha Cloud", countryCode: "GB", homepage, qualityGate: gate, detections: [] }, caller)

    expect(result.passed).toBe(true)
    expect(result.evidenceQuotes).toEqual([
      "Our 18-person team builds inventory software for independent retailers.",
      "Start a free trial and choose a monthly plan.",
    ])
  })

  it("does not review candidates with unresolved country or offer-fit reasons", async () => {
    const caller: typeof callDeepSeek = async () => ({ ok: true, text: responseJson(), usedModel: "deepseek-v4-pro" })
    const result = await reviewUnknownSmbCandidate({
      companyName: "Alpha Cloud",
      countryCode: "GB",
      homepage,
      qualityGate: { ...gate, reasons: ["smb_evidence_missing", "country_site_signal_missing"] },
      detections: [],
    }, caller)

    expect(result.passed).toBe(false)
    expect(result.error).toContain("not eligible")
  })
})
