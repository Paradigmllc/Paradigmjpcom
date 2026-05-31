import { describe, expect, it } from "vitest"
import { buildInitialContentTemplates, CONTENT_ASSET_LABELS, INDUSTRY_LABELS, matchContentTemplate } from "./content-templates"

const mojibakePattern = /繝|蜍|譛|縺|邯|荳|逶|螟|諡|蛻|蟇|髢|遯|鬚|蝟|繧|譁ｭ|險/

describe("sales content templates", () => {
  it("builds a locale-scoped matrix for all supported sales locales", () => {
    const rows = buildInitialContentTemplates()
    expect(rows.length).toBe(576)
    expect(rows.some((row) => row.report_locale === "ja" && row.asset_type === "diagnostic_report")).toBe(true)
    expect(rows.some((row) => row.report_locale === "en" && row.asset_type === "sales_video")).toBe(true)
    expect(rows.some((row) => row.report_locale === "ko" && row.target_country === "KR")).toBe(true)
    expect(rows.some((row) => row.report_locale === "pt" && row.target_country === "BR")).toBe(true)
  })

  it("matches by locale, industry, asset, and appeal angle with bundled fallback", async () => {
    const template = await matchContentTemplate({
      reportLocale: "en",
      industry: "restaurant",
      assetType: "sales_deck",
      appealAngle: "japan_entry",
    })

    expect(template.report_locale).toBe("en")
    expect(template.industry).toBe("restaurant")
    expect(template.asset_type).toBe("sales_deck")
    expect(template.appeal_angle).toBe("japan_entry")
    expect(template.prompt_template.toLowerCase()).toContain("never invent unavailable evidence")
  })

  it("keeps Japanese template labels and prompt guardrails readable", () => {
    const rows = buildInitialContentTemplates()
    const restaurantReport = rows.find(
      (row) =>
        row.report_locale === "ja" &&
        row.industry === "restaurant" &&
        row.asset_type === "diagnostic_report" &&
        row.appeal_angle === "revenue_recovery",
    )

    expect(INDUSTRY_LABELS.restaurant.ja).toBe("飲食店")
    expect(CONTENT_ASSET_LABELS.diagnostic_report.ja).toBe("診断レポート")
    expect(restaurantReport?.title).toContain("飲食店")
    expect(restaurantReport?.title).toContain("診断レポート")
    expect(restaurantReport?.dify_selection_rule).toContain("未検証")
    expect(restaurantReport?.prompt_template).toContain("一次情報URL")
    expect(JSON.stringify(rows.filter((row) => row.report_locale === "ja"))).not.toMatch(mojibakePattern)
  })
})
