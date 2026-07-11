import { describe, expect, it } from "vitest"
import { buildVerifiedOutreachContext, formatVerifiedOutreachContext } from "./verified-metrics"
import type { SalesCompany } from "../types"

const company = (meta: Record<string, unknown>): SalesCompany => ({
  id: "company-1",
  region: "global",
  slug: "example",
  name_key: null,
  report_locale: "en",
  target_country: "US",
  template_variant: "website_diagnostic",
  domain: "https://example.com",
  company_name: "Example Inc",
  industry: "consulting",
  prefecture: null,
  pipeline_status: "report_ready",
  deal_stage: "未対応",
  pagespeed_mobile: 48,
  pagespeed_desktop: 82,
  detected_issues: [],
  report_views: 0,
  is_hot_lead: false,
  send_result: null,
  sent_at: null,
  report_url: null,
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
  meta,
  created_at: "2026-07-11T00:00:00.000Z",
  updated_at: "2026-07-11T00:00:00.000Z",
})

describe("buildVerifiedOutreachContext", () => {
  it("derives Japan visits from source-backed traffic values", () => {
    const context = buildVerifiedOutreachContext(company({
      similarweb: {
        monthly_visits: 24800,
        country_shares: { JP: 0.05 },
        source_url: "https://example.com/traffic-report",
        measured_at: "2026-07-10T00:00:00.000Z",
      },
    }))

    expect(context.metrics.find((metric) => metric.id === "monthly-visits")?.value).toBe(24800)
    expect(context.metrics.find((metric) => metric.id === "japan-traffic-share")?.value).toBe(5)
    expect(context.metrics.find((metric) => metric.id === "japan-monthly-visits")?.value).toBe(1240)
    expect(context.metrics.find((metric) => metric.id === "japan-monthly-visits")?.calculation).toContain("monthly visits")
  })

  it("does not treat unlabelled traffic metadata as verified API evidence", () => {
    const context = buildVerifiedOutreachContext(company({ traffic: { monthly_visits: 24800, japan_share_percent: 5 } }))

    expect(context.metrics.some((metric) => metric.id === "japan-monthly-visits")).toBe(false)
    expect(context.unknowns).toContain("Japan monthly visits are unavailable from a verified traffic API")
  })

  it("renders provenance and unknowns for the LLM prompt", () => {
    const context = buildVerifiedOutreachContext(company({
      dataforseo: { monthly_visits: 1000, traffic: { country_distribution: { JP: 0.1 } }, source_url: "https://dataforseo.com" },
    }))

    const rendered = formatVerifiedOutreachContext(context)
    expect(rendered).toContain("source=DataForSEO API")
    expect(rendered).toContain("confidence=")
    expect(rendered).toContain("calculation=monthly visits")
  })
})
