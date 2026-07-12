import { describe, expect, it, vi } from "vitest"
import type { DeepSeekResponse } from "@/lib/deepseek"
import { buildJapanEntryProjection } from "./japan-entry-projection"
import { generatePersonalizedJapanEntryMessage, reviewPersonalizedJapanEntryMessage } from "./japan-entry-personalized-message"
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

const validMessage = "Hi Example team — I reviewed publicly available signals for Example and noticed Tranco lists the domain at #52,000. That indicates an established public web footprint, but it does not reveal private analytics or confirm Japan demand. Paradigm’s Japan Entry Package is $12,000 paid upfront, with the first six months of managed support included at no additional monthly charge. Is Japan expansion a priority for Example this year?"

function response(text: string): DeepSeekResponse {
  return { ok: true, text, usedModel: "deepseek-v4-pro" }
}

describe("DeepSeek V4 Pro Japan Entry form copy", () => {
  it("accepts personalized plain text grounded in one observed fact", () => {
    const review = reviewPersonalizedJapanEntryMessage({
      message: validMessage,
      companyName: "Example",
      observedFactIds: ["tranco-rank"],
      evidence: projection.evidence,
      attempts: 1,
    })
    expect(review.passed).toBe(true)
    expect(review.score).toBe(100)
  })

  it("uses strict deepseek-v4-pro and returns the reviewed message", async () => {
    const caller = vi.fn(async (_messages, options) => {
      expect(options.model).toBe("deepseek-v4-pro")
      expect(options.modelPolicy).toBe("strict")
      expect(options.responseFormat).toBe("json_object")
      return response(JSON.stringify({ message: validMessage, observed_fact_ids: ["tranco-rank"] }))
    })
    const result = await generatePersonalizedJapanEntryMessage({
      companyName: "Example",
      industry: "E-Commerce / Retail",
      targetCountry: "US",
      projection,
    }, caller)
    expect(result.ok).toBe(true)
    expect(result.message).toBe(validMessage)
    expect(result.review?.model).toBe("deepseek-v4-pro")
    expect(caller).toHaveBeenCalledTimes(1)
  })

  it("asks the same model to repair one invalid draft", async () => {
    const caller = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify({ message: "Generic copy", observed_fact_ids: ["tranco-rank"] })))
      .mockResolvedValueOnce(response(JSON.stringify({ message: validMessage, observed_fact_ids: ["tranco-rank"] })))
    const result = await generatePersonalizedJapanEntryMessage({
      companyName: "Example",
      industry: null,
      targetCountry: "US",
      projection,
    }, caller)
    expect(result.ok).toBe(true)
    expect(result.review?.attempts).toBe(2)
    expect(caller).toHaveBeenCalledTimes(2)
  })

  it("rejects URLs, performance claims, and unsupported numbers", () => {
    const review = reviewPersonalizedJapanEntryMessage({
      message: `${validMessage} Visit https://example.com for a guaranteed 400% ROI.`,
      companyName: "Example",
      observedFactIds: ["tranco-rank"],
      evidence: projection.evidence,
      attempts: 1,
    })
    expect(review.passed).toBe(false)
    expect(review.issues.join(" ")).toMatch(/URL|performance|Unsupported/)
  })

  it("rejects invented entity, legal, tax, or compliance scope", () => {
    const review = reviewPersonalizedJapanEntryMessage({
      message: validMessage.replace("That indicates an established public web footprint", "Our package handles local entity setup and compliance"),
      companyName: "Example",
      observedFactIds: ["tranco-rank"],
      evidence: projection.evidence,
      attempts: 1,
    })
    expect(review.passed).toBe(false)
    expect(review.issues.join(" ")).toContain("unsupported legal")
  })

  it("fails closed when no observed fact exists", async () => {
    const caller = vi.fn()
    const result = await generatePersonalizedJapanEntryMessage({
      companyName: "Example",
      industry: null,
      targetCountry: "US",
      projection: { ...projection, evidence: projection.evidence.filter((item) => item.classification === "assumed") },
    }, caller)
    expect(result.ok).toBe(false)
    expect(result.error).toContain("No observed public fact")
    expect(caller).not.toHaveBeenCalled()
  })

  it("does not replace a V4 Pro outage with canned copy", async () => {
    const caller = vi.fn(async () => ({ ok: false, error: "upstream timeout" } satisfies DeepSeekResponse))
    const result = await generatePersonalizedJapanEntryMessage({
      companyName: "Example",
      industry: null,
      targetCountry: "US",
      projection,
    }, caller)
    expect(result.ok).toBe(false)
    expect(result.message).toBeUndefined()
    expect(caller).toHaveBeenCalledTimes(4)
  })
})
