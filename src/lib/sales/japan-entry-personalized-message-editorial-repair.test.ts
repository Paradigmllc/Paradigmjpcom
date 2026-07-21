import { describe, expect, it, vi } from "vitest"
import type { DeepSeekResponse } from "@/lib/deepseek"
import { generatePersonalizedJapanEntryMessage } from "./japan-entry-personalized-message"
import { buildJapanEntryProjection } from "./japan-entry-projection"

const productEvidence = "subscription analytics for independent retailers with inventory forecasting and replenishment insights."
const projection = buildJapanEntryProjection({
  companyName: "AtlasMetric",
  domain: "atlasmetric.example",
  targetCountry: "US",
  observedAt: "2026-07-20T00:00:00.000Z",
  visibility: { version: "public-signals-v1", index: 63, band: "top-100k", bestRank: 52_000, countrySignals: [], evidence: [{ id: "rank", label: "Rank", value: "#52,000", source: "Tranco", sourceUrl: "https://tranco-list.eu/", observedAt: "2026-07-20", confidence: 0.7, limitation: "Public proxy." }], unknowns: [], actualMonthlyVisits: null, actualRevenue: null },
})
const safeMessage = `Hello AtlasMetric team,

AtlasMetric provides subscription analytics for independent retailers with inventory forecasting and replenishment insights.

The checked public pages did not show a Japanese-language customer path. That is a page-level observation, not proof of demand or performance in Japan.

A focused test could compare the current inventory-analytics proposition with a Japanese-language evaluation route while keeping observed facts separate from assumptions. The decision is whether this customer path warrants validation before any broader localization commitment.

I can send a short Japan opportunity analysis for AtlasMetric focused on the Japanese-language customer-path question. Could you forward it to the person responsible for international growth?

Best regards,
Tomohiro H
Paradigm LLC
contact@paradigmjp.com`

const shortMessage = safeMessage.replace(
  "That is a page-level observation, not proof of demand or performance in Japan.",
  "This is a bounded public-page observation.",
)

const unsafeRepair = safeMessage.replace(
  "A focused test could compare the current inventory-analytics proposition with a Japanese-language evaluation route while keeping observed facts separate from assumptions. The decision is whether this customer path warrants validation before any broader localization commitment.",
  "Japanese independent retailers typically need localized access before they evaluate a product.",
)

function response(value: unknown): DeepSeekResponse {
  return { ok: true, text: JSON.stringify(value) }
}

function candidate(message: string) {
  return {
    message,
    fact_ids: ["japan-audit-language"],
    product_evidence: productEvidence,
    product_evidence_rendering: productEvidence,
    angle: "problem",
    opening_style: "public_observation",
    diagnostic_focus: "verified_language_path",
    cta_type: "founder_forward",
  }
}

function critic(specificity: number, productEvidenceFaithful = true) {
  return response({
    selected_index: 0,
    product_evidence_faithful: productEvidenceFaithful,
    scores: { specificity, naturalness: 23, credibility: 24, executive_relevance: 23 },
    rationale: specificity >= 23 ? "Grounded and decision-relevant." : "The first draft needs a more company-specific decision frame.",
    risk_flags: [],
  })
}

