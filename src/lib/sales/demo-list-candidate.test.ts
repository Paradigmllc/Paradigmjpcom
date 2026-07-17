import { describe, expect, it } from "vitest"
import { buildListCandidateVisualManifest, evaluateListCandidateForDemo } from "./demo-list-candidate"
import type { SalesCompany } from "./types"

function company(meta: Record<string, unknown>): SalesCompany {
  return {
    id: "company-1234567890",
    region: "jp",
    slug: "sample-cafe",
    name_key: "sample-cafe",
    domain: "local-sample.no-website.local",
    company_name: "サンプル喫茶",
    industry: "restaurant",
    prefecture: "東京都渋谷区",
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
    source: "portal",
    tech_stack: null,
    pain_diagnosis: null,
    dify_result: null,
    japan_market_audit: null,
    demo_site: null,
    visual_evidence: null,
    report_generated_at: null,
    meta,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

const eligibleMeta = {
  list_only: true,
  skip_enrichment: true,
  portal_listing_url: "https://www.ekiten.jp/shop/sample/",
  portal_snapshot: {
    source: "ekiten",
    listingUrl: "https://www.ekiten.jp/shop/sample/",
    companyName: "サンプル喫茶",
    category: "喫茶店",
    description: "地域に根ざした小さな喫茶店として、落ち着いた時間と飲み物をご案内しています。",
    address: "東京都渋谷区",
    suggestedIndustry: "restaurant",
    status: "ready_for_review",
    smbFit: { eligible: true, enterpriseSignals: [], decisionSignals: ["店主"] },
  },
}

describe("list candidate demo gate", () => {
  it("accepts an eligible reviewed SMB and builds generated assets without portal images", () => {
    const candidate = company(eligibleMeta)
    expect(evaluateListCandidateForDemo(candidate).eligible).toBe(true)
    const manifest = buildListCandidateVisualManifest(candidate)
    expect(manifest.assets).toHaveLength(6)
    expect(manifest.assets.every((asset) => asset.useBasis === "generated" && asset.width === 1600)).toBe(true)
    expect(manifest.assets.every((asset) => asset.sourceUrl.includes("/api/sales/demo-visuals/"))).toBe(true)
    expect(manifest.facts.map((fact) => fact.key)).toEqual(expect.arrayContaining(["business_name", "service", "address"]))
  })

  it("rejects a candidate with an enterprise signal or a website", () => {
    const rejected = company({
      ...eligibleMeta,
      portal_snapshot: {
        ...eligibleMeta.portal_snapshot,
        websiteUrl: "https://example.com",
        status: "has_website",
        smbFit: { eligible: false, enterpriseSignals: ["全国展開"], decisionSignals: [] },
      },
    })
    const result = evaluateListCandidateForDemo(rejected)
    expect(result.eligible).toBe(false)
    expect(result.reasons.join(" ")).toMatch(/独自HP|大企業|SMB/u)
  })
})

