/**
 * lib/settings.test.ts — Settings global helper unit tests
 */

import { describe, it, expect } from "vitest"
import { calendarUrlFor, umamiWebsiteIdFor, type SiteSettings } from "./settings"

const FIXTURE: SiteSettings = {
  siteName: "Paradigm",
  tagline: "x",
  description: "",
  contact: {},
  social: {},
  maintenance: { maintenanceMode: false },
  analytics: { umamiWebsiteId: "ja-id", umamiWebsiteIdEn: "en-id" },
  calendarUrl: { ja: "https://cal.example.com/ja", en: "https://cal.example.com/en" },
}

describe("calendarUrlFor", () => {
  it("returns ja URL for ja locale", () => {
    expect(calendarUrlFor(FIXTURE, "ja")).toBe("https://cal.example.com/ja")
  })

  it("returns en URL for non-ja locale", () => {
    expect(calendarUrlFor(FIXTURE, "en")).toBe("https://cal.example.com/en")
    expect(calendarUrlFor(FIXTURE, "ko")).toBe("https://cal.example.com/en")
  })
})

describe("umamiWebsiteIdFor", () => {
  it("returns ja id for ja", () => {
    expect(umamiWebsiteIdFor(FIXTURE, "ja")).toBe("ja-id")
  })

  it("returns en id for non-ja when set", () => {
    expect(umamiWebsiteIdFor(FIXTURE, "en")).toBe("en-id")
  })

  it("falls back to ja id when en id missing", () => {
    const noEn: SiteSettings = {
      ...FIXTURE,
      analytics: { umamiWebsiteId: "ja-id", umamiWebsiteIdEn: null },
    }
    expect(umamiWebsiteIdFor(noEn, "en")).toBe("ja-id")
  })

  it("returns null when neither set", () => {
    const empty: SiteSettings = {
      ...FIXTURE,
      analytics: { umamiWebsiteId: null, umamiWebsiteIdEn: null },
    }
    expect(umamiWebsiteIdFor(empty, "en")).toBe(null)
  })
})

// 2026-05-12 12-locale 拡張: array 形式 (umamiByLocale / calendarByLocale) のテスト
describe("calendarUrlFor — 12-locale array form", () => {
  const withArray: SiteSettings = {
    ...FIXTURE,
    calendarByLocale: [
      { locale: "ja", url: "https://cal.ja.example" },
      { locale: "ko", url: "https://cal.ko.example" },
      { locale: "ar", url: "https://cal.ar.example" },
    ],
  }

  it("array form 優先で exact match を返す", () => {
    expect(calendarUrlFor(withArray, "ko")).toBe("https://cal.ko.example")
    expect(calendarUrlFor(withArray, "ar")).toBe("https://cal.ar.example")
  })

  it("array に該当 locale 無ければ ja entry に fallback", () => {
    expect(calendarUrlFor(withArray, "vi")).toBe("https://cal.ja.example")
    expect(calendarUrlFor(withArray, "id")).toBe("https://cal.ja.example")
  })

  it("array 形式が legacy より優先される", () => {
    // legacy calendarUrl.ja = "https://cal.example.com/ja" を override
    expect(calendarUrlFor(withArray, "ja")).toBe("https://cal.ja.example")
  })

  it("array 未設定なら legacy 経路に落ちる", () => {
    expect(calendarUrlFor(FIXTURE, "ja")).toBe("https://cal.example.com/ja")
  })
})

describe("umamiWebsiteIdFor — 12-locale array form", () => {
  const withArray: SiteSettings = {
    ...FIXTURE,
    umamiByLocale: [
      { locale: "ja", websiteId: "umami-ja" },
      { locale: "de", websiteId: "umami-de" },
      { locale: "vi", websiteId: "umami-vi" },
    ],
  }

  it("array 優先で exact match", () => {
    expect(umamiWebsiteIdFor(withArray, "de")).toBe("umami-de")
    expect(umamiWebsiteIdFor(withArray, "vi")).toBe("umami-vi")
  })

  it("array に該当 locale 無ければ ja entry に fallback", () => {
    expect(umamiWebsiteIdFor(withArray, "fr")).toBe("umami-ja")
  })

  it("array 形式が legacy より優先される", () => {
    expect(umamiWebsiteIdFor(withArray, "ja")).toBe("umami-ja")
  })

  it("array 設定が空配列なら legacy にフォール", () => {
    const emptyArray: SiteSettings = { ...FIXTURE, umamiByLocale: [] }
    expect(umamiWebsiteIdFor(emptyArray, "ja")).toBe("ja-id")
  })
})
