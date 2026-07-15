import { describe, expect, it } from "vitest"
import { callDeepSeek } from "@/lib/deepseek"
import { applyAiSmbReview, reviewUnknownSmbCandidate } from "./lead-candidate-ai-smb-review"
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
