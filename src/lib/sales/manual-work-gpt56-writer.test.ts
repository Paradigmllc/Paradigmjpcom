import { describe, expect, it, vi } from "vitest"
import type { ManualEditorialBrief } from "./manual-work-editorial-brief"
import { generateManualEditorialMessage } from "./manual-work-gpt56-writer"

function brief(): ManualEditorialBrief {
  return {
    domain: "northstar.example",
    companyName: "Northstar Workspace",
    countryCode: "FI",
    countryConfidence: 95,
    countrySignals: ["Designed in Helsinki"],
    businessModel: "ecommerce",
    productNames: ["Northstar Rail System"],
    productContext: "Modular desk systems for compact creative studios",
    pages: [
      { url: "https://northstar.example", kind: "home", title: "Northstar Workspace", description: null, headings: ["Build a workspace that changes with the project"], snippets: [], hasContactForm: false },
      { url: "https://northstar.example/products", kind: "product", title: "Northstar Rail System", description: null, headings: ["Rail System"], snippets: [], hasContactForm: false },
    ],
    evidence: [
      { id: "e01", pageKind: "home", statement: "Northstar combines aluminium rails, cable control and reconfigurable storage.", sourceUrl: "https://northstar.example" },
      { id: "e02", pageKind: "product", statement: "The anodised aluminium rail supports shelves, trays and cable modules without permanent drilling.", sourceUrl: "https://northstar.example/products" },
      { id: "e03", pageKind: "pricing", statement: "Starter kits are available in 800 mm and 1200 mm widths.", sourceUrl: "https://northstar.example/pricing" },
    ],
    contactUrl: "https://northstar.example/contact",
    publicEmail: "partnerships@northstar.example",
    contactFormDetected: false,
    contactSignals: ["Public business email detected: partnerships@northstar.example"],
    japanPresence: { existing: false, level: "none", signals: [], urls: [] },
    audit: {
      engine: "local_heuristic",
      generated_at: "2026-07-29T00:00:00.000Z",
      score: 40,
      status: { tokushoho_missing: true, appi_missing: true, local_payments_missing: true, japanese_language_missing: true, jpy_currency_missing: true, japan_shipping_missing: true },
      signals: { tokushoho: [], appi: [], local_payments: [], japanese_language: [], jpy_currency: [], japan_shipping: [] },
      presence: { existing: false, level: "none", signals: [], urls: [] },
      pages_checked: ["https://northstar.example"],
      sales_pitch_context: "bounded public-page screen",
      human_review_required: true,
      legal_disclaimer: "not legal advice",
    },
    collectedAt: "2026-07-29T00:00:00.000Z",
  }
}

describe("GPT-5.6 manual editorial writer", () => {
  it("uses a strategist and critic pass, then returns company-specific copy", async () => {
    const caller = vi.fn()
      .mockResolvedValueOnce({
        model: "gpt-5.6-terra",
        usage: { prompt_tokens: 900, completion_tokens: 350 },
        text: JSON.stringify({
          decision: "ready",
          strategy: {
            companyThesis: "Northstar sells a configurable physical system rather than generic desk accessories.",
            japanQuestion: "Whether the first Japan test should lead with compact urban studios or design-retail distribution.",
            whyNow: "The public product range already offers two starter widths and a wholesale route.",
            evidenceIds: ["e01", "e02", "e03"],
          },
          candidates: [
            { body: "Northstar Workspace has built a modular system around anodised aluminium rails, cable control and reconfigurable storage, with starter kits in two defined widths. That gives a Japan test a more specific question than simple translation: whether the first offer should be framed for compact urban studios or introduced through design retailers that can demonstrate the system. I did not find a Japanese buying path or JPY presentation on the checked pages. Would it be useful if I sent a short note comparing those two entry routes and the minimum launch setup for each?", evidenceIds: ["e01", "e02", "e03"], angle: "channel choice" },
            { body: "Northstar Workspace presents the Rail System as a drill-free way to add shelves, trays and cable modules. For Japan, the interesting issue is not whether desk accessories exist, but how a configurable system would be understood and demonstrated before a customer commits to a width. The checked pages did not show a Japanese-language or JPY path. May I send a concise Japan note focused on the first product configuration, local explanation required, and whether direct ecommerce or a design-retail partner is the cleaner initial test?", evidenceIds: ["e01", "e02", "e03"], angle: "product explanation" },
            { body: "The combination of a defined rail platform, interchangeable modules and a wholesale contact makes Northstar Workspace unusually suitable for a small channel test rather than a broad catalogue launch. A practical Japan decision would be which starter configuration can carry the product story with the least explanation, and whether a retailer should demonstrate it before direct sales are expanded. I could not find a Japanese customer path on the checked pages. Would a short comparison of a retailer-led test and a direct-store test be useful?", evidenceIds: ["e01", "e02", "e03"], angle: "test design" },
          ],
          insufficiencyReason: null,
        }),
      })
      .mockResolvedValueOnce({
        model: "gpt-5.6-sol",
        usage: { prompt_tokens: 1_100, completion_tokens: 240 },
        text: JSON.stringify({
          decision: "ready",
          body: "Northstar Workspace has built a configurable system around anodised aluminium rails, cable control and reconfigurable storage, with starter kits in two defined widths. For Japan, the useful first decision is not broad localisation; it is whether one starter configuration should be demonstrated through a design retailer before direct ecommerce is expanded. The checked pages did not show a Japanese-language buying path or JPY presentation. Would it be useful if I sent a short note comparing a retailer-led test with a direct-store test, including the minimum product explanation and launch setup for each?",
          evidenceIds: ["e01", "e02", "e03"],
          score: 94,
          dimensions: { companySpecificity: 24, strategicSubstance: 24, naturalness: 23, executiveRelevance: 23 },
          critique: "Specific product architecture and a real channel decision make the note difficult to reuse for another company.",
        }),
      })

    const result = await generateManualEditorialMessage({ brief: brief(), priorMessages: [], caller })

    expect(result.ok).toBe(true)
    expect(caller).toHaveBeenCalledTimes(2)
    expect(result.message).toContain("Hello Northstar Workspace team,")
    expect(result.message).toContain("anodised aluminium rails")
    expect(result.message).toContain("design retailer")
    expect(result.message).not.toContain("untapped opportunity")
    expect(result.review).toMatchObject({ passed: true, score: 94 })
  })

  it("fails closed instead of padding thin evidence with a template", async () => {
    const caller = vi.fn().mockResolvedValue({
      model: "gpt-5.6-terra",
      usage: { prompt_tokens: 400, completion_tokens: 80 },
      text: JSON.stringify({
        decision: "insufficient",
        strategy: null,
        candidates: [],
        insufficiencyReason: "The checked pages do not establish a product or commercial decision specific enough for outreach.",
      }),
    })

    const result = await generateManualEditorialMessage({ brief: brief(), priorMessages: [], caller })

    expect(result.ok).toBe(false)
    expect(result.error).toContain("do not establish")
    expect(caller).toHaveBeenCalledTimes(1)
  })
})
