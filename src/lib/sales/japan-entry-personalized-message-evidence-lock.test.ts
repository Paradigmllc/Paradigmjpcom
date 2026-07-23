import { describe, expect, it, vi } from "vitest"
import type { DeepSeekMessage, DeepSeekOptions, DeepSeekResponse } from "@/lib/deepseek"
import { generatePersonalizedJapanEntryMessage } from "./japan-entry-personalized-message"
import { buildManualCtaContracts } from "./manual-japan-entry-cta-contract"

function response(value: unknown): DeepSeekResponse {
  return { ok: true, text: JSON.stringify(value) }
}

function evidenceLockCaller(input: {
  generated: unknown
  repairedMessage: string
  repairedCandidate: Record<string, unknown>
}) {
  return vi.fn(async (messages: DeepSeekMessage[], _options?: DeepSeekOptions) => {
    const system = messages[0]?.content ?? ""
    const user = messages[1]?.content ?? ""
    if (system.includes("ruthless editor")) return response({
      selected_index: 0,
      product_evidence_faithful: true,
      scores: { specificity: 23, naturalness: 23, credibility: 23, executive_relevance: 23 },
      rationale: "Grounded and decision-relevant.",
      risk_flags: [],
    })
    if (system.includes("Write one fresh, natural English inquiry-form message") || system.includes("Rewrite one inquiry-form message")) {
      return response({ message: input.repairedMessage })
    }
    if (user.includes('"task":"repair_candidate"')) {
      return response({ candidate: { ...input.repairedCandidate, message: input.repairedMessage } })
    }
    return response(input.generated)
  })
}

