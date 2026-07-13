import { describe, expect, it } from "vitest"
import { buildCompanyKarte } from "./company-karte"
import { DEAL_STAGES, type SalesCompany } from "./types"

const fixtureCompany: SalesCompany = {
  id: "00000000-0000-0000-0000-000000000001",
  region: "global",
  slug: "acme-123",
  name_key: "acme",
  report_locale: "en",
  target_country: "US",
  template_variant: "japan_entry",
  domain: "acme.example",
  company_name: "Acme",
  industry: null,
  prefecture: null,
  pipeline_status: "report_ready",
  deal_stage: DEAL_STAGES[0],
  pagespeed_mobile: 42,
  pagespeed_desktop: 88,
  detected_issues: [],
  report_views: 0,
  is_hot_lead: false,
  send_result: null,
  sent_at: null,
  report_url: "https://paradigmjp.com/en/report/acme-123",
  follow_up_date: null,
  memo: null,
  assigned_to: null,
  source: "test",
  tech_stack: null,
  pain_diagnosis: null,
  dify_result: null,
  japan_market_audit: null,
  demo_site: null,
  visual_evidence: null,
  report_generated_at: null,
  meta: {
    contact_form_url: "https://acme.example/contact",
    pain_diagnosis: {
      primaryPain: "Mobile speed is below benchmark",
      recommendedOffer: "Japan entry diagnostic",
    },
    tech: {
      stack: ["Next.js", "Vercel"],
    },
    demo_site: {
      url: "https://paradigmjp.com/en/d/acme-123-demo",
    },
  },
  created_at: "2026-05-29T00:00:00.000Z",
  updated_at: "2026-05-29T00:00:00.000Z",
}

describe("buildCompanyKarte", () => {
  it("keeps i18n report URLs separated by locale and exposes key sales URLs", () => {
    const karte = buildCompanyKarte(fixtureCompany, [
      {
        source_slug: "pagespeed",
        category: "analysis",
        status: "collected",
        score: 100,
        details: { label: "PageSpeed Insights", detail: "Core Web Vitals" },
        measured_at: "2026-05-29T00:00:00.000Z",
      },
    ])

    expect(karte.reportLocale).toBe("en")
    expect(karte.targetCountry).toBe("US")
    expect(karte.formUrl).toBe("https://acme.example/contact")
    expect(karte.reportUrl).toBe("https://paradigmjp.com/en/report/acme-123")
    expect(karte.demoUrl).toBe("https://paradigmjp.com/en/d/acme-123-demo")
    expect(karte.localizedReportUrls.map((link) => link.url)).toContain(
      "https://paradigmjp.com/ja/report/acme-123",
    )
    expect(karte.localizedReportUrls.map((link) => link.url)).toContain(
      "https://paradigmjp.com/en/report/acme-123",
    )
    expect(karte.sourceItems[0]?.label).toBe("PageSpeed Insights")
  })

  it("uses normalized enrichment columns when legacy meta mirrors are absent", () => {
    const karte = buildCompanyKarte({
      ...fixtureCompany,
      pain_diagnosis: {
        primaryPain: "Japan buyers cannot find trust signals",
        recommendedOffer: "Japan-entry landing page",
      },
      tech_stack: {
        stack: ["Astro", "Payload"],
      },
      demo_site: {
        url: "https://paradigmjp.com/en/d/acme-normalized-demo",
      },
      meta: {},
    }, [])

    expect(karte.diagnosisSummary).toBe("Japan buyers cannot find trust signals")
    expect(karte.recommendedOffer).toBe("Japan-entry landing page")
    expect(karte.demoUrl).toBe("https://paradigmjp.com/en/d/acme-normalized-demo")
    expect(karte.evidence.map((item) => item.label)).toContain("技術スタック")
  })

  it("hydrates the reviewed Japan Entry draft and 6/12/24 month model from company meta", () => {
    const message = "Hello Acme team,\n\nWe found a Japan-specific checkout gap.\n\nWould a 15-minute review be useful?"
    const karte = buildCompanyKarte({
      ...fixtureCompany,
      meta: {
        ...fixtureCompany.meta,
        japan_entry_initial_message: message,
        japan_entry_outreach_state: "needs_review",
        japan_entry_projection: {
          classification: "modeled-estimate",
          generatedAt: "2026-07-13T00:00:00.000Z",
          monthlyOpportunityGapUsd: 10_296,
          markets: [{ code: "JP", estimatedMonthlyVisits: 1_950 }],
          scenarios: [{
            scenario: "base",
            horizons: [
              { horizon: 6, roiPercent: -12.5, cumulativeNetBenefitUsd: -1_500 },
              { horizon: 12, roiPercent: 42.1, cumulativeNetBenefitUsd: 5_052 },
              { horizon: 24, roiPercent: 164.8, cumulativeNetBenefitUsd: 19_776 },
            ],
          }],
        },
        japan_entry_message_review: {
          model: "deepseek-v4-pro",
          qualityScore: 95,
          safetyScore: 100,
          generatedAt: "2026-07-13T00:00:00.000Z",
        },
      },
    }, [])

    expect(karte.japanEntry).toEqual({
      state: "needs_review",
      message,
      classification: "modeled-estimate",
      estimatedJapanMonthlyVisits: 1_950,
      monthlyOpportunityGapUsd: 10_296,
      qualityScore: 95,
      safetyScore: 100,
      model: "deepseek-v4-pro",
      generatedAt: "2026-07-13T00:00:00.000Z",
      horizons: [
        { month: 6, roiPercent: -12.5, cumulativeNetBenefitUsd: -1_500 },
        { month: 12, roiPercent: 42.1, cumulativeNetBenefitUsd: 5_052 },
        { month: 24, roiPercent: 164.8, cumulativeNetBenefitUsd: 19_776 },
      ],
    })
  })
})
