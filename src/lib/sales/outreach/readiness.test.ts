import { describe, expect, it } from "vitest"
import { evaluateOutreachReadiness, reportUrlForCompany } from "./readiness"
import type { SalesCompany } from "../types"

function company(overrides: Partial<SalesCompany> = {}): SalesCompany {
  return {
    id: "company-1",
    region: "global",
    slug: "example",
    name_key: null,
    report_locale: "en",
    target_country: "US",
    template_variant: "website_diagnostic",
    domain: "example.com",
    company_name: "Example Inc",
    industry: "consulting",
    prefecture: null,
    pipeline_status: "report_ready",
    deal_stage: "未対応",
    pagespeed_mobile: 70,
    pagespeed_desktop: 80,
    detected_issues: ["no_ogp"],
    report_views: 0,
    is_hot_lead: false,
    send_result: null,
    sent_at: null,
    report_url: null,
    follow_up_date: null,
    memo: null,
    assigned_to: null,
    source: "twenty",
    tech_stack: null,
    pain_diagnosis: null,
    dify_result: null,
    japan_market_audit: null,
    demo_site: null,
    visual_evidence: null,
    report_generated_at: null,
    meta: { contact_form_url: "https://example.com/contact" },
    created_at: "2026-06-18T00:00:00.000Z",
    updated_at: "2026-06-18T00:00:00.000Z",
    ...overrides,
  }
}

describe("outreach readiness", () => {
  it("does not fall back to the site root when report URL and slug are missing", () => {
    const result = reportUrlForCompany(company({ slug: null, report_url: null }))

    expect(result).toBeNull()
  })

  it("blocks outreach when no diagnostic report URL can be resolved", () => {
    const readiness = evaluateOutreachReadiness(company({ slug: null, report_url: null }))

    expect(readiness.status).toBe("blocked")
    expect(readiness.blockers).toContain("診断レポートURLが未生成です")
  })

  it("requires review when normalized diagnosis data is incomplete", () => {
    const readiness = evaluateOutreachReadiness(company({ industry: null, detected_issues: [] }))

    expect(readiness.status).toBe("review_required")
    expect(readiness.warnings).toContain("業種が未正規化です")
    expect(readiness.warnings).toContain("診断課題が未確定です")
  })
})
