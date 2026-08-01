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
    countryCode: "PL",
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
    commercialSignals: [
      { kind: "global_customers", sourcePhrase: "Customers in 30 countries", detail: "Public customer footprint" },
      { kind: "funding", sourcePhrase: "Backed by Example Ventures", detail: "Public funding statement" },
    ],
  }
}

async function reportFor(businessModel: ManualCompanyProfile["businessModel"]) {
  return buildManualJapanEntryReport({
    profile: profile(businessModel),
    audit,
    form: {
      formUrl: "https://acme.com/contact",
      method: "crawl4ai",
      verification: "form",
      confidence: 94,
      inspection: { status: "form", reason: "verified_contact_fields", fields: ["name", "email", "message", "submit"], formCount: 1, action: "https://acme.com/contact", sameOrigin: true, trustedProvider: false },
      candidates: [],
      traceMs: 10,
    },
    initialMessage: "A reviewable permission-based first touch",
    messageReview: {
      passed: true,
      score: 96,
      purpose: "initial_interest",
      strategy: {
        primaryObservation: "Acme documents a workflow product for distributed small-business teams.",
        japaneseSegment: "Japanese operations teams replacing spreadsheet-led approvals.",
        opportunityAngle: "Test whether Acme can shorten the evaluation path for Japanese operations teams.",
        japanGap: "The checked pages do not yet explain a Japanese evaluation path.",
        whyNow: "The public offer is concrete enough to test without assuming demand.",
      },
    },
    reportUrl: "https://paradigmjp.com/en/work-report/token",
    sourceUrl: "https://acme.com/",
  })
}

describe("manual Japan Entry diagnostic report", () => {
  it("uses observed ecommerce gaps without inventing traffic, revenue, or loss", async () => {
    const report = await reportFor("ecommerce")
    expect(report.schemaVersion).toBe("manual_japan_entry_strategy_v4")
    expect(report.reportKind).toBe("customer_japan_entry_opportunity_report")
    expect(report.customerView).toMatchObject({
      title: "Japan Entry Strategy Report",
      opportunityHypothesis: {
        targetSegment: "Japanese operations teams replacing spreadsheet-led approvals.",
      },
    })
    expect(report.customerView.observedSignals).toContain("Acme documents a workflow product for distributed small-business teams.")
    expect(report.customerView.evidenceSources).toContainEqual({ label: "Company homepage", url: "https://acme.com/" })
    expect(report.customerView.strategyChapters).toHaveLength(10)
    expect(report.customerView.strategyChapters.map((chapter) => chapter.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(report.customerView.reportWordCount).toBeGreaterThanOrEqual(1_200)
    expect(JSON.stringify(report)).not.toMatch(/modeled first-year Japan opportunity|monthly revenue opportunity gap/i)
    expect(report.provenance).toMatchObject({
      evidenceContract: "public-pages-only",
      legacyTemplateUsed: false,
      automaticSendAllowed: false,
    })
    expect(report.market).toMatchObject({
      priority: "regional_core",
      pricingPolicy: "no_automatic_country_adjustment",
    })
    expect(JSON.stringify(report.market.commercialSignals)).toMatch(/Customers in 30 countries|Backed by Example Ventures/)
    expect(report.sourceCoverage).toMatchObject({ score: 100, collected: 5, missing: 0 })
    expect(report.outreach).toMatchObject({ purpose: "initial_interest", qualityPassed: true, neverSent: true })
    expect(report).not.toHaveProperty("content_template")
    expect(report).not.toHaveProperty("acts")
    expect(report).not.toHaveProperty("total_loss")
  })

  it("never applies ecommerce-only gaps to a SaaS company", async () => {
    const report = await reportFor("saas")
    const rendered = JSON.stringify(report.japanReadiness.gaps)
    expect(rendered).toMatch(/Japanese-language customer path/)
    expect(rendered).toMatch(/JPY pricing/)
    expect(rendered).not.toMatch(/Japan delivery terms|Japan-specific delivery|Japan-local payment|PayPay|Paidy|konbini|commerce disclosure|Tokushoho/i)
  })

  it("limits service-company findings to the language customer path", async () => {
    const report = await reportFor("service")
    const rendered = JSON.stringify(report.japanReadiness.gaps)
    expect(rendered).toMatch(/Japanese-language customer path/)
    expect(rendered).not.toMatch(/JPY pricing|Japan delivery terms|Japan-specific delivery|Japan-local payment|commerce disclosure|Tokushoho/i)
  })

  it("keeps internal angle enums and raw crawl dumps out of the customer view", () => {
    const report = buildManualJapanEntryReport({
      profile: {
        ...profile("saas"),
        productContext: "Acme provides workflow automation. | Acme provides workflow automation. | A second public capability supports approval routing. | Unrelated navigation text that should not be repeated across the report.",
      },
      audit: { ...audit, pages_checked: ["https://www.acme.com/"] },
      form: {
        formUrl: "https://acme.com/contact",
        method: "crawl4ai",
        verification: "form",
        confidence: 94,
        inspection: { status: "form", reason: "verified_contact_fields", fields: ["email", "message", "submit"], formCount: 1, action: "https://acme.com/contact", sameOrigin: true, trustedProvider: false },
        candidates: [],
        traceMs: 10,
      },
      initialMessage: "A reviewable permission-based first touch",
      messageReview: { passed: true, score: 96, strategy: { opportunityAngle: "problem", japaneseSegment: "Unverified" } },
      reportUrl: "https://paradigmjp.com/en/work-report/token",
      sourceUrl: "https://acme.com/",
    })

    expect(report.customerView.opportunityHypothesis.headline).toBe("Validate a focused Japanese customer path for Acme")
    expect(report.customerView.opportunityHypothesis.targetSegment).not.toBe("Unverified")
    expect(report.customerView.productSnapshot).not.toContain("|")
    expect(report.customerView.evidenceSources.filter((source) => new URL(source.url).pathname === "/")).toHaveLength(1)
  })

  it("never exposes a page-only contact candidate as a form link", () => {
    const report = buildManualJapanEntryReport({
      profile: profile("saas"),
      audit,
      form: {
        formUrl: "https://screenshottocode.com/contact",
        method: "llm",
        verification: "page",
        confidence: 70,
        inspection: { status: "page", reason: "contact_page_only", fields: [], formCount: 0, action: null, sameOrigin: false, trustedProvider: false },
        candidates: ["https://screenshottocode.com/contact"],
        traceMs: 10,
      },
      initialMessage: "A reviewable permission-based first touch",
      messageReview: { passed: true, score: 96 },
      reportUrl: "https://paradigmjp.com/en/work-report/token",
      sourceUrl: "https://screenshottocode.com/",
    })

    expect(report.contactRoute).toMatchObject({ url: null, status: "missing" })
    expect(report.sourceCoverage.items.find((item) => item.slug === "verified-contact-form")?.status).toBe("missing")
  })
})
