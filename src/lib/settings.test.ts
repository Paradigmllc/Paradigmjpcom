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
