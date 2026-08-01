import { describe, expect, it } from "vitest"
import { buildExternalStudioPayload } from "./external-studio-sync"
import type { CompanyKarteSnapshot } from "./company-karte"

describe("buildExternalStudioPayload", () => {
  it("keeps report, product, and delivery fields for external studio sync", () => {
    const karte: CompanyKarteSnapshot = {
      companyId: "11111111-1111-4111-8111-111111111111",
      companyName: "Paradigm Demo",
      domain: "example.com",
      region: "global",
      industry: "consulting",
      regionName: "Tokyo",
      sourceName: "csv",
      pipelineStatus: "report_ready",
      dealStage: "提案中",
      reportLocale: "ja",
      targetCountry: "JP",
      templateVariant: "japan_entry",
      reportUrl: "https://paradigmjp.com/ja/report/example",
      opportunityBriefUrl: "https://paradigmjp.com/ja/opportunity/example",
      formUrl: "https://example.com/contact",
      demoUrl: "https://demo.example.com",
      salesMaterialUrl: "https://r2.example.com/deck.pdf",
      customerPortalUrl: null,
      localizedReportUrls: [{ label: "JA", url: "https://paradigmjp.com/ja/report/example" }],
      sourceScore: 82,
      collectedCount: 5,
      configuredCount: 7,
      missingCount: 1,
      errorCount: 0,
      sourceItems: [],
      evidence: [],
      intelligence: { signals: [], painPoints: [], nextActions: [] },
      recommendedProducts: [
        {
          id: "rec_1",
          productId: "prod_1",
          code: "global_jaas",
          displayName: "Japan Entry Package",
          marketScope: "global",
          defaultCurrency: "USD",
          defaultAmountYen: 12000,
          isSubscription: false,
          priority: 100,
          fitScore: 91,
          reason: "Target country and template match.",
          status: "recommended",
          twentyOpportunityId: "opp_1",
        },
      ],
      diagnosisSummary: "Japan entry readiness is incomplete.",
      recommendedOffer: "Japan Entry Package",
      personalizedHook: null,
      personalizedCTA: null,
      generatedAt: "2026-06-05T00:00:00.000Z",
    }

    const payload = buildExternalStudioPayload(karte)

    expect(payload.company_id).toBe(karte.companyId)
    expect(payload.report_url).toBe("https://paradigmjp.com/ja/report/example")
    expect(payload.opportunity_brief_url).toBe("https://paradigmjp.com/ja/opportunity/example")
    expect(payload.template_variant).toBe("japan_entry")
    expect(payload.sales_material_url).toBe("https://r2.example.com/deck.pdf")
    expect(payload.recommended_products).toEqual([
      {
        code: "global_jaas",
        display_name: "Japan Entry Package",
        fit_score: 91,
        default_currency: "USD",
        default_amount_yen: 12000,
        is_subscription: false,
        twenty_opportunity_id: "opp_1",
      },
    ])
  })
})
