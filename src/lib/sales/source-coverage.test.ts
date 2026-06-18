import { describe, expect, it } from "vitest"
import { computeSourceCoverage } from "./source-coverage"
import type { SalesCompany } from "./types"

function companyWithMeta(meta: Record<string, unknown>): SalesCompany {
  return {
    id: "company-1",
    company_name: "Example Co",
    domain: "example.com",
    region: "global",
    pipeline_status: "pending",
    deal_stage: "uncontacted",
    report_url: null,
    report_locale: "en",
    target_country: "US",
    template_variant: "website_diagnostic",
    industry: null,
    prefecture: null,
    pagespeed_mobile: null,
    pagespeed_desktop: null,
    detected_issues: [],
    source: "test",
    meta,
    created_at: "2026-06-18T00:00:00.000Z",
    updated_at: "2026-06-18T00:00:00.000Z",
  } as unknown as SalesCompany
}

describe("computeSourceCoverage", () => {
  it("marks source-level enrichment failures as error instead of plain missing", () => {
    const coverage = computeSourceCoverage(companyWithMeta({
      sales_os: {
        source_quality: {
          form_discovery: {
            failed: 1,
            timeout: 0,
            lastError: "HTTP 500",
          },
        },
      },
    }))

    const formDiscovery = coverage.items.find((item) => item.slug === "crawl4ai")

    expect(formDiscovery?.status).toBe("error")
    expect(formDiscovery?.detail).toContain("HTTP 500")
  })
})
