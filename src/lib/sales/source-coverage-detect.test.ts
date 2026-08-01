import { describe, it, expect } from "vitest"
import type { SalesCompany } from "./types"
import { computeSourceCoverage } from "./source-coverage"

// Phase 7-3: guard that enrichment writeback keeping meta source keys results in
// detect() = collected. Regression against the "Twenty shows collected 0/85" symptom.
function companyWithMeta(meta: Record<string, unknown>, extra: Partial<SalesCompany> = {}): SalesCompany {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    domain: "example.com",
    company_name: "Example",
    region: "jp",
    meta,
    pagespeed_mobile: null,
    pagespeed_desktop: null,
    ...extra,
  } as unknown as SalesCompany
}

describe("computeSourceCoverage detection (Phase 7-3)", () => {
  it("marks sources collected when their meta keys are present", () => {
    const company = companyWithMeta(
      {
        scan: { html_title: "Example", html_description: "desc" },
        ssl: { grade: "A" },
        dns: { a: ["1.2.3.4"] },
        robots_sitemap: { robotsTxt: "User-agent: *" },
        mozilla_observatory: { grade: "B" },
      },
      { pagespeed_mobile: 52, pagespeed_desktop: 71 },
    )
    const coverage = computeSourceCoverage(company)
    const collected = new Set(coverage.items.filter((i) => i.status === "collected").map((i) => i.slug))
    expect(collected.has("pagespeed")).toBe(true)
    expect(collected.has("html_metadata")).toBe(true)
    expect(collected.has("ssllabs")).toBe(true)
    expect(collected.has("dns_doh")).toBe(true)
    expect(collected.has("robots_sitemap")).toBe(true)
    expect(collected.has("mozilla_observatory")).toBe(true)
    expect(coverage.collected).toBeGreaterThanOrEqual(6)
  })

  it("marks sources missing when meta has no keys (the 0/85 symptom)", () => {
    const coverage = computeSourceCoverage(companyWithMeta({}))
    expect(coverage.collected).toBe(0)
    expect(coverage.missing).toBeGreaterThan(0)
  })
})
