import { describe, expect, it } from "vitest"
import {
  getEnglishLegacyOfferRedirect,
  getInternationalMarketingRedirect,
  isJapaneseOnlyLegacyOfferPath,
  isNonIndexablePath,
  isPublicMarketingPath,
} from "./marketing-routing"
import { pageAlternates } from "./page-metadata"

describe("marketing routing", () => {
  it("redirects superseded English offers before static page rendering", () => {
    const result = getEnglishLegacyOfferRedirect(
      new URL("https://paradigmjp.com/en/services/seo?utm_source=partner"),
    )

    expect(result?.toString()).toBe(
      "https://paradigmjp.com/en?utm_source=partner#japan-entry-pricing",
    )
    expect(
      getEnglishLegacyOfferRedirect(
        new URL("https://paradigmjp.com/en/pricing"),
      ),
    ).toBeNull()
  })

  it("consolidates international marketing homepages into English", () => {
    const result = getInternationalMarketingRedirect(
      new URL("https://paradigmjp.com/de?utm_source=partner"),
    )

    expect(result?.toString()).toBe(
      "https://paradigmjp.com/en?utm_source=partner",
    )
  })

  it("sends legacy international offers to the fixed Japan Entry package", () => {
    const result = getInternationalMarketingRedirect(
      new URL("https://paradigmjp.com/fr/services/seo?utm_campaign=launch"),
    )

    expect(result?.toString()).toBe(
      "https://paradigmjp.com/en?utm_campaign=launch#japan-entry-pricing",
    )
  })

  it("preserves attribution and defaults international contact intent", () => {
    const result = getInternationalMarketingRedirect(
      new URL("https://paradigmjp.com/es/contact?utm_source=directory"),
    )

    expect(result?.pathname).toBe("/en/contact")
    expect(result?.searchParams.get("utm_source")).toBe("directory")
    expect(result?.searchParams.get("intent")).toBe("japan-entry")
  })

  it("does not redirect personalised report and demo routes", () => {
    expect(
      getInternationalMarketingRedirect(
        new URL("https://paradigmjp.com/de/report/acme"),
      ),
    ).toBeNull()
    expect(isPublicMarketingPath("/de/demo/acme")).toBe(false)
  })

  it("identifies the domestic-only legacy service paths", () => {
    expect(isJapaneseOnlyLegacyOfferPath("/ja/services/seo")).toBe(true)
    expect(isJapaneseOnlyLegacyOfferPath("/en/pricing")).toBe(false)
  })

  it("publishes only maintained hreflang URLs", () => {
    expect(pageAlternates("de", "/pricing")).toEqual({
      canonical: "https://paradigmjp.com/en/pricing",
      languages: {
        "x-default": "https://paradigmjp.com/en/pricing",
        "ja-JP": "https://paradigmjp.com/ja/pricing",
        "en-US": "https://paradigmjp.com/en/pricing",
      },
    })
    expect(pageAlternates("en", "/services")).toEqual({
      canonical: "https://paradigmjp.com/ja/services",
      languages: {
        "x-default": "https://paradigmjp.com/ja/services",
        "ja-JP": "https://paradigmjp.com/ja/services",
      },
    })
  })

  it("emits blog alternates only for locales where the post exists", () => {
    expect(pageAlternates("ja", "/blog/ja-only", ["ja"])).toEqual({
      canonical: "https://paradigmjp.com/ja/blog/ja-only",
      languages: {
        "x-default": "https://paradigmjp.com/ja/blog/ja-only",
        "ja-JP": "https://paradigmjp.com/ja/blog/ja-only",
      },
    })
  })

  it("keeps personalised and operator routes out of search indexes", () => {
    expect(isNonIndexablePath("/en/report/acme")).toBe(true)
    expect(isNonIndexablePath("/de/demo/acme")).toBe(true)
    expect(isNonIndexablePath("/api/contact")).toBe(true)
    expect(isNonIndexablePath("/en/pricing")).toBe(false)
  })
})
