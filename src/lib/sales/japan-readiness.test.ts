import { describe, expect, it } from "vitest"
import { __japanReadinessTest } from "./japan-readiness"
import type { SalesCompany } from "./types"

function company(meta: Record<string, unknown>): SalesCompany {
  return {
    id: "company-1",
    region: "global",
    slug: "demo",
    name_key: "demo",
    report_locale: "en",
    target_country: "US",
    template_variant: "japan_entry",
    domain: "demo.example",
    company_name: "Demo Store",
    industry: "retail",
    prefecture: null,
    pipeline_status: "pending",
    deal_stage: "未対応",
    pagespeed_mobile: null,
    pagespeed_desktop: null,
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
    created_at: "2026-06-02T00:00:00.000Z",
    updated_at: "2026-06-02T00:00:00.000Z",
  }
}

describe("japan readiness scoring", () => {
  it("turns traffic, Shopify, and public-page gaps into a high-priority human-reviewed insight", () => {
    const insight = __japanReadinessTest.buildLocalInsight(
      company({
        dataforseo: {
          monthly_visits: 300000,
          traffic: { country_distribution: { JP: 0.005 } },
          source_url: "https://dataforseo.com/verified-report/demo",
        },
        tech: { stack: [{ name: "Shopify" }, { name: "Stripe" }, { name: "Klaviyo" }] },
      }),
      {
        engine: "local_heuristic",
        generated_at: "2026-06-02T00:00:00.000Z",
        score: 10,
        status: { tokushoho_missing: true, appi_missing: true, local_payments_missing: true },
        signals: { tokushoho: [], appi: [], local_payments: [] },
        pages_checked: ["https://demo.example/"],
        sales_pitch_context: "missing public readiness signals",
        human_review_required: true,
        legal_disclaimer: "sales hypothesis only",
      },
      { ok: true, productCount: 50, averagePrice: 80, sampledAt: "2026-06-02T00:00:00.000Z" },
    )

    expect(insight.priority).toBe("high")
    expect(insight.status).toBe("manual_review")
    expect(insight.estimates.japanVisits).toBe(1500)
    expect(insight.estimates.lossMinUsd).toBeNull()
    expect(insight.manualReviewFlags).toContain("legal_payment_claim_requires_review")
    expect(insight.manualReviewFlags).toContain("revenue_and_loss_not_publicly_observable")
    expect(insight.body).toContain("review hypothesis")
    expect(insight.subject).toContain("Japan opportunity memo")
    expect(insight.body).toContain("three-page Japan Opportunity Memo")
    expect(insight.body).toContain("May I send the memo")
  })

  it("keeps missing traffic as explicit evidence instead of inventing numbers", () => {
    const insight = __japanReadinessTest.buildLocalInsight(
      company({ tech: { stack: [{ name: "Next.js" }] } }),
      null,
      null,
    )

    expect(insight.estimates.monthlyVisits).toBeNull()
    expect(insight.estimates.lossMinUsd).toBeNull()
    expect(insight.manualReviewFlags).toContain("traffic_estimate_missing")
    expect(insight.evidence.find((item) => item.id === "monthly-visits")?.value).toBe("unknown")
  })
})
