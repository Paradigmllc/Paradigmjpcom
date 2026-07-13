import { describe, expect, it } from "vitest"
import { selectTemplateCandidates } from "./demo-template-selector"
import type { DiagnosticReportData } from "./diagnostic"

describe("demo template tournament", () => {
  it("returns three distinct, deterministic candidates without a hash override", () => {
    const company = { industry: "retail", company_name: "有限会社青空", report_locale: "ja" }
    const report = { report_locale: "ja", intelligence: { signals: [], painPoints: [], nextActions: [] } } as unknown as DiagnosticReportData
    const first = selectTemplateCandidates(company, report, 3).map((template) => template.id)
    const second = selectTemplateCandidates(company, report, 3).map((template) => template.id)

    expect(first).toHaveLength(3)
    expect(new Set(first).size).toBe(3)
    expect(second).toEqual(first)
    expect(first).toContain("prism")
  })
})
