import { describe, expect, it } from "vitest"
import { buildManualFirstTouchCopy } from "./manual-work-first-touch"
import type { JapanMarketAudit } from "./sources/japan-market-audit"

function audit(): JapanMarketAudit {
  return {
    engine: "local_heuristic",
    generated_at: "2026-07-29T00:00:00.000Z",
    score: 10,
    status: {
      tokushoho_missing: true,
      appi_missing: true,
      local_payments_missing: true,
      japanese_language_missing: true,
      jpy_currency_missing: true,
      japan_shipping_missing: true,
    },
    signals: { tokushoho: [], appi: [], local_payments: [], japanese_language: [], jpy_currency: [], japan_shipping: [] },
    pages_checked: ["https://example.com/"],
    sales_pitch_context: "Fast homepage audit",
    human_review_required: true,
    legal_disclaimer: "Not legal advice",
  }
}

describe("manual first-touch copy", () => {
  it("produces a short, direct permission message without unsupported metrics", () => {
    const result = buildManualFirstTouchCopy({
      companyName: "Northstar Desk",
      productNames: ["Modular Desk Organizer"],
      businessModel: "ecommerce",
      audit: audit(),
      mode: "fast",
    })

    expect(result.message).toContain("Hello Northstar Desk team,")
    expect(result.message).toContain("Modular Desk Organizer")
    expect(result.message).toContain("Japan untested rather than disproven")
    expect(result.message).toContain("Would it be useful if I sent a short Japan opportunity note")
    expect(result.message).not.toMatch(/ROI|revenue|traffic|losing|guarantee/i)
    expect(result.review.generation_status).toBe("deterministic_fast_v2")
    expect(Number(result.review.wordCount)).toBeLessThan(100)
  })

  it("falls back to a natural category label when a product name is unusable", () => {
    const result = buildManualFirstTouchCopy({
      companyName: "Example Cloud",
      productNames: ["Example Cloud"],
      businessModel: "saas",
      audit: audit(),
      mode: "full",
    })

    expect(result.message).toContain("including the software product")
    expect(result.review.generation_status).toBe("deterministic_full_v2")
  })
})
