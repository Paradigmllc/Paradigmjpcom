import { describe, expect, it } from "vitest"
import { generatePersonalizedJapanEntryMessage } from "./japan-entry-personalized-message"
import { buildManualInitialMessageInput } from "./manual-japan-entry-service"

const audit = {
  engine: "local_heuristic" as const,
  generated_at: "2026-07-15T00:00:00.000Z",
  score: 40,
  status: { tokushoho_missing: true, appi_missing: true, local_payments_missing: true, japanese_language_missing: true, jpy_currency_missing: true, japan_shipping_missing: true },
  signals: { tokushoho: [], appi: [], local_payments: [], japanese_language: [], jpy_currency: [], japan_shipping: [] },
  pages_checked: ["https://example.com/", "https://example.com/pricing"],
  sales_pitch_context: "Public-page observations",
  human_review_required: true,
  legal_disclaimer: "Not legal advice",
}

const message = `Hello, I’m Sato from Paradigm LLC in Japan. We help overseas companies enter the Japanese market.

I reviewed Example and its subscription analytics platform for independent retailers, including the inventory forecasting and replenishment insights described on the homepage.

In a review of the public pages, I did not find a Japanese-language customer path or customer-facing JPY pricing. This is not a finding about demand or performance; it means the customer path available for a Japan entry decision remains unverified from the pages checked.

I can share a one-page Japan Opportunity Snapshot based on this public evidence. Could you forward this to the founder or person responsible for international growth?`

describe("manual work first-touch generation integration", () => {
  it("generates the approved permission-based first touch without commercial terms", async () => {
    const generationInput = buildManualInitialMessageInput({
      profile: {
        companyName: "Example",
        countryCode: "US",
        isJapaneseCompany: false,
        smbStatus: "qualified",
        smbConfidence: 90,
        smbEvidence: ["Public evidence"],
        japanEntryFitStatus: "qualified",
        japanEntryFitConfidence: 88,
        japanEntryFitEvidence: ["Public evidence"],
        businessModel: "saas",
        industry: "Technology / IT",
        productContext: "Model summary must not be used",
        observedFacts: ["Public evidence"],
        outreachPlaybook: "saas_ai_devtools",
        positioningConcept: null,
      },
      evidence: {
        companyName: "Example",
        productContext: "Example provides a subscription analytics platform for independent retailers with inventory insights.",
        businessModel: "saas",
        sourceUrl: "https://example.com/",
        title: "Example",
        description: "Subscription analytics platform for independent retailers",
        headings: ["Inventory insights"],
        audit,
      },
    })
    let callIndex = 0
    const caller = async () => {
      callIndex += 1
      if (callIndex === 1) {
        return {
          ok: true,
          text: JSON.stringify({
            strategy: {
              primary_observation: "Example describes subscription analytics for independent retailers.",
              why_now: "Japan applicability remains unverified from the checked pages.",
              japanese_segment: "Independent retail operators evaluating inventory analytics.",
              japan_gap: "The checked pages did not show a Japanese-language customer path.",
              opportunity_angle: "Validate the buyer evaluation path before market entry.",
              offer_relevance: "A public-evidence analysis can test the entry hypothesis.",
              tone: "Direct and low pressure.",
              cta: "Ask permission to send the analysis.",
              country_adaptation: "Business-formal without nationality assumptions.",
              prohibited_claims: "Measured demand; Guaranteed revenue",
            },
            candidates: ["direct", "decision", "customer-path"].map(() => ({
              message,
              fact_ids: ["japan-audit-language", "japan-audit-jpy"],
              product_evidence: "subscription analytics platform for independent retailers",
              angle: "problem",
              opening_style: "public-observation-led",
              diagnostic_focus: "Japanese-language evaluation path",
              cta_type: "founder_forward",
            })),
          }),
        }
      }
      return {
        ok: true,
        text: JSON.stringify({
          selected_index: 0,
          scores: { specificity: 24, naturalness: 24, credibility: 24, executive_relevance: 24 },
          rationale: "Grounded, concise, and permission-based.",
          risk_flags: [],
        }),
      }
    }

    const result = await generatePersonalizedJapanEntryMessage(generationInput, caller)

    expect(result).toMatchObject({ ok: true, review: { passed: true, score: 96 } })
    expect(result.message).toBe(message)
    expect(result.strategy?.prohibitedClaims).toEqual(["Measured demand", "Guaranteed revenue"])
    expect(result.message).not.toMatch(/\$12,?000|paid upfront|Japan Entry Package|15-minute|https?:\/\//i)
    expect(result.message).toContain("Could you forward this to the founder")
    expect(generationInput).toMatchObject({ purpose: "initial_interest" })
    expect(callIndex).toBe(2)
  })
})
