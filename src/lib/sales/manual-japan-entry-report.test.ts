import { describe, expect, it } from "vitest"
import { buildManualJapanEntryReport } from "./manual-japan-entry-report"
import type { ManualCompanyProfile } from "./manual-japan-entry-types"

const audit = {
  engine: "local_heuristic" as const,
  generated_at: "2026-07-15T00:00:00.000Z",
  score: 25,
  status: {
    tokushoho_missing: true,
    appi_missing: true,
    local_payments_missing: true,
    japanese_language_missing: true,
    jpy_currency_missing: true,
    japan_shipping_missing: true,
  },
  signals: { tokushoho: [], appi: [], local_payments: [], japanese_language: [], jpy_currency: [], japan_shipping: [] },
  pages_checked: ["https://acme.com/"],
  sales_pitch_context: "Observed public-page gaps",
  human_review_required: true,
  legal_disclaimer: "Not legal advice",
}

function profile(businessModel: ManualCompanyProfile["businessModel"]): ManualCompanyProfile {
  return {
    companyName: "Acme",
    countryCode: "US",
    isJapaneseCompany: false,
    smbStatus: "qualified",
    smbConfidence: 85,
    smbEvidence: ["Public evidence"],
    japanEntryFitStatus: "qualified",
    japanEntryFitConfidence: 80,
    japanEntryFitEvidence: ["Public evidence"],
    businessModel,
    industry: businessModel === "ecommerce" ? "E-Commerce / Retail" : businessModel === "saas" ? "Technology / IT" : "Legal / Professional Services",
    productContext: "Acme provides a documented product through its public website.",
    observedFacts: ["Public offer exists"],
    outreachPlaybook: businessModel === "ecommerce" ? "premium_hobby_ecommerce" : "general_online_smb",
    positioningConcept: null,
  }
}

async function reportFor(businessModel: ManualCompanyProfile["businessModel"]) {
  return buildManualJapanEntryReport({
    profile: profile(businessModel),
    audit,
    form: { formUrl: "https://acme.com/contact", method: "crawl4ai", verification: "form", confidence: 94, inspection: null, candidates: [], traceMs: 10 },
    initialMessage: "A reviewable permission-based first touch",
    messageReview: { passed: true, score: 96, purpose: "initial_interest" },
    reportUrl: "https://paradigmjp.com/en/work-report/token",
    sourceUrl: "https://acme.com/",
  })
}

describe("manual Japan Entry diagnostic report", () => {
  it("uses observed ecommerce gaps without inventing traffic, revenue, or loss", async () => {
    const report = await reportFor("ecommerce")
    expect(report.total_loss).toBe("0")
    expect(report.meta).not.toHaveProperty("japan_entry_projection")
    expect(JSON.stringify(report)).not.toMatch(/monthly visits|monthly revenue|opportunity loss/i)
    expect(report.meta).toMatchObject({ manual_work: true, evidence_contract: "public-pages-only" })
    expect(report.content_template.appeal_angle).toBe("japan_entry")
    expect(report.source_coverage).toMatchObject({ score: 100, collected: 5, missing: 0 })
  })

  it("never applies ecommerce-only gaps to a SaaS company", async () => {
    const report = await reportFor("saas")
    const rendered = JSON.stringify({ acts: report.acts, journey: report.visitor_journey, painPoints: report.intelligence.painPoints })
    expect(rendered).toMatch(/Japanese-language customer path/)
    expect(rendered).toMatch(/JPY pricing/)
    expect(rendered).not.toMatch(/Japan delivery terms|Japan-specific delivery|Japan-local payment|PayPay|Paidy|konbini|commerce disclosure|Tokushoho/i)
  })

  it("limits service-company findings to the language customer path", async () => {
    const report = await reportFor("service")
    const rendered = JSON.stringify({ acts: report.acts, journey: report.visitor_journey, painPoints: report.intelligence.painPoints })
    expect(rendered).toMatch(/Japanese-language customer path/)
    expect(rendered).not.toMatch(/JPY pricing|Japan delivery terms|Japan-specific delivery|Japan-local payment|commerce disclosure|Tokushoho/i)
  })
})
