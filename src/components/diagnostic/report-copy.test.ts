import { describe, expect, it } from "vitest"
import { getReportOfferCopy } from "./report-offer-copy"
import { localizeReportIntelligence, reportEvidenceText, severityLabel, sourceCoverageDetail } from "./report-intelligence-copy"
import { REPORT_COPY, normalizeReportLang } from "./report-copy"
import { SOLUTION_COSTS } from "./report-constants"
import { formatMoney, reportCurrencySymbol } from "./report-utils"

const mojibakePattern = /縺|繝|譁|險|謾|蛻|邨|雋|蠖|荳|鬆|譛|蜿|髱|邵ｺ|郢掟隴－髫ｪ|隰ｾ|陋ｻ|驍ｨ|髮弓陟翻闕ｳ|鬯・隴斈陷ｿ|鬮ｱ|・・・ｽ|�/

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
    expect(getReportOfferCopy("ja", "website_diagnostic").badge).toBe("Web制作診断")
    expect(getReportOfferCopy("en", "website_diagnostic").primaryCta).toContain("demo")
  })

  it("keeps Japan Entry report pricing and international losses in USD", () => {
    expect(SOLUTION_COSTS.japan_entry).toBe(13_000)
    expect(formatMoney(SOLUTION_COSTS.japan_entry, "en")).toBe("$15,000")
    expect(formatMoney(450_000, "ja")).toMatch(/^[¥￥]450,000$/)
    expect(reportCurrencySymbol("en")).toBe("$")
    expect(reportCurrencySymbol("ja")).toBe("¥")
  })

  it("turns default intelligence logs into Japanese report copy", () => {
    const intelligence = localizeReportIntelligence({
      signals: [
        {
          id: "metadata",
          label: "Title / description",
          value: "missing",
          source: "HTML metadata scan",
          category: "seo",
          tone: "warning",
          detail: "Metadata shapes the first impression in search, social previews, and browser sharing.",
          whyItMatters: "Metadata shapes the first impression before a prospect clicks.",
        },
      ],
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

    expect(intelligence.signals[0]?.label).toBe("タイトル・説明文")
    expect(intelligence.signals[0]?.source).toBe("HTMLメタデータ")
    expect(intelligence.signals[0]?.value).toBe("未整備")
    expect(intelligence.painPoints[0]?.title).toContain("クリック前の信頼")
    expect(intelligence.nextActions[0]).toContain("企業カルテ")
    expect(severityLabel("warning", "ja")).toBe("要改善")
    expect(sourceCoverageDetail(20, 71, "ja")).toBe("設定済み 20 / 未取得 71")
    expect(reportEvidenceText("HTTP security headers", "ja")).toBe("セキュリティヘッダースキャン")
  })
})