describe("initial-interest product-evidence lock", () => {
  it("replaces a safe-but-inferior model phrase with the deterministic public-evidence selection", async () => {
    const [approvedCta] = buildManualCtaContracts({
      companyName: "Airvida",
      requiredAnchor: "Airvida",
      customerPathAnchor: "Japanese-language",
      priorMessages: [],
      count: 1,
    })
    const message = `Hello Airvida team,

Airvida offers a Wearable Air Purifier.

The checked public pages did not show a Japanese-language customer path.

Should the first Japanese-language test introduce the wearable purifier through its core product category or through the publicly named scientific testing results? The checked pages do not indicate which of those two facts should come first, and neither is treated as evidence of demand or performance.

I can prepare a Japan opportunity analysis comparing those two opening approaches and the public information available for each, centred on the wearable purifier. Would you like me to send the Airvida analysis?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`
    const generated = {
        strategy: {
          primary_observation: "Wearable air purifier",
          why_now: "Japan path unverified",
          japanese_segment: "Unverified",
          japan_gap: "No Japanese-language path",
          opportunity_angle: "Decision quality",
          offer_relevance: "Opportunity analysis",
          tone: "Direct",
          cta: "Receive the analysis",
          country_adaptation: "Direct",
          prohibited_claims: ["Demand", "Performance"],
        },
        candidates: [{
          message,
          fact_ids: ["japan-audit-language"],
          product_evidence: "ible Airvida - Wearable Air Purifier",
          product_evidence_rendering: "Wearable Air Purifier",
          angle: "problem",
          opening_style: "product_category",
          diagnostic_focus: "language_path_validation",
          cta_type: approvedCta!.ctaType,
        }],
      }
    const caller = evidenceLockCaller({
      generated,
      repairedMessage: message,
      repairedCandidate: {
        fact_ids: ["japan-audit-language"],
        product_evidence: "Wearable Air Purifier",
        product_evidence_rendering: "Wearable Air Purifier",
        angle: "problem",
        opening_style: "product_category",
        diagnostic_focus: "language_path_validation",
        cta_type: approvedCta!.ctaType,
      },
    })

    const result = await generatePersonalizedJapanEntryMessage({
      companyName: "Airvida",
      industry: "Consumer Products",
      productContext: "ible Airvida - Wearable Air Purifier | Airvida – Wearable Air Purifier | Scientific Testing Results of Airvida",
      targetCountry: "US",
      businessModel: "ecommerce",
      audit: {
        status: { japanese_language_missing: true },
        signals: { japanese_language: [] },
        pages_checked: ["https://airvida.co/en/home/"],
      },
      purpose: "initial_interest",
      initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: false },
      messageAngle: "problem",
    }, caller)

    expect(result.ok, JSON.stringify(result)).toBe(true)
    expect(result.review?.passed).toBe(true)
    expect(result.candidates?.[0]).toMatchObject({
      productEvidence: "Wearable Air Purifier",
      productEvidenceRendering: "Wearable Air Purifier",
    })
    expect(result.message).not.toMatch(/\bible Airvida\b/i)
    expect(caller.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it("locks unsafe evidence and requires a bespoke model rewrite before editorial review", async () => {
    const unsafeMessage = `Hello Canny team,

Canny says its platform can turn customer conversations into revenue.

The checked public pages did not show a Japanese-language customer path.

Can I send more information?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`
    const [approvedCta] = buildManualCtaContracts({
      companyName: "Canny",
      requiredAnchor: "Canny",
      customerPathAnchor: "Japanese-language",
      priorMessages: [],
      count: 1,
    })
    const repairedMessage = `Hello Canny team,

Canny provides an AI-powered customer feedback platform.

The checked public pages did not show a Japanese-language customer path.

Should a first Japanese-language test lead with the customer feedback platform or with the customer feedback prioritization workflow? The checked pages cannot determine which product emphasis should come first, and the choice does not establish demand, adoption, or commercial performance.

I can prepare a Japan opportunity analysis comparing the platform proposition with the prioritization workflow, centred on customer feedback. Would you like me to send the Canny analysis?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`
    const generated = {
        strategy: {
          primary_observation: "Customer feedback workflow",
          why_now: "Japan path unverified",
          japanese_segment: "Unverified",
          japan_gap: "No Japanese-language path",
          opportunity_angle: "Decision quality",
          offer_relevance: "Opportunity analysis",
          tone: "Direct",
          cta: "Receive the analysis",
          country_adaptation: "Direct",
          prohibited_claims: ["Revenue"],
        },
        candidates: [{
          message: unsafeMessage,
          fact_ids: ["japan-audit-language"],
          product_evidence: "turn customer conversations into revenue",
          product_evidence_rendering: "turn customer conversations into revenue",
          angle: "problem",
          opening_style: "public_capability",
          diagnostic_focus: "language_path",
          cta_type: "permission_to_send",
        }],
      }
    const caller = evidenceLockCaller({
      generated,
      repairedMessage,
      repairedCandidate: {
        fact_ids: ["japan-audit-language"],
        product_evidence: "AI-powered customer feedback platform",
        product_evidence_rendering: "AI-powered customer feedback platform",
        angle: "problem",
        opening_style: "product_workflow",
        diagnostic_focus: "language_path_validation",
        cta_type: approvedCta!.ctaType,
      },
    })

    const result = await generatePersonalizedJapanEntryMessage({
      companyName: "Canny",
      industry: "Technology / IT",
      productContext: "Canny's platform can turn customer conversations into revenue. | AI-powered customer feedback platform | Customer feedback prioritization workflow",
      productNames: ["Canny"],
      targetCountry: "US",
      businessModel: "saas",
      audit: {
        status: { japanese_language_missing: true },
        signals: { japanese_language: [] },
        pages_checked: ["https://canny.io/"],
      },
      purpose: "initial_interest",
      initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: false },
      messageAngle: "problem",
    }, caller)

    expect(result.ok, JSON.stringify(result)).toBe(true)
    expect(result.review?.passed).toBe(true)
    expect(result.message).toContain("AI-powered customer feedback platform")
    expect(result.message).not.toMatch(/\brevenue\b/i)
    expect(result.message).not.toContain("The concrete capability documented")
    expect(caller.mock.calls.length).toBeGreaterThanOrEqual(3)
    expect(caller.mock.calls[1]?.[1]?.temperature).toBeCloseTo(0.43)
    const repairPayload = JSON.parse(caller.mock.calls[1]?.[0]?.[1]?.content ?? "{}") as { task?: string }
    expect(repairPayload.task).toBe("repair_candidate")
  })

  it("normalizes oversized model evidence and completes instead of failing the structured schema", async () => {
    const oversized = "unverified capability wording ".repeat(24)
    const [approvedCta] = buildManualCtaContracts({
      companyName: "Canny",
      requiredAnchor: "Canny",
      customerPathAnchor: "Japanese-language",
      priorMessages: [],
      count: 1,
    })
    const repairedMessage = `Hello Canny team,

Canny provides an AI-powered customer feedback platform.

The checked public pages did not show a Japanese-language customer path.

Should a first Japanese-language test lead with the customer feedback platform or with the customer feedback prioritization workflow? The checked pages cannot determine which product emphasis should come first, and the choice does not establish demand, adoption, or commercial performance.

I can prepare a Japan opportunity analysis comparing the platform proposition with the prioritization workflow, centred on customer feedback. Would you like me to send the Canny analysis?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`
    const generated = {
        strategy: {
          primary_observation: "Customer feedback workflow",
          why_now: "Japan path unverified",
          japanese_segment: "Unverified",
          japan_gap: "No Japanese-language path",
          opportunity_angle: "Decision quality",
          offer_relevance: "Opportunity analysis",
          tone: "Direct",
          cta: "Receive the analysis",
          country_adaptation: "Direct",
          prohibited_claims: ["Revenue"],
        },
        candidates: [{
          message: `Hello Canny team,

Canny publicly documents an AI-powered customer feedback platform.

The checked public pages did not show a Japanese-language customer path.

Would you like to receive the Canny Japan opportunity analysis?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`,
          fact_ids: ["japan-audit-language"],
          product_evidence: oversized,
          product_evidence_rendering: oversized,
          angle: "problem",
          opening_style: "public_capability",
          diagnostic_focus: "language_path",
          cta_type: "permission_to_send",
        }],
      }
    const caller = evidenceLockCaller({
      generated,
      repairedMessage,
      repairedCandidate: {
        fact_ids: ["japan-audit-language"],
        product_evidence: "AI-powered customer feedback platform",
        product_evidence_rendering: "AI-powered customer feedback platform",
        angle: "problem",
        opening_style: "product_workflow",
        diagnostic_focus: "language_path_validation",
        cta_type: approvedCta!.ctaType,
      },
    })

    const result = await generatePersonalizedJapanEntryMessage({
      companyName: "Canny",
      industry: "Technology / IT",
      productContext: "Canny | AI-powered customer feedback platform | Customer feedback prioritization workflow",
      productNames: ["Canny"],
      targetCountry: "US",
      businessModel: "saas",
      audit: {
        status: { japanese_language_missing: true },
        signals: { japanese_language: [] },
        pages_checked: ["https://canny.io/"],
      },
      purpose: "initial_interest",
      initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: false },
      messageAngle: "problem",
    }, caller)

    expect(result.ok, JSON.stringify(result)).toBe(true)
    expect(result.review?.passed).toBe(true)
    expect(result.message).toContain("AI-powered customer feedback platform")
    expect(result.error).toBeUndefined()
    expect(caller.mock.calls.length).toBeGreaterThanOrEqual(3)
    const repairPayload = JSON.parse(caller.mock.calls[1]?.[0]?.[1]?.content ?? "{}") as { task?: string }
    expect(repairPayload.task).toBe("repair_candidate")
  })
})
