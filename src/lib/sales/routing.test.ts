import { describe, expect, it } from "vitest"
import {
  buildCompanySlug,
  buildReportUrl,
  inferVariant,
  inferTargetCountryFromDomain,
  normalizeReportLocale,
  normalizeTargetCountry,
  normalizeTemplateVariant,
} from "./routing"

describe("sales routing", () => {
  it("builds stable, human-readable company slugs without a domain suffix", () => {
    const a = buildCompanySlug("Sample Trading", "sample.co.jp")
    const b = buildCompanySlug("Sample Trading", "another.example")
    expect(a).toBe(b)
    expect(a).toBe("sample-trading")
  })

  it("normalizes report locale and country defaults", () => {
    expect(normalizeReportLocale("ko", "global")).toBe("ko")
    expect(normalizeReportLocale("bad", "jp")).toBe("ja")
    expect(normalizeTargetCountry(null, "de")).toBe("DE")
    expect(normalizeTargetCountry("jp", "en")).toBe("JP")
  })

  it("normalizes template variants", () => {
    expect(normalizeTemplateVariant("security")).toBe("security")
    expect(normalizeTemplateVariant("unknown")).toBe("website_diagnostic")
  })

  it("infers countries from ccTLD domains", () => {
    expect(inferTargetCountryFromDomain("https://www.smesouthafrica.co.za")).toBe("ZA")
    expect(inferTargetCountryFromDomain("pigalle.capetown")).toBe("ZA")
    expect(inferTargetCountryFromDomain("example.com")).toBeNull()
  })

  it("infers variants from country and issues", () => {
    expect(inferVariant({ reportLocale: "en", targetCountry: "US", issues: [] })).toBe(
      "japan_entry",
    )
    expect(inferVariant({ reportLocale: "ja", targetCountry: "JP", issues: ["wp_outdated"] })).toBe(
      "security",
    )
    expect(inferVariant({ reportLocale: "ja", targetCountry: "JP", issues: ["no_ogp"] })).toBe(
      "meo",
    )
  })

  it("builds locale-aware report urls", () => {
    expect(buildReportUrl("ko", "sample-abc123")).toBe(
      "https://paradigmjp.com/ko/report/sample-abc123",
    )
  })
})
