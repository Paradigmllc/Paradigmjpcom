import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import ManualJapanEntryReport from "./ManualJapanEntryReport"
import { buildManualJapanEntryReport } from "@/lib/sales/manual-japan-entry-report"

describe("ManualJapanEntryReport", () => {
  it("renders a customer-facing ten-chapter strategy report without internal operator content", () => {
    const report = buildManualJapanEntryReport({
      profile: {
        companyName: "Acme Software",
        countryCode: "PL",
        isJapaneseCompany: false,
        smbStatus: "qualified",
        smbConfidence: 91,
        smbEvidence: ["Public product evidence"],
        japanEntryFitStatus: "qualified",
        japanEntryFitConfidence: 87,
        japanEntryFitEvidence: ["Online-delivered product"],
        businessModel: "saas",
        industry: "Technology / IT",
        productContext: "Acme Software provides a public B2B workflow automation platform.",
        observedFacts: ["B2B workflow automation platform"],
        outreachPlaybook: "general_online_smb",
        positioningConcept: null,
        commercialSignals: [],
      },
      audit: {
        engine: "local_heuristic",
        generated_at: "2026-07-19T00:00:00.000Z",
        score: 70,
        status: {
          tokushoho_missing: true,
          appi_missing: true,
          local_payments_missing: true,
          japanese_language_missing: true,
          jpy_currency_missing: true,
          japan_shipping_missing: true,
        },
        signals: { tokushoho: [], appi: [], local_payments: [], japanese_language: [], jpy_currency: [], japan_shipping: [] },
        pages_checked: ["https://acme.example/"],
        sales_pitch_context: "Bounded public-page gaps",
        human_review_required: true,
        legal_disclaimer: "Not legal advice.",
      },
      form: {
        formUrl: "https://acme.example/contact",
        method: "crawl4ai",
        verification: "form",
        confidence: 95,
        inspection: null,
        candidates: [],
        traceMs: 25,
      },
      initialMessage: "A grounded and human-reviewed initial-interest draft.",
      messageReview: {
        passed: true,
        score: 96,
        uniquenessScore: 93,
        message_variant: "estimate_off_price_off",
        message_angle: "problem",
        strategy: {
          primaryObservation: "Acme Software documents workflow automation for distributed operations teams.",
          japaneseSegment: "Japanese operations teams replacing spreadsheet approvals.",
          opportunityAngle: "Validate a Japanese evaluation path for Acme workflow automation.",
          japanGap: "The checked pages do not explain a Japanese evaluation path.",
          whyNow: "The workflow proposition is specific enough for a bounded buyer test.",
        },
      },
      reportUrl: "https://paradigmjp.com/en/work-report/11111111-1111-4111-8111-111111111111",
      sourceUrl: "https://acme.example/",
    })
    const html = renderToStaticMarkup(<ManualJapanEntryReport data={report} />)

    expect(html).toContain("Japan Entry Strategy Report")
    expect(html).toContain("Ten decision chapters")
    expect(html).toContain("Executive perspective")
    expect(html).toContain("Japanese operations teams replacing spreadsheet approvals.")
    expect(html).toContain("Priority moves before a broader launch")
    expect(html).toContain("Public pages reviewed")
    expect(html).toContain("acme.example")
    expect(html).toContain("Paradigm LLC")
    expect(html).toContain("manual_japan_entry_strategy_v4")
    expect(html).toContain("Executive decision and investment thesis")
    expect(html).toContain("Risk register, recommendation, and next engagement")
    expect(html).not.toContain("Private evidence brief")
    expect(html).not.toContain("Manual Japan Entry Workbench")
    expect(html).not.toContain("Operator next actions")
    expect(html).not.toContain("Never sent automatically")
    expect(html).not.toContain("Human-reviewed first touch")
    expect(html).not.toContain("A grounded and human-reviewed initial-interest draft.")
    expect(html).not.toContain("restaurant | Japan market entry")
    expect(html).not.toContain("opportunity loss")
  })
})
