import { describe, expect, it } from "vitest"
import { buildSourceAcquisitionSummary, extractTechStackFromMeta, normalizeTechnologySlug } from "./source-acquisition"

describe("source acquisition metrics", () => {
  it("normalizes technology names into stable slugs", () => {
    expect(normalizeTechnologySlug("Next.js")).toBe("next-js")
    expect(normalizeTechnologySlug("Google Tag Manager")).toBe("google-tag-manager")
    expect(normalizeTechnologySlug("")).toBe("unknown")
  })

  it("extracts Wappalyzer stack items from company meta", () => {
    const result = extractTechStackFromMeta({
      tech: {
        server: "cloudflare",
        stack: [
          { name: "WordPress", category: "CMS", confidence: 92, evidence: ["html"] },
          { name: 123, category: "bad" },
        ],
      },
    })

    expect(result.server).toBe("cloudflare")
    expect(result.tech).toHaveLength(1)
    expect(result.tech[0]?.name).toBe("WordPress")
  })

  it("summarizes source success rate and top technologies", () => {
    const summary = buildSourceAcquisitionSummary(
      [
        {
          company_id: "c1",
          source_slug: "wappalyzer",
          category: "analysis",
          status: "collected",
          score: 100,
          measured_at: "2026-06-01T00:00:00.000Z",
          details: { label: "Wappalyzer CLI" },
        },
        {
          company_id: "c1",
          source_slug: "pagespeed",
          category: "analysis",
          status: "missing",
          score: 0,
          measured_at: "2026-06-01T00:00:00.000Z",
          details: { label: "PageSpeed Insights" },
        },
      ],
      [
        {
          company_id: "c1",
          technology_name: "Next.js",
          technology_slug: "next-js",
          category: "Framework",
          confidence: 92,
          detected_at: "2026-06-01T00:00:00.000Z",
        },
        {
          company_id: "c2",
          technology_name: "Next.js",
          technology_slug: "next-js",
          category: "Framework",
          confidence: 88,
          detected_at: "2026-06-02T00:00:00.000Z",
        },
      ],
    )

    expect(summary.totalRuns).toBe(2)
    expect(summary.sourceTypes).toBe(2)
    expect(summary.successRate).toBe(50)
    expect(summary.topTechnologies[0]).toMatchObject({
      technologySlug: "next-js",
      companyCount: 2,
      detections: 2,
      averageConfidence: 90,
    })
  })
})
