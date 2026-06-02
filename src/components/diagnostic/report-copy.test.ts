import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { REPORT_COPY } from "./report-copy"

const mojibakePattern = /繝|蜍|譛|縺|邯|荳|逶|螟|諡|蛻|蟇|髢|遯|鬚|蝟|繧|譁ｭ|險|ﾂ/

describe("diagnostic report customer-facing copy", () => {
  it("keeps Japanese executive report copy readable", () => {
    expect(JSON.stringify(REPORT_COPY.ja)).not.toMatch(mojibakePattern)
    expect(REPORT_COPY.ja.privateReport).toContain("経営")
    expect(REPORT_COPY.ja.sourceLedger).toBe("取得データの補足")
  })

  it("does not reintroduce mojibake in report renderers", () => {
    const files = [
      "src/components/diagnostic/report-copy.ts",
      "src/components/diagnostic/AuditConversionSections.tsx",
      "src/components/diagnostic/DiagnosticReport.tsx",
      "src/lib/sales/diagnostic.ts",
    ]
    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(mojibakePattern)
    }
  })
})
