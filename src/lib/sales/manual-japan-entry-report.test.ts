import { describe, expect, it } from "vitest"
import { buildManualJapanEntryReport } from "./manual-japan-entry-report"

describe("manual Japan Entry diagnostic report", () => {
  it("uses observed gaps without inventing traffic, revenue, or loss", () => {
    const report = buildManualJapanEntryReport({
      profile: {
        companyName: "Acme",
        countryCode: "US",
        isJapaneseCompany: false,
        smbStatus: "qualified",
        smbConfidence: 85,
        smbEvidence: ["Public evidence"],
        japanEntryFitStatus: "qualified",
        japanEntryFitConfidence: 80,
        japanEntryFitEvidence: ["Public evidence"],
        businessModel: "ecommerce",
        industry: "E-Commerce / Retail",
        productContext: "Acme sells a documented consumer product through its public store.",
        observedFacts: ["Public store exists"],
      },
      audit: {
        engine: "local_heuristic",
        generated_at: "2026-07-15T00:00:00.000Z",
        score: 25,
        status: { tokushoho_missing: true, appi_missing: true, local_payments_missing: true, japanese_language_missing: true, jpy_currency_missing: true, japan_shipping_missing: true },
        signals: { tokushoho: [], appi: [], local_payments: [], japanese_language: [], jpy_currency: [], japan_shipping: [] },
        pages_checked: ["https://acme.com/"],
        sales_pitch_context: "Observed public-page gaps",
        human_review_required: true,
        legal_disclaimer: "Not legal advice",
      },
      form: { formUrl: "https://acme.com/contact", method: "crawl4ai", verification: "form", confidence: 94, inspection: null, candidates: [], traceMs: 10 },
      initialMessage: "Hello Acme",
      messageReview: { passed: true },
      reportUrl: "https://paradigmjp.com/en/work-report/token",
      sourceUrl: "https://acme.com/",
    })
    expect(report.total_loss).toBe("0")
    expect(report.meta).not.toHaveProperty("japan_entry_projection")
    expect(JSON.stringify(report)).not.toMatch(/monthly visits|monthly revenue|opportunity loss/i)
    expect(report.meta).toMatchObject({ manual_work: true })
  })
})
