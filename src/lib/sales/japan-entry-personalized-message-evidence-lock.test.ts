import { describe, expect, it, vi } from "vitest"
import type { DeepSeekResponse } from "@/lib/deepseek"
import { generatePersonalizedJapanEntryMessage } from "./japan-entry-personalized-message"
import { buildManualCtaContracts } from "./manual-japan-entry-cta-contract"

function response(value: unknown): DeepSeekResponse {
  return { ok: true, text: JSON.stringify(value) }
}

describe("initial-interest product-evidence lock", () => {
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

Canny describes an AI-powered customer feedback platform alongside a customer feedback prioritization workflow. Together, those documented capabilities define a specific Japan-entry question around how the existing feedback-to-roadmap path should be presented and tested in another language, without treating the workflow itself as changed.

The checked public pages did not show a Japanese-language customer path. That observation does not establish demand or customer behavior in Japan; it leaves open whether a Japanese evaluation path is worth validating for this product before the team commits to broader localization.

The analysis would separate the current product proposition from the unanswered market-entry questions, then identify the smallest evidence needed to decide whether a Japanese-language test deserves priority. Its scope would stay tied to the documented feedback workflow rather than a generic Japan launch plan.

${approvedCta!.paragraph}

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`
    const caller = vi.fn()
      .mockResolvedValueOnce(response({
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
      }))
      .mockResolvedValueOnce(response({
        candidate: {
          message: repairedMessage,
          fact_ids: ["japan-audit-language"],
          product_evidence: "AI-powered customer feedback platform",
          product_evidence_rendering: "AI-powered customer feedback platform",
          angle: "problem",
          opening_style: "product_workflow",
          diagnostic_focus: "language_path_validation",
          cta_type: approvedCta!.ctaType,
        },
      }))
      .mockResolvedValueOnce(response({
        selected_index: 0,
        product_evidence_faithful: true,
        scores: { specificity: 23, naturalness: 23, credibility: 23, executive_relevance: 23 },
        rationale: "Grounded and decision-relevant.",
        risk_flags: [],
      }))

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
    expect(caller).toHaveBeenCalledTimes(3)
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

Canny describes an AI-powered customer feedback platform alongside a customer feedback prioritization workflow. Together, those documented capabilities define a specific Japan-entry question around how the existing feedback-to-roadmap path should be presented and tested in another language, without treating the workflow itself as changed.

The checked public pages did not show a Japanese-language customer path. That observation does not establish demand or customer behavior in Japan; it leaves open whether a Japanese evaluation path is worth validating for this product before the team commits to broader localization.

The analysis would separate the current product proposition from the unanswered market-entry questions, then identify the smallest evidence required to decide whether a Japanese-language test deserves priority. Its scope would stay tied to the documented feedback workflow rather than a generic Japan launch plan.

${approvedCta!.paragraph}

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`
    const caller = vi.fn()
      .mockResolvedValueOnce(response({
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
      }))
      .mockResolvedValueOnce(response({
        candidate: {
          message: repairedMessage,
          fact_ids: ["japan-audit-language"],
          product_evidence: "AI-powered customer feedback platform",
          product_evidence_rendering: "AI-powered customer feedback platform",
          angle: "problem",
          opening_style: "product_workflow",
          diagnostic_focus: "language_path_validation",
          cta_type: approvedCta!.ctaType,
        },
      }))
      .mockResolvedValueOnce(response({
        selected_index: 0,
        product_evidence_faithful: true,
        scores: { specificity: 23, naturalness: 23, credibility: 23, executive_relevance: 23 },
        rationale: "Grounded and decision-relevant.",
        risk_flags: [],
      }))

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
    expect(caller).toHaveBeenCalledTimes(3)
    const repairPayload = JSON.parse(caller.mock.calls[1]?.[0]?.[1]?.content ?? "{}") as { task?: string }
    expect(repairPayload.task).toBe("repair_candidate")
  })
})
