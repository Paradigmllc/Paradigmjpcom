import { describe, expect, it } from "vitest"
import { getReportOfferCopy } from "./report-offer-copy"
import { localizeReportIntelligence, severityLabel, sourceCoverageDetail } from "./report-intelligence-copy"
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

  it("switches report offer copy by template variant", () => {
    expect(getReportOfferCopy("en", "japan_entry").reportLabel).toContain("Japan entry")
    expect(getReportOfferCopy("ja", "video_subscription").primaryCta).toContain("動画")
    expect(getReportOfferCopy("en", "website_diagnostic").primaryCta).toContain("demo")
  })

  it("turns default intelligence logs into Japanese report copy", () => {
    const intelligence = localizeReportIntelligence({
      signals: [],
      painPoints: [
        {
          id: "no-ogp",
          title: "Social and message previews are weaker than they should be",
          severity: "warning",
          evidence: "OGP metadata appears incomplete.",
          implication: "Shared links can look generic before a prospect decides whether to click.",
          recommendedAction: "Add offer-specific OGP, structured data, and proof-led preview copy.",
        },
      ],
      nextActions: ["Review the company karte, sales material, and opportunity record on the Twenty company page."],
    }, "ja")

    expect(intelligence.painPoints[0]?.title).toContain("信頼")
    expect(intelligence.nextActions[0]).toContain("企業カルテ")
    expect(severityLabel("warning", "ja")).toBe("要改善")
    expect(sourceCoverageDetail(20, 71, "ja")).toBe("設定済み 20 / 未取得 71")
  })
})
