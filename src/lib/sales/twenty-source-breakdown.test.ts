import { describe, it, expect } from "vitest"
import type { CompanyKarteSnapshot } from "./company-karte"
import type { SourceCoverageItem } from "./source-coverage"
import {
  sourceCategoryBreakdown,
  sourceCoveragePanelLink,
} from "./twenty-sync-karte-fields"

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
