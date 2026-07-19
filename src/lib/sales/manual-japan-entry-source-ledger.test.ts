import { describe, expect, it } from "vitest"
import { buildManualSourceLedgers, type ManualLeadSourceCatalogRow } from "./manual-japan-entry-source-ledger"

const source: ManualLeadSourceCatalogRow = {
  slug: "product_hunt",
  name: "Product Hunt",
  tier: "s",
  roles: ["discovery", "intent_trigger"],
  sectors: ["saas_ai_devtools"],
  source_url: "https://www.producthunt.com/",
  access_mode: "directory",
  priority: 11,
  active: true,
  notes: "Recent launches",
}

describe("manual Japan Entry source and qualification ledger", () => {
  it("keeps observed, modeled, and hypothesis evidence separate", () => {
    const result = buildManualSourceLedgers({
      domain: "example.com",
      source,
      sourcePageUrl: "https://www.producthunt.com/products/example",
      sourceDate: "2026-07-16",
      profile: {
        companyName: "Example",
        countryCode: "US",
        isJapaneseCompany: false,
        smbStatus: "qualified",
        smbConfidence: 88,
        smbEvidence: ["Public company evidence"],
        japanEntryFitStatus: "qualified",
        japanEntryFitConfidence: 82,
        japanEntryFitEvidence: ["Public product evidence"],
        businessModel: "saas",
        industry: "Technology / IT",
        productContext: "A public software platform for independent retail teams.",
        observedFacts: ["Public software platform"],
        outreachPlaybook: "saas_ai_devtools",
        positioningConcept: null,
        commercialSignals: [
          { kind: "global_customers", sourcePhrase: "Customers in 30 countries", detail: "Public international customer statement" },
          { kind: "founder_led", sourcePhrase: "Founder-led company", detail: "Public ownership statement" },
        ],
      },
      audit: {
        engine: "local_heuristic",
        generated_at: "2026-07-16T00:00:00.000Z",
        score: 45,
        status: { tokushoho_missing: true, appi_missing: true, local_payments_missing: true, japanese_language_missing: true, jpy_currency_missing: true, japan_shipping_missing: true },
        signals: { tokushoho: [], appi: [], local_payments: [], japanese_language: [], jpy_currency: [], japan_shipping: [] },
        pages_checked: ["https://example.com/"],
        sales_pitch_context: "Observed page facts",
        human_review_required: true,
        legal_disclaimer: "Not legal advice",
      },
      form: {
        formUrl: "https://example.com/contact",
        method: "dom",
        verification: "form",
        confidence: 94,
        inspection: { status: "form", reason: "verified_contact_fields", fields: ["name", "email", "message", "submit"], formCount: 1, action: "https://example.com/contact", sameOrigin: true, trustedProvider: false },
        candidates: [],
        traceMs: 10,
      },
      projection: null,
    })

    expect(result.qualification.discovery.status).toBe("verified")
    expect(result.qualification.intent_trigger).toMatchObject({ status: "pending" })
    expect(result.qualification.commercial_proof).toMatchObject({ status: "pending" })
    expect(result.qualification.japan_fit.status).toBe("verified")
    expect(result.qualification.legal_verification.status).toBe("pending")
    expect(result.qualification.contact_route.status).toBe("verified")
    expect(result.master.source_url).toBe("https://www.producthunt.com/products/example")
    expect(result.master.legal_entity).toBeNull()
    expect(result.master.japan_category_demand).toBeNull()
    expect(result.master.evidence_classes.observed).toContain("Public software platform")
    expect(result.master.evidence_classes.observed).toContain("Customers in 30 countries")
    expect(result.master.founder_led).toBe(true)
    expect(result.master.revenue_signal).toBeNull()
    expect(result.qualification.commercial_proof.evidence[0]).toContain("Customers in 30 countries")
    expect(result.master.evidence_classes.modeled).toEqual([])
    expect(result.master.evidence_classes.hypothesis[0]).toContain("require separate verification")
  })

  it("keeps an unverified contact-page candidate out of the master ledger", () => {
    const result = buildManualSourceLedgers({
      domain: "screenshottocode.com",
      source,
      sourcePageUrl: null,
      sourceDate: "2026-07-20",
      profile: {
        companyName: "Screenshot to Code",
        countryCode: "US",
        isJapaneseCompany: false,
        smbStatus: "review_required",
        smbConfidence: 60,
        smbEvidence: [],
        japanEntryFitStatus: "review_required",
        japanEntryFitConfidence: 60,
        japanEntryFitEvidence: [],
        businessModel: "saas",
        industry: "Technology / IT",
        productContext: "Converts screenshots into code.",
        observedFacts: ["Converts screenshots into code"],
        outreachPlaybook: "saas_ai_devtools",
        positioningConcept: null,
      },
      audit: {
        engine: "local_heuristic",
        generated_at: "2026-07-20T00:00:00.000Z",
        score: 0,
        status: { tokushoho_missing: true, appi_missing: true, local_payments_missing: true, japanese_language_missing: true, jpy_currency_missing: true, japan_shipping_missing: true },
        signals: { tokushoho: [], appi: [], local_payments: [], japanese_language: [], jpy_currency: [], japan_shipping: [] },
        pages_checked: ["https://screenshottocode.com/"],
        sales_pitch_context: "Observed page facts",
        human_review_required: true,
        legal_disclaimer: "Not legal advice",
      },
      form: {
        formUrl: "https://screenshottocode.com/contact",
        method: "llm",
        verification: "page",
        confidence: 70,
        inspection: { status: "page", reason: "contact_page_only", fields: [], formCount: 0, action: null, sameOrigin: false, trustedProvider: false },
        candidates: ["https://screenshottocode.com/contact"],
        traceMs: 10,
      },
      projection: null,
    })

    expect(result.qualification.contact_route.status).toBe("pending")
    expect(result.master.contact_form_url).toBeNull()
    expect(result.master.evidence_classes.observed).not.toContain("https://screenshottocode.com/contact")
  })
})
