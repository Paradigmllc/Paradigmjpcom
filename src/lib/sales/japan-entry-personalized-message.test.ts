import { describe, expect, it, vi } from "vitest"
import type { DeepSeekResponse } from "@/lib/deepseek"
import { buildJapanEntryProjection } from "./japan-entry-projection"
import {
  buildJapanEntryPersonalizationFacts,
  generatePersonalizedJapanEntryMessage,
  reviewPersonalizedJapanEntryMessage,
} from "./japan-entry-personalized-message"
import type { MarketVisibilityIndex } from "./market-visibility"

const visibility: MarketVisibilityIndex = {
  version: "public-signals-v1",
  index: 63,
  band: "top-100k",
  bestRank: 52_000,
  countrySignals: [{ countryCode: "US", signal: "ccTLD", value: ".us", confidence: 0.72 }],
  evidence: [
    {
      id: "tranco-rank",
      label: "Tranco domain rank",
      value: "#52,000",
      source: "Tranco",
      sourceUrl: "https://tranco-list.eu/query?domain=example.com",
      observedAt: "2026-07-13T00:00:00.000Z",
      confidence: 0.7,
      limitation: "Public proxy only; not first-party visits or revenue.",
    },
  ],
  unknowns: [],
  actualMonthlyVisits: null,
  actualRevenue: null,
}

const projection = buildJapanEntryProjection({
  companyName: "Example",
  domain: "example.com",
  targetCountry: "US",
  visibility,
  observedAt: "2026-07-13T00:00:00.000Z",
})

const audit = {
  status: {
    tokushoho_missing: true,
    appi_missing: true,
    local_payments_missing: true,
    japanese_language_missing: true,
    jpy_currency_missing: true,
    japan_shipping_missing: true,
  },
  signals: {
    tokushoho: [],
    appi: [],
    local_payments: [],
    japanese_language: [],
    jpy_currency: [],
    japan_shipping: [],
  },
  pages_checked: ["https://example.com/", "https://example.com/payment", "https://example.com/terms"],
}

const messages = [
  `Hello, I’m Sato from Paradigm LLC in Japan. We help overseas companies enter the Japanese market.

I reviewed Example’s subscription analytics platform for independent retailers, including its inventory forecasting and replenishment insights.

Our public-signal planning model estimates roughly 1,950 monthly visits from Japan and a potential monthly revenue opportunity gap of about $10,296 under stated assumptions. These are modeled estimates, not measured analytics. The checked public pages also did not show a Japanese-language customer path, leaving the route from existing Japanese interest to purchase unverified.

Paradigm addresses these items through our Japan Entry Package, which validates the opportunity and addresses the named customer-path gap. The package is $13,000 paid upfront, with the first six months of managed support included at no additional monthly charge. Would a detailed Japan opportunity analysis be useful?`,
  `Hello, I’m Sato from Paradigm LLC in Japan. We help overseas companies enter the Japanese market.

I reviewed Example’s subscription analytics platform for independent retailers and its inventory forecasting and replenishment workflow.

The public-signal planning model estimates approximately 1,950 monthly visits from Japan and a potential monthly revenue opportunity gap of approximately $10,296 under stated planning assumptions. These are modeled estimates, not measured analytics. The checked public pages did not show customer-facing JPY pricing, so the commercial path available to that Japanese interest remains unverified.

Paradigm addresses these items through our Japan Entry Package, which validates the opportunity and addresses the named customer-path gap. The package is $13,000 paid upfront, with the first six months of managed support included at no additional monthly charge. Would a detailed Japan opportunity analysis be useful?`,
  `Hello, I’m Sato from Paradigm LLC in Japan. We help overseas companies enter the Japanese market.

I reviewed Example’s subscription analytics platform for independent retailers, particularly the inventory forecasting and replenishment insights described publicly.

Our public-signal planning model estimates about 1,950 monthly visits from Japan and a potential monthly revenue opportunity gap of about $10,296 under its stated planning assumptions. These are modeled estimates, not measured analytics. The checked public pages also did not show Japan-specific delivery terms, leaving the ecommerce fulfillment path for that interest unverified.

Paradigm addresses these items through our Japan Entry Package, which validates the opportunity and addresses the named customer-path gap. The package is $13,000 paid upfront, and the first six months of managed support are included at no additional monthly charge. Would a detailed Japan opportunity analysis be useful?`,
]

