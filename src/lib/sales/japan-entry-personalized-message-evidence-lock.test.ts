import { describe, expect, it, vi } from "vitest"
import type { DeepSeekResponse } from "@/lib/deepseek"
import { generatePersonalizedJapanEntryMessage } from "./japan-entry-personalized-message"

function response(value: unknown): DeepSeekResponse {
  return { ok: true, text: JSON.stringify(value) }
}

describe("initial-interest product-evidence lock", () => {
  it("replaces unsafe marketing evidence with the selected grounded capability before editorial review", async () => {
    const unsafeMessage = `Hello Canny team,

Canny says its platform can turn customer conversations into revenue.

The checked public pages did not show a Japanese-language customer path.

Can I send more information?

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

    expect(result.ok).toBe(true)
    expect(result.review?.passed).toBe(true)
    expect(result.message).toContain("AI-powered customer feedback platform")
    expect(result.message).not.toMatch(/\brevenue\b/i)
    expect(caller).toHaveBeenCalledTimes(2)
  })

  it("normalizes oversized model evidence and completes instead of failing the structured schema", async () => {
    const oversized = "unverified capability wording ".repeat(24)
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

    expect(result.ok).toBe(true)
    expect(result.review?.passed).toBe(true)
    expect(result.message).toContain("AI-powered customer feedback platform")
    expect(result.error).toBeUndefined()
    expect(caller).toHaveBeenCalledTimes(2)
  })
})
