import { describe, expect, it } from "vitest"
import { listLeadTwentyPayload } from "./twenty-sync-list-lead"

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
})
