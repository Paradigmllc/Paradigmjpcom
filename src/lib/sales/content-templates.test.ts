import { describe, expect, it } from "vitest"
import { buildInitialContentTemplates, matchContentTemplate } from "./content-templates"

describe("sales content templates", () => {
  it("builds a ja/en matrix for four asset types", () => {
    const rows = buildInitialContentTemplates()
    expect(rows.length).toBe(256)
    expect(rows.some((row) => row.report_locale === "ja" && row.asset_type === "diagnostic_report")).toBe(true)
    expect(rows.some((row) => row.report_locale === "en" && row.asset_type === "sales_video")).toBe(true)
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
})
