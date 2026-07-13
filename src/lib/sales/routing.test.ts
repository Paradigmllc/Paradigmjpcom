import { describe, expect, it } from "vitest"
import {
  buildCompanySlug,
  buildDemoUrl,
  buildOpportunityBriefUrl,
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

  it("builds locale-aware opportunity brief urls", () => {
    expect(buildOpportunityBriefUrl("en", "Acme & Co")).toBe(
      "https://paradigmjp.com/en/opportunity/Acme%20%26%20Co",
    )
  })

  it("builds short demo-subdomain urls", () => {
    expect(buildDemoUrl("ja", "及川洋菓子店")).toBe(
      "https://demo.paradigmjp.com/ja/%E5%8F%8A%E5%B7%9D%E6%B4%8B%E8%8F%93%E5%AD%90%E5%BA%97",
    )
  })
})
