import { describe, expect, it } from "vitest"
import {
  isCompanyInScope,
  salesScopeFromCountry,
  salesScopeFromLocale,
  scopedReportHref,
} from "./locale-scope"

describe("sales locale scope", () => {
  it("maps every dashboard locale to an isolated region and target country", () => {
    expect(salesScopeFromLocale("ja")).toEqual({
      reportLocale: "ja",
      region: "jp",
      targetCountry: "JP",
    })
    expect(salesScopeFromLocale("en")).toEqual({
      reportLocale: "en",
      region: "global",
      targetCountry: "US",
    })
    expect(salesScopeFromLocale("ko")).toEqual({
      reportLocale: "ko",
      region: "global",
      targetCountry: "KR",
    })
  })

  it("derives scope from CSV country codes when locale is missing", () => {
    expect(salesScopeFromCountry({ targetCountry: "KR" }).reportLocale).toBe("ko")
    expect(salesScopeFromCountry({ targetCountry: "BR" }).reportLocale).toBe("pt")
    expect(salesScopeFromCountry({ targetCountry: "JP" }).reportLocale).toBe("ja")
    expect(salesScopeFromCountry({ targetCountry: "CA" }).reportLocale).toBe("en")
  })

  it("builds report links from the company locale instead of hardcoding ja", () => {
    expect(scopedReportHref({ slug: "acme", report_locale: "en", region: "global" })).toBe("/en/report/acme")
    expect(scopedReportHref({ slug: "sample", reportLocale: "ja", region: "jp" })).toBe("/ja/report/sample")
    expect(scopedReportHref({ reportUrl: "https://example.com/custom" })).toBe("https://example.com/custom")
  })

  it("keeps dashboard rows in the selected scope", () => {
    const enScope = salesScopeFromLocale("en")
    expect(isCompanyInScope({ report_locale: "en", region: "global" }, enScope)).toBe(true)
    expect(isCompanyInScope({ report_locale: "ja", region: "jp" }, enScope)).toBe(false)
  })
})
