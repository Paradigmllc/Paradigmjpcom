import { describe, expect, it } from "vitest"
import { listLeadSyncDriftReasons, listLeadTwentyPayload, listLeadTwentyReadbackIssues } from "./twenty-sync-list-lead"

describe("listLeadTwentyPayload", () => {
  it("projects only reviewed list evidence and clears legacy report pipeline fields", () => {
    const payload = listLeadTwentyPayload({
      id: "company-1",
      company_name: "Example Store",
      domain: "example.myshopify.com",
      target_country: "CA",
      source: "multi_source_domains",
      tech_stack: { detections: [{ name: "Shopify" }, { name: "Shopify" }] },
      meta: {
        contact_form_url: "https://example.myshopify.com/pages/contact",
        lead_candidate: { score: { opportunityScore: 75, smbScore: 58 } },
      },
    })

    expect(payload).toMatchObject({
      paradigmCountryName: "カナダ",
      paradigmSourceName: "codex_verification",
      paradigmTechnology: "Shopify",
      paradigmOpportunityScore: 75,
      paradigmSmbScore: 58,
      paradigmLeadStatus: "フォーム確認済み / Twenty登録済み / 未送信",
      paradigmSalesStatus: null,
      paradigmDataStatus: null,
      paradigmReportUrl: { primaryLinkLabel: "", primaryLinkUrl: "" },
    })
    expect(payload.paradigmKarteSummary).toEqual(expect.objectContaining({
      markdown: expect.stringContaining("レポート・文面・Opportunity・送信は未生成"),
    }))
  })

  it("stores the approved initial message as a human-review-only Twenty summary", () => {
    const payload = listLeadTwentyPayload({
      id: "company-2",
      company_name: "Example Store",
      domain: "example.com",
      target_country: "US",
      source: "multi_source_domains",
      tech_stack: { detections: [{ name: "Shopify" }] },
      meta: {
        contact_form_url: "https://example.com/contact",
        lead_candidate: { score: { opportunityScore: 81, smbScore: 72 } },
        initial_form_draft: {
          state: "needs_review",
          sent: false,
          message: "Hello from the approved evidence-backed draft.",
          review: { score: 94, safetyScore: 100 },
        },
      },
    })

    expect(payload).toMatchObject({
      paradigmLeadStatus: "初回文面生成済み / 要レビュー / 未送信",
      paradigmNextAction: "初回フォーム文面を人間確認（未送信）",
      paradigmReportUrl: { primaryLinkLabel: "", primaryLinkUrl: "" },
      paradigmSalesMaterialUrl: { primaryLinkLabel: "", primaryLinkUrl: "" },
    })
    expect(payload.paradigmKarteSummary).toEqual(expect.objectContaining({
      markdown: expect.stringContaining("Hello from the approved evidence-backed draft."),
    }))
    expect(JSON.stringify(payload)).not.toContain("https://paradigmjp.com")
  })

  it("detects missing Twenty linkage and legacy report summaries", () => {
    const company = {
      id: "company-3",
      company_name: "Legacy Store",
      domain: "legacy.example",
      target_country: "US",
      source: "multi_source_domains",
      tech_stack: { detections: [{ name: "Shopify" }] },
      report_url: null,
      pipeline_status: "pending",
      meta: {
        list_only: true,
        skip_enrichment: true,
        contact_form_url: "https://legacy.example/contact",
        lead_candidate: { score: { opportunityScore: 75, smbScore: 58 } },
        twenty: { summary: "Report URL: https://paradigmjp.com/en/report/legacy" },
      },
    }

    expect(listLeadSyncDriftReasons(company)).toEqual(expect.arrayContaining([
      "twenty_id_missing",
      "twenty_summary_drift",
    ]))
  })

  it("keeps current list-only evidence stable after legacy tech_stack rows were cleared", () => {
    const meta = {
      list_only: true,
      skip_enrichment: true,
      contact_form_url: "https://example.com/contact",
      lead_candidate: {
        score: {
          opportunityScore: 80,
          smbScore: 90,
          details: { detectedTechnologies: ["shopify", "google-analytics"] },
        },
      },
    }
    const company = {
      id: "company-current",
      company_name: "Current Store",
      domain: "example.com",
      target_country: "US",
      source: "evidence_first_sources",
      tech_stack: null,
      report_url: null,
      pipeline_status: "pending",
      meta,
    }
    const summary = (listLeadTwentyPayload(company).paradigmKarteSummary as { markdown: string }).markdown

    expect(summary).toContain("技術: Shopify, Google Analytics")
    expect(listLeadSyncDriftReasons({
      ...company,
      meta: { ...meta, twenty: { id: "twenty-current", summary } },
    })).toEqual([])
  })

  it("fails read-back when Twenty omits the country or keeps a legacy report URL", () => {
    const payload = listLeadTwentyPayload({
      id: "company-readback",
      company_name: "Example Store",
      domain: "example.com",
      target_country: "US",
      source: "evidence_first_sources",
      tech_stack: { detections: [{ name: "Shopify" }] },
      meta: {
        contact_form_url: "https://example.com/contact",
        lead_candidate: { score: { opportunityScore: 80, smbScore: 90 } },
      },
    })
    const summary = payload.paradigmKarteSummary as { markdown: string }

    expect(listLeadTwentyReadbackIssues({
      id: "twenty-1",
      paradigmCountryName: null,
      paradigmFormUrl: { primaryLinkUrl: "https://example.com/contact" },
      paradigmLeadStatus: payload.paradigmLeadStatus as string,
      paradigmNextAction: payload.paradigmNextAction as string,
      paradigmKarteSummary: summary,
      paradigmReportUrl: { primaryLinkUrl: "https://paradigmjp.com/en/report/legacy" },
      paradigmSalesMaterialUrl: { primaryLinkUrl: "" },
      paradigmDemoUrl: { primaryLinkUrl: "" },
    }, "twenty-1", payload)).toEqual(["country_mismatch", "legacy_report_url"])
  })

  it("accepts a complete current Twenty read-back", () => {
    const payload = listLeadTwentyPayload({
      id: "company-readback-ok",
      company_name: "Example Store",
      domain: "example.com",
      target_country: "US",
      source: "evidence_first_sources",
      tech_stack: null,
      meta: {
        contact_form_url: "https://example.com/contact",
        lead_candidate: { score: { opportunityScore: 80, smbScore: 90 } },
      },
    })

    expect(listLeadTwentyReadbackIssues({
      id: "twenty-2",
      paradigmCountryName: payload.paradigmCountryName as string,
      paradigmFormUrl: payload.paradigmFormUrl as { primaryLinkUrl: string },
      paradigmLeadStatus: payload.paradigmLeadStatus as string,
      paradigmNextAction: payload.paradigmNextAction as string,
      paradigmKarteSummary: payload.paradigmKarteSummary as { markdown: string },
      paradigmReportUrl: { primaryLinkUrl: "" },
      paradigmSalesMaterialUrl: { primaryLinkUrl: "" },
      paradigmDemoUrl: { primaryLinkUrl: "" },
    }, "twenty-2", payload)).toEqual([])
  })
})
