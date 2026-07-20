import { describe, expect, it } from "vitest"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"
import { resolveManualJapanEntryReportData } from "./manual-japan-entry-report-resolver"

function legacyRow(): ManualJapanEntryWorkRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    report_token: "22222222-2222-4222-8222-222222222222",
    input_url: "https://acme.example",
    canonical_url: "https://acme.example/",
    domain: "acme.example",
    status: "needs_review",
    stage: "complete",
    company_name: "Acme",
    country_code: "PL",
    is_japanese_company: false,
    smb_status: "qualified",
    smb_confidence: 88,
    japan_entry_fit_status: "qualified",
    japan_entry_fit_confidence: 84,
    business_model: "saas",
    industry: "Technology / IT",
    product_context: "Acme provides a documented B2B software product from its public website.",
    profile: {
      companyName: "Acme",
      countryCode: "PL",
      isJapaneseCompany: false,
      smbStatus: "qualified",
      smbConfidence: 88,
      smbEvidence: ["Public product evidence"],
      japanEntryFitStatus: "qualified",
      japanEntryFitConfidence: 84,
      japanEntryFitEvidence: ["Online-delivered product"],
      businessModel: "saas",
      industry: "Technology / IT",
      productContext: "Acme provides a documented B2B software product from its public website.",
      observedFacts: ["Acme provides B2B software"],
      outreachPlaybook: "general_online_smb",
      positioningConcept: null,
      commercialSignals: [],
    },
    evidence: {
      audit: {
        generated_at: "2026-07-18T00:00:00.000Z",
        score: 70,
        status: { japanese_language_missing: true, jpy_currency_missing: true },
        signals: {},
        pages_checked: ["https://acme.example/"],
        legal_disclaimer: "Not legal advice.",
      },
    },
    form_discovery: { method: "crawl4ai", verification: "form", confidence: 95, candidates: [] },
    form_url: "https://acme.example/contact",
    initial_message: "A grounded initial-interest message.",
    message_review: { passed: true, score: 96, purpose: "initial_interest" },
    message_variant_requested: "estimate_off_price_off",
    message_variant: "estimate_off_price_off",
    message_variant_fallback_reason: null,
    message_angle_requested: "problem",
    message_angle: "problem",
    message_angle_fallback_reason: null,
    outreach_playbook: "general_online_smb",
    qualification_ledger: {},
    master_lead_ledger: {},
    source_attributions: [],
    report_data: {
      company_name: "Acme",
      acts: [{ headline: "Old generic report" }],
      content_template: { title: "restaurant | Japan market entry | diagnostic report" },
    },
    report_url: "https://paradigmjp.com/en/work-report/22222222-2222-4222-8222-222222222222",
    twenty_company_id: null,
    twenty_sync_status: "skipped",
    error_message: null,
    attempts: 1,
    sent: false,
    manually_sent_at: null,
    reply_received_at: null,
    founder_forwarded_at: null,
    meeting_converted_at: null,
    created_at: "2026-07-18T00:00:00.000Z",
    updated_at: "2026-07-18T01:00:00.000Z",
  }
}

describe("manual report legacy isolation", () => {
  it("rebuilds legacy rows into the customer V3 contract without carrying old template fields", () => {
    const report = resolveManualJapanEntryReportData(legacyRow())
    expect(report.schemaVersion).toBe("manual_japan_entry_customer_v3")
    expect(report.customerView.title).toBe("Japan Entry Opportunity Report")
    expect(report.provenance).toMatchObject({ legacyTemplateUsed: false, automaticSendAllowed: false })
    expect(report.company).toMatchObject({ name: "Acme", businessModel: "saas" })
    expect(report.outreach).toMatchObject({ purpose: "initial_interest", neverSent: true })
    expect(JSON.stringify(report)).not.toMatch(/restaurant \| Japan market entry|content_template|Old generic report/i)
  })
})