const productContext = "Example provides a subscription analytics platform for independent retailers with inventory insights."
const productEvidence = "subscription analytics platform for independent retailers"

function response(text: string): DeepSeekResponse {
  return {
    ok: true,
    text,
    usedModel: "deepseek-v4-pro",
    usage: { prompt_tokens: 100, completion_tokens: 20, cache_hit_tokens: 80, cache_miss_tokens: 20 },
  }
}

function generationResponse(): DeepSeekResponse {
  return response(
    JSON.stringify({
      candidates: messages.map((message, index) => ({
        message,
        fact_ids: [
          index === 0 ? "japan-audit-language" : index === 1 ? "japan-audit-jpy" : "japan-audit-shipping",
          "modeled-japan-monthly-visits",
          "modeled-monthly-opportunity-gap",
        ],
        product_evidence: productEvidence,
        product_evidence_rendering: productEvidence,
        angle: `angle-${index + 1}`,
      })),
    }),
  )
}

function repairResponse(message: string): DeepSeekResponse {
  return response(JSON.stringify({
    candidate: {
      message,
      fact_ids: ["japan-audit-jpy", "modeled-japan-monthly-visits", "modeled-monthly-opportunity-gap"],
      product_evidence: productEvidence,
      product_evidence_rendering: productEvidence,
      angle: "targeted-repair",
    },
  }))
}

function criticResponse(overrides: Record<string, unknown> = {}): DeepSeekResponse {
  return response(
    JSON.stringify({
      selected_index: 1,
      product_evidence_faithful: true,
      scores: {
        specificity: 23,
        naturalness: 23,
        credibility: 24,
        executive_relevance: 23,
      },
      rationale: "Specific public-page observation, restrained inference, and a direct decision question.",
      risk_flags: [],
      ...overrides,
    }),
  )
}

function generateInput() {
  return {
    companyName: "Example",
    industry: "E-Commerce / Retail",
    productContext,
    targetCountry: "US",
    businessModel: "ecommerce" as const,
    projection,
    audit,
  }
}

