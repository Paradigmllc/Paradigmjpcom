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
      paradigmSourceName: "oss_form_factory",
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
})