describe("Japan Entry editorial repair loop", () => {
  it("repairs a short draft deterministically before the editorial call", async () => {
    const caller = vi.fn()
      .mockResolvedValueOnce(response({
        strategy: {
          primary_observation: "AtlasMetric product workflow",
          why_now: "Japan path unverified",
          japanese_segment: "Unverified",
          japan_gap: "No Japanese-language path",
          opportunity_angle: "Decision quality",
          offer_relevance: "Opportunity analysis",
          tone: "Direct",
          cta: "Route the analysis",
          country_adaptation: "Direct",
          prohibited_claims: ["Demand"],
        },
        candidates: [candidate(shortMessage)],
      }))
      .mockResolvedValueOnce(critic(23))

    const result = await generatePersonalizedJapanEntryMessage({
      companyName: "AtlasMetric",
      industry: "B2B SaaS",
      productContext: `AtlasMetric provides ${productEvidence}`,
      targetCountry: "US",
      businessModel: "saas",
      projection,
      audit: { status: { japanese_language_missing: true }, signals: { japanese_language: [] }, pages_checked: ["https://atlasmetric.example/"] },
      purpose: "initial_interest",
      initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: true },
      messageAngle: "problem",
    }, caller)

    expect(result.ok).toBe(true)
    expect(result.review?.wordCount).toBeGreaterThanOrEqual(120)
    expect(result.review?.wordCount).toBeLessThanOrEqual(190)
    expect(caller).toHaveBeenCalledTimes(2)
    const editorialPayload = JSON.parse(caller.mock.calls[1]?.[0]?.[1]?.content ?? "{}") as {
      deterministic_contracts_passed?: boolean
      candidates?: unknown[]
    }
    expect(editorialPayload.deterministic_contracts_passed).toBe(true)
    expect(editorialPayload.candidates).toHaveLength(1)
  })

  it("uses the second editorial repair when the first rewrite violates a deterministic safety rule", async () => {
    const caller = vi.fn()
      .mockResolvedValueOnce(response({
        strategy: {
          primary_observation: "AtlasMetric product workflow",
          why_now: "Japan path unverified",
          japanese_segment: "Unverified",
          japan_gap: "No Japanese-language path",
          opportunity_angle: "Decision quality",
          offer_relevance: "Opportunity analysis",
          tone: "Direct",
          cta: "Route the analysis",
          country_adaptation: "Direct",
          prohibited_claims: ["Demand"],
        },
        candidates: [candidate(safeMessage)],
      }))
      .mockResolvedValueOnce(critic(22))
      .mockResolvedValueOnce(response({ candidate: candidate(unsafeRepair) }))
      .mockResolvedValueOnce(response({ candidate: candidate(safeMessage) }))
      .mockResolvedValueOnce(critic(23))

    const result = await generatePersonalizedJapanEntryMessage({
      companyName: "AtlasMetric",
      industry: "B2B SaaS",
      productContext: `AtlasMetric provides ${productEvidence}`,
      targetCountry: "US",
      businessModel: "saas",
      projection,
      audit: {
        status: { japanese_language_missing: true },
        signals: { japanese_language: [] },
        pages_checked: ["https://atlasmetric.example/"],
      },
      purpose: "initial_interest",
      initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: true },
      messageAngle: "problem",
    }, caller)

    expect(result.ok).toBe(true)
    expect(result.review?.passed).toBe(true)
    expect(result.review?.attempts).toBe(5)
    expect(caller).toHaveBeenCalledTimes(5)
  })

  it("fails closed when the critic cannot verify product-evidence translation fidelity", async () => {
    const generation = response({
      strategy: {
        primary_observation: "AtlasMetric product workflow",
        why_now: "Japan path unverified",
        japanese_segment: "Unverified",
        japan_gap: "No Japanese-language path",
        opportunity_angle: "Decision quality",
        offer_relevance: "Opportunity analysis",
        tone: "Direct",
        cta: "Route the analysis",
        country_adaptation: "Direct",
        prohibited_claims: ["Demand"],
      },
      candidates: [candidate(safeMessage)],
    })
    const caller = vi.fn()
      .mockResolvedValueOnce(generation)
      .mockResolvedValueOnce(critic(23, false))
      .mockResolvedValueOnce(response({ candidate: candidate(safeMessage) }))
      .mockResolvedValueOnce(critic(23, false))
      .mockResolvedValueOnce(response({ candidate: candidate(safeMessage) }))
      .mockResolvedValueOnce(critic(23, false))
      .mockResolvedValueOnce(response({ candidate: candidate(safeMessage) }))
      .mockResolvedValueOnce(critic(23, false))

    const result = await generatePersonalizedJapanEntryMessage({
      companyName: "AtlasMetric",
      industry: "B2B SaaS",
      productContext: `AtlasMetric provides ${productEvidence}`,
      targetCountry: "US",
      businessModel: "saas",
      projection,
      audit: { status: { japanese_language_missing: true }, signals: { japanese_language: [] }, pages_checked: ["https://atlasmetric.example/"] },
      purpose: "initial_interest",
      initialInterestOptions: { includeEstimate: false, includePrice: false, founderForwardCta: true },
      messageAngle: "problem",
    }, caller)

    expect(result.ok).toBe(false)
    expect(result.review?.issues).toContain("DeepSeek V4 Pro did not verify the English product-evidence rendering as faithful to the public source phrase")
    expect(caller).toHaveBeenCalledTimes(8)
  })
})