describe("DeepSeek V4 Pro Japan Entry form copy", () => {
  it("builds only business-relevant Japan-specific public facts", () => {
    expect(buildJapanEntryPersonalizationFacts(audit, "ecommerce").map((fact) => fact.id)).toEqual([
      "japan-audit-language",
      "japan-audit-jpy",
      "japan-audit-shipping",
      "japan-audit-payments",
      "japan-audit-commerce-disclosure",
    ])
    expect(buildJapanEntryPersonalizationFacts(audit, "service").map((fact) => fact.id)).toEqual(["japan-audit-language"])
    expect(buildJapanEntryPersonalizationFacts(audit, "saas").map((fact) => fact.id)).toEqual(["japan-audit-language", "japan-audit-jpy"])
  })

  it("accepts restrained copy grounded in audited Japan gaps", () => {
    const facts = buildJapanEntryPersonalizationFacts(audit, "ecommerce", projection)
    const review = reviewPersonalizedJapanEntryMessage({
      message: messages[0],
      companyName: "Example",
      productContext,
      productEvidence,
      factIds: ["japan-audit-language", "modeled-japan-monthly-visits", "modeled-monthly-opportunity-gap"],
      facts,
    })
    expect(review.passed).toBe(true)
    expect(review.score).toBe(100)
  })

  it("rejects unresolved placeholders even when surrounding evidence phrases are valid", () => {
    const facts = buildJapanEntryPersonalizationFacts(audit, "ecommerce", projection)
    const message = messages[0]
      .replace("1,950", "[monthly visits]")
      .replace("$10,296", "[opportunity gap]")
    const review = reviewPersonalizedJapanEntryMessage({
      message,
      companyName: "Example",
      productContext,
      productEvidence,
      factIds: ["japan-audit-language", "modeled-japan-monthly-visits", "modeled-monthly-opportunity-gap"],
      facts,
    })
    expect(review.passed).toBe(false)
    expect(review.score).toBe(0)
    expect(review.issues).toContain("Unresolved template placeholder is prohibited")
    expect(review.issues.join(" ")).toContain("Required modeled values are missing from paragraph 3")
  })

  it.each([
    "[monthly visits]",
    "［monthly visits］",
    "【monthly visits】",
    "{{monthly_visits}}",
    "${monthly_visits}",
    "<monthly_visits>",
    "__MONTHLY_VISITS__",
    "%MONTHLY_VISITS%",
    "MONTHLY_VISITS",
    "TBD",
  ])("rejects unresolved placeholder form %s", (placeholder) => {
    const facts = buildJapanEntryPersonalizationFacts(audit, "ecommerce", projection)
    const review = reviewPersonalizedJapanEntryMessage({
      message: messages[0].replace("1,950", placeholder),
      companyName: "Example",
      productContext,
      productEvidence,
      factIds: ["japan-audit-language", "modeled-japan-monthly-visits", "modeled-monthly-opportunity-gap"],
      facts,
    })
    expect(review.passed).toBe(false)
    expect(review.issues).toContain("Unresolved template placeholder is prohibited")
  })

  it("requires the exact supplied modeled values in the diagnosis paragraph", () => {
    const facts = buildJapanEntryPersonalizationFacts(audit, "ecommerce", projection)
    const message = messages[0]
      .replace("1,950", "an estimated volume of visits")
      .replace("$10,296", "an estimated monthly amount")
    const review = reviewPersonalizedJapanEntryMessage({
      message,
      companyName: "Example",
      productContext,
      productEvidence,
      factIds: ["japan-audit-language", "modeled-japan-monthly-visits", "modeled-monthly-opportunity-gap"],
      facts,
    })
    expect(review.passed).toBe(false)
    expect(review.issues.join(" ")).toMatch(/Required modeled values|exact USD currency label/)
  })

  it("requires the exact company name in the product-understanding paragraph", () => {
    const facts = buildJapanEntryPersonalizationFacts(audit, "ecommerce", projection)
    const message = messages[0]
      .replace("I reviewed Example’s", "I reviewed the company’s")
      .replace("Our public-signal", "Example’s public-signal")
    const review = reviewPersonalizedJapanEntryMessage({
      message,
      companyName: "Example",
      productContext,
      productEvidence,
      factIds: ["japan-audit-language", "modeled-japan-monthly-visits", "modeled-monthly-opportunity-gap"],
      facts,
    })
    expect(review.passed).toBe(false)
    expect(review.issues).toContain("Company name and grounded product understanding must be in paragraph 2")
  })

  it("rejects speculative product applicability found by the live V4 Pro smoke test", () => {
    const facts = buildJapanEntryPersonalizationFacts(audit, "saas", projection)
    const message = `Hello, I’m Sato from Paradigm LLC in Japan. We help overseas companies enter the Japanese market.

I reviewed Example and noted its subscription analytics platform for independent retailers. Its inventory forecasting could address specific operational needs of Japanese shop owners.

A public-signal planning model estimates approximately 1,950 monthly visits from Japan, with a potential monthly revenue opportunity gap of approximately $10,296. These are planning estimates, not measured analytics. The checked public pages did not show a Japanese-language customer path, so the customer path remains unverified.

Paradigm addresses these items through our Japan Entry Package, which validates the opportunity and addresses the named customer-path gap. The package is $13,000 paid upfront, with the first six months of managed support included at no additional monthly charge. Would you like a detailed Japan opportunity analysis?`
    const review = reviewPersonalizedJapanEntryMessage({
      message,
      companyName: "Example",
      productContext,
      productEvidence,
      factIds: ["japan-audit-language", "modeled-japan-monthly-visits", "modeled-monthly-opportunity-gap"],
      facts,
    })
    expect(review.passed).toBe(false)
    expect(review.issues).toContain("Speculative product applicability is prohibited in paragraph 2")
    expect(review.issues).toContain("Japan-specific product claims must come from the supplied product context")
    expect(review.issues.join(" ")).toContain("Unsupported product-context terms")
  })

  it("generates three candidates and uses a separate strict V4 Pro critic", async () => {
    const caller = vi
      .fn()
      .mockResolvedValueOnce(generationResponse())
      .mockResolvedValueOnce(
        criticResponse({
          risk_flags: ["abrupt pricing"],
        }),
      )
    const result = await generatePersonalizedJapanEntryMessage(generateInput(), caller)

    expect(result.ok).toBe(true)
    expect(result.message).toBe(messages[1])
    expect(result.review).toMatchObject({
      model: "deepseek-v4-pro",
      score: 93,
      passed: true,
      editorialScores: {
        specificity: 23,
        naturalness: 23,
        credibility: 24,
        executiveRelevance: 23,
      },
    })
    expect(caller).toHaveBeenCalledTimes(2)
    expect(result.usage).toEqual({ prompt_tokens: 200, completion_tokens: 40, cache_hit_tokens: 160, cache_miss_tokens: 40 })
    for (const [, options] of caller.mock.calls) {
      expect(options).toMatchObject({
        model: "deepseek-v4-pro",
        modelPolicy: "strict",
        responseFormat: "json_object",
        thinking: "disabled",
        timeoutMs: 120_000,
      })
      expect(options.maxTokens).toBeLessThanOrEqual(4_000)
    }
  })

  it("rejects dense copy without four readable paragraphs", () => {
    const facts = buildJapanEntryPersonalizationFacts(audit, "ecommerce", projection)
    const review = reviewPersonalizedJapanEntryMessage({
      message: messages[0].replaceAll("\n\n", " "),
      companyName: "Example",
      productContext,
      productEvidence,
      factIds: ["japan-audit-language", "modeled-japan-monthly-visits", "modeled-monthly-opportunity-gap"],
      facts,
    })
    expect(review.passed).toBe(false)
    expect(review.issues).toContain("Message must contain exactly four short paragraphs separated by blank lines")
  })

  it("rejects the prior generic rank-led pattern", () => {
    const facts = buildJapanEntryPersonalizationFacts(audit, "ecommerce", projection)
    const review = reviewPersonalizedJapanEntryMessage({
      message:
        "Hi Example team — I noticed your site has a Tranco rank of 52,000. Given that reach, Japan is a logical next step. Our Japan Entry Package is $13,000 paid upfront, with the first six months included. Is this relevant?",
      companyName: "Example",
      productContext,
      productEvidence,
      factIds: ["japan-audit-jpy"],
      facts,
    })
    expect(review.passed).toBe(false)
    expect(review.issues.join(" ")).toMatch(/not reflected|Generic|Unsupported/)
  })

  it("rejects URLs, performance claims, and unsupported numbers", () => {
    const facts = buildJapanEntryPersonalizationFacts(audit, "ecommerce", projection)
    const review = reviewPersonalizedJapanEntryMessage({
      message: `${messages[0]} Visit https://example.com for a guaranteed 400% ROI.`,
      companyName: "Example",
      productContext,
      productEvidence,
      factIds: ["japan-audit-language", "modeled-japan-monthly-visits", "modeled-monthly-opportunity-gap"],
      facts,
    })
    expect(review.passed).toBe(false)
    expect(review.issues.join(" ")).toMatch(/URL|Performance|Unsupported/)
  })

  it("rejects causal exit claims and invented package deliverables even after an LLM approves them", () => {
    const facts = buildJapanEntryPersonalizationFacts(audit, "ecommerce", projection)
    const unsafe = messages[0]
      .replace(
        "leaving the route from existing Japanese interest to purchase unverified.",
        "This creates a missing step for Japanese retailers, potentially causing early exit.",
      )
      .replace("addresses the named customer-path gap.", "addresses the named customer-path gap with Japanese-language touchpoints and buyer support.")
    const review = reviewPersonalizedJapanEntryMessage({
      message: unsafe,
      companyName: "Example",
      productContext,
      productEvidence,
      factIds: ["japan-audit-language", "modeled-japan-monthly-visits", "modeled-monthly-opportunity-gap"],
      facts,
    })
    expect(review.passed).toBe(false)
    expect(review.issues).toContain("Unsupported causal inference or invented package deliverable is prohibited")
  })

  it("fails closed before the LLM when no audited Japan fact exists", async () => {
    const caller = vi.fn()
    const result = await generatePersonalizedJapanEntryMessage({ ...generateInput(), audit: null }, caller)
    expect(result.ok).toBe(false)
    expect(result.error).toContain("No high-signal Japan-specific public fact")
    expect(caller).not.toHaveBeenCalled()
  })

  it("fails closed before the LLM when product understanding is unavailable", async () => {
    const caller = vi.fn()
    const result = await generatePersonalizedJapanEntryMessage({ ...generateInput(), productContext: null }, caller)
    expect(result.ok).toBe(false)
    expect(result.error).toContain("grounded public product description")
    expect(caller).not.toHaveBeenCalled()
  })

  it("rejects modeled numbers presented without estimate language", () => {
    const facts = buildJapanEntryPersonalizationFacts(audit, "ecommerce", projection)
    const review = reviewPersonalizedJapanEntryMessage({
      message: messages[0]
        .replace("Our public-signal planning model estimates roughly", "Our public-signal dashboard shows exactly")
        .replace("These are modeled estimates, not measured analytics.", "These are current figures."),
      companyName: "Example",
      productContext,
      productEvidence,
      factIds: ["japan-audit-language", "modeled-japan-monthly-visits", "modeled-monthly-opportunity-gap"],
      facts,
    })
    expect(review.passed).toBe(false)
    expect(review.issues).toContain("Modeled metrics are not clearly labeled as estimates")
  })

  it("rejects audit-only copy when a complete quantified opportunity is available", () => {
    const facts = buildJapanEntryPersonalizationFacts(audit, "ecommerce", projection)
    const review = reviewPersonalizedJapanEntryMessage({
      message: messages[1]
        .replace(/The public-signal planning model[\s\S]*?not measured analytics\. /, "")
        .replace("monthly revenue opportunity", "commercial opportunity"),
      companyName: "Example",
      productContext,
      productEvidence,
      factIds: ["japan-audit-jpy"],
      facts,
    })
    expect(review.passed).toBe(false)
    expect(review.issues).toContain("Quantified mode requires both Japan visits and opportunity-gap facts")
  })

  it("uses one repair pass when the first editorial result is below production quality", async () => {
    const caller = vi
      .fn()
      .mockResolvedValueOnce(generationResponse())
      .mockResolvedValueOnce(
        criticResponse({
          scores: {
            specificity: 21,
            naturalness: 22,
            credibility: 24,
            executive_relevance: 22,
          },
          rationale: "The product connection is too shallow.",
        }),
      )
      .mockResolvedValueOnce(repairResponse(messages[1]))
      .mockResolvedValueOnce(criticResponse({ selected_index: 0 }))
    const result = await generatePersonalizedJapanEntryMessage(generateInput(), caller)
    expect(result.ok).toBe(true)
    expect(result.review?.score).toBe(93)
    expect(result.review?.attempts).toBe(4)
    expect(caller).toHaveBeenCalledTimes(4)
    expect(caller.mock.calls[2]?.[0]?.[0]?.content).toBe(caller.mock.calls[0]?.[0]?.[0]?.content)
    expect(caller.mock.calls[2]?.[0]?.[1]?.content).toContain("editorial_feedback")
  })

  it("fails closed when the editorial score is below the quality bar", async () => {
    const caller = vi
      .fn()
      .mockResolvedValueOnce(generationResponse())
      .mockResolvedValueOnce(
        criticResponse({
          scores: { specificity: 19, naturalness: 22, credibility: 24, executive_relevance: 22 },
        }),
      )
      .mockResolvedValueOnce(repairResponse(messages[1]))
      .mockResolvedValueOnce(
        criticResponse({
          selected_index: 0,
          scores: { specificity: 21, naturalness: 22, credibility: 24, executive_relevance: 22 },
        }),
      )
      .mockResolvedValueOnce(repairResponse(messages[1]))
      .mockResolvedValueOnce(criticResponse({ selected_index: 0, scores: { specificity: 22, naturalness: 22, credibility: 24, executive_relevance: 23 } }))
      .mockResolvedValueOnce(repairResponse(messages[1]))
      .mockResolvedValueOnce(criticResponse({ selected_index: 0, scores: { specificity: 22, naturalness: 22, credibility: 24, executive_relevance: 23 } }))
    const result = await generatePersonalizedJapanEntryMessage(generateInput(), caller)
    expect(result.ok).toBe(false)
    expect(result.review?.passed).toBe(false)
    expect(result.message).toBeUndefined()
    expect(caller).toHaveBeenCalledTimes(8)
  })

  it("does not replace a V4 Pro outage with canned copy", async () => {
    const caller = vi.fn(async () => ({ ok: false, error: "upstream timeout" }) satisfies DeepSeekResponse)
    const result = await generatePersonalizedJapanEntryMessage(generateInput(), caller)
    expect(result.ok).toBe(false)
    expect(result.message).toBeUndefined()
    expect(caller).toHaveBeenCalledTimes(3)
  })
})
