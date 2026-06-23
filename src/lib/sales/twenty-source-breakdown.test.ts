import { describe, it, expect } from "vitest"
import type { CompanyKarteSnapshot } from "./company-karte"
import type { SourceCoverageItem } from "./source-coverage"
import {
  sourceCategoryBreakdown,
  sourceCoveragePanelLink,
} from "./twenty-sync-karte-fields"
import {
  karteHomeSummary,
  twentyCompanyHomePayload,
} from "./twenty-sync-summaries"

function item(partial: Partial<SourceCoverageItem>): SourceCoverageItem {
  return {
    slug: partial.slug ?? "x",
    label: partial.label ?? "X",
    category: partial.category ?? "analysis",
    status: partial.status ?? "collected",
    score: partial.score ?? 100,
    detail: partial.detail ?? "",
    meaning: "",
    missingConsequence: "",
    nextStep: "",
  }
}

function karteWith(items: SourceCoverageItem[], companyName = "Acme"): CompanyKarteSnapshot {
  return { sourceItems: items, companyName } as unknown as CompanyKarteSnapshot
}

describe("sourceCategoryBreakdown (Phase 7-1)", () => {
  it("summarizes collected/total per category with error counts", () => {
    const karte = karteWith([
      item({ category: "analysis", status: "collected" }),
      item({ category: "analysis", status: "missing" }),
      item({ category: "analysis", status: "error" }),
      item({ category: "list", status: "collected" }),
      item({ category: "demo", status: "missing" }),
    ])
    const out = sourceCategoryBreakdown(karte)
    expect(out).toContain("analysis 1/3 (err 1)")
    expect(out).toContain("list 1/1")
    expect(out).toContain("demo 0/1")
  })

  it("omits categories with no sources", () => {
    const out = sourceCategoryBreakdown(karteWith([item({ category: "list", status: "collected" })]))
    expect(out).toBe("list 1/1")
    expect(out).not.toContain("video")
  })

  it("returns a no-data marker when there are no source items", () => {
    expect(sourceCategoryBreakdown(karteWith([]))).toBe("no source data")
  })
})

describe("sourceCoveragePanelLink (Phase 7-2)", () => {
  it("builds a panel deep link with the company name query", () => {
    const link = sourceCoveragePanelLink(karteWith([], "Sakura Dining"))
    expect(link).toMatch(/\/ja\/admin\/sales\?q=/)
    expect(link).toContain(encodeURIComponent("Sakura Dining"))
  })
})

describe("twentyCompanyHomePayload", () => {
  it("promotes the 50+ API/OSS breakdown and detail URL to first-class Twenty fields", () => {
    const karte = {
      companyId: "company-1",
      region: "global",
      companyName: "Digitalhumanity",
      domain: "digitalhumanity.co.za",
      reportLocale: "en",
      targetCountry: "ZA",
      templateVariant: "japan_entry",
      reportUrl: "https://paradigmjp.com/en/report/digitalhumanity",
      formUrl: null,
      demoUrl: null,
      salesMaterialUrl: null,
      customerPortalUrl: null,
      industry: "IT",
      regionName: null,
      sourceName: "twenty",
      pipelineStatus: "report_ready",
      dealStage: "未対応",
      localizedReportUrls: [],
      sourceScore: 42,
      collectedCount: 2,
      configuredCount: 1,
      missingCount: 1,
      errorCount: 1,
      sourceItems: [
        item({ category: "analysis", status: "collected", label: "Crawl4AI" }),
        item({ category: "analysis", status: "error", label: "Stagehand", detail: "timeout" }),
        item({ category: "list", status: "collected", label: "Twenty" }),
        item({ category: "demo", status: "missing", label: "Astro demo" }),
      ],
      evidence: [],
      intelligence: { signals: [], painPoints: [], nextActions: [] },
      diagnosisSummary: null,
      recommendedOffer: null,
      personalizedHook: null,
      personalizedCTA: null,
      recommendedProducts: [],
      generatedAt: "2026-06-23T00:00:00.000Z",
    } satisfies CompanyKarteSnapshot

    const payload = twentyCompanyHomePayload(karte)
    expect(payload.paradigmSourceCoverage).toBe(42)
    expect(payload.paradigmDataBreakdown).toContain("analysis 1/2 (err 1)")
    expect(payload.paradigmSourceDetailsUrl).toEqual({
      primaryLinkLabel: "50+ API/OSS詳細",
      primaryLinkUrl: expect.stringContaining("/ja/admin/sales?q=Digitalhumanity"),
    })
    expect(karteHomeSummary(karte)).toContain("無料API/OSS取得データ(50+)")
  })
})
