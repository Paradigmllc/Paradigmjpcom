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
  evidence: [{
    id: "tranco-rank",
    label: "Tranco domain rank",
    value: "#52,000",
    source: "Tranco",
    sourceUrl: "https://tranco-list.eu/query?domain=example.com",
    observedAt: "2026-07-13T00:00:00.000Z",
    confidence: 0.7,
    limitation: "Public proxy only; not first-party visits or revenue.",
  }],
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
  "Hello Example team — the public pages we reviewed do not show customer-facing JPY pricing or Japan-local payment options. For a Japanese buyer, that creates a concrete purchase decision before localization becomes a broader project. Our Japan Entry Package is $12,000 paid upfront, with the first six months of managed support included at no additional monthly charge. Would testing that purchase path be relevant this quarter?",
  "Example’s public storefront gives buyers a clear product path, but the checked pages do not show JPY prices or Japan-specific delivery terms. That makes the first Japan question less about a full launch and more about whether local customers can buy with confidence. The Japan Entry Package is $12,000 paid upfront, with the first six months of managed support included. Would a focused validation of that path be useful now?",
  "The public customer journey for Example does not currently show a Japanese-language path or Japan-local payment references on the pages reviewed. Those are small but consequential signals when a buyer is deciding whether the store is meant for them. We run a $12,000 Japan Entry Package, paid upfront, with the first six months of managed support included. Is closing those two gaps a current priority?",
]

function response(text: string): DeepSeekResponse {
  return { ok: true, text, usedModel: "deepseek-v4-pro" }
}

function generationResponse(): DeepSeekResponse {
  return response(JSON.stringify({
    candidates: messages.map((message, index) => ({
      message,
      fact_ids: index === 0
        ? ["japan-audit-jpy", "japan-audit-payments"]
        : index === 1
          ? ["japan-audit-jpy", "japan-audit-shipping"]
          : ["japan-audit-language", "japan-audit-payments"],
      angle: `angle-${index + 1}`,
    })),
  }))
}

function criticResponse(overrides: Record<string, unknown> = {}): DeepSeekResponse {
  return response(JSON.stringify({
    selected_index: 1,
    scores: { specificity: 23, naturalness: 22, credibility: 24, executive_relevance: 22 },
    rationale: "Specific public-page observation, restrained inference, and a direct decision question.",
    risk_flags: [],
    ...overrides,
  }))
}

function generateInput() {
  return {
    companyName: "Example",
    industry: "E-Commerce / Retail",
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
    ])
    expect(buildJapanEntryPersonalizationFacts(audit, "service").map((fact) => fact.id)).toEqual([
      "japan-audit-language",
    ])
  })

  it("accepts restrained copy grounded in audited Japan gaps", () => {
    const facts = buildJapanEntryPersonalizationFacts(audit, "ecommerce")
    const review = reviewPersonalizedJapanEntryMessage({
      message: messages[0],
      companyName: "Example",
      factIds: ["japan-audit-jpy", "japan-audit-payments"],
      facts,
    })
    expect(review.passed).toBe(true)
    expect(review.score).toBe(100)
  })

  it("generates three candidates and uses a separate strict V4 Pro critic", async () => {
    const caller = vi.fn()
      .mockResolvedValueOnce(generationResponse())
      .mockResolvedValueOnce(criticResponse())
    const result = await generatePersonalizedJapanEntryMessage(generateInput(), caller)

    expect(result.ok).toBe(true)
    expect(result.message).toBe(messages[1])
    expect(result.review).toMatchObject({
      model: "deepseek-v4-pro",
      score: 91,
      passed: true,
      editorialScores: { specificity: 23, naturalness: 22, credibility: 24, executiveRelevance: 22 },
    })
    expect(caller).toHaveBeenCalledTimes(2)
    for (const [, options] of caller.mock.calls) {
      expect(options).toMatchObject({ model: "deepseek-v4-pro", modelPolicy: "strict", responseFormat: "json_object" })
    }
  })

  it("rejects the prior generic rank-led pattern", () => {
    const facts = buildJapanEntryPersonalizationFacts(audit, "ecommerce")
    const review = reviewPersonalizedJapanEntryMessage({
      message: "Hi Example team — I noticed your site has a Tranco rank of 52,000. Given that reach, Japan is a logical next step. Our Japan Entry Package is $12,000 paid upfront, with the first six months included. Is this relevant?",
      companyName: "Example",
      factIds: ["japan-audit-jpy"],
      facts,
    })
    expect(review.passed).toBe(false)
    expect(review.issues.join(" ")).toMatch(/not reflected|Generic|Unsupported/)
  })

  it("rejects URLs, performance claims, and unsupported numbers", () => {
    const facts = buildJapanEntryPersonalizationFacts(audit, "ecommerce")
    const review = reviewPersonalizedJapanEntryMessage({
      message: `${messages[0]} Visit https://example.com for a guaranteed 400% ROI.`,
      companyName: "Example",
      factIds: ["japan-audit-jpy", "japan-audit-payments"],
      facts,
    })
    expect(review.passed).toBe(false)
    expect(review.issues.join(" ")).toMatch(/URL|Performance|Unsupported/)
  })

  it("fails closed before the LLM when no audited Japan fact exists", async () => {
    const caller = vi.fn()
    const result = await generatePersonalizedJapanEntryMessage({ ...generateInput(), audit: null }, caller)
    expect(result.ok).toBe(false)
    expect(result.error).toContain("No high-signal Japan-specific public fact")
    expect(caller).not.toHaveBeenCalled()
  })

  it("fails closed when the editorial score is below the quality bar", async () => {
    const caller = vi.fn()
      .mockResolvedValueOnce(generationResponse())
      .mockResolvedValueOnce(criticResponse({
        scores: { specificity: 19, naturalness: 22, credibility: 24, executive_relevance: 22 },
      }))
    const result = await generatePersonalizedJapanEntryMessage(generateInput(), caller)
    expect(result.ok).toBe(false)
    expect(result.review?.passed).toBe(false)
    expect(result.message).toBeUndefined()
  })

  it("does not replace a V4 Pro outage with canned copy", async () => {
    const caller = vi.fn(async () => ({ ok: false, error: "upstream timeout" } satisfies DeepSeekResponse))
    const result = await generatePersonalizedJapanEntryMessage(generateInput(), caller)
    expect(result.ok).toBe(false)
    expect(result.message).toBeUndefined()
    expect(caller).toHaveBeenCalledTimes(3)
  })
})
