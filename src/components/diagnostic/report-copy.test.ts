import { describe, expect, it } from "vitest"
import { REPORT_COPY, normalizeReportLang } from "./report-copy"

const mojibakePattern = /縺|繝|譁|險|謾|蛻|邨|雋|蠖|荳|鬆|譛|蜿|髱|ﾂ|�/

describe("diagnostic report customer-facing copy", () => {
  it("keeps Japanese executive report copy readable", () => {
    const copy = REPORT_COPY.ja

    expect(JSON.stringify(copy)).not.toMatch(mojibakePattern)
    expect(copy.privateReport).toBe("経営診断レポート")
    expect(copy.dataAppendix).toBe("データ台帳")
    expect(copy.finalHeading).toContain("30分")
  })

  it("falls back to English for unsupported locales", () => {
    expect(normalizeReportLang("ja")).toBe("ja")
    expect(normalizeReportLang("unknown")).toBe("en")
  })
})
