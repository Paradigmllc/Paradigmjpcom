import { describe, expect, it } from "vitest"
import {
  getBlogLocaleRedirect,
  getEnglishLegacyOfferRedirect,
  getInternationalMarketingRedirect,
  getJapaneseLegacyOfferRedirect,
  isJapaneseOnlyLegacyOfferPath,
  isNonIndexablePath,
  isPublicMarketingPath,
} from "./marketing-routing"

describe("blog locale redirects", () => {
  it("keeps an English article on its maintained locale", () => {
    const result = getBlogLocaleRedirect(
      new URL("https://paradigmjp.com/ja/blog/what-a-japan-entry-package-should-deliver?source=switcher"),
    )
    expect(result?.pathname).toBe("/en/blog/what-a-japan-entry-package-should-deliver")
    expect(result?.search).toBe("?source=switcher")
  })

  it("keeps a Japanese-only article on the Japanese locale", () => {
    expect(
      getBlogLocaleRedirect(new URL("https://paradigmjp.com/en/blog/japan-entry-kickoff-checklist-ja"))?.pathname,
    ).toBe("/ja/blog/japan-entry-kickoff-checklist-ja")
  })
})
import { pageAlternates } from "./page-metadata"

describe("marketing routing", () => {
  it("redirects superseded English offers while keeping the live module overview", () => {
    const result = getEnglishLegacyOfferRedirect(
      new URL("https://paradigmjp.com/en/services/seo?utm_source=partner"),
    )

    expect(result?.toString()).toBe(
      "https://paradigmjp.com/en/services?utm_source=partner#package-modules",
    )
    expect(
      getEnglishLegacyOfferRedirect(
        new URL("https://paradigmjp.com/en/pricing"),
      ),
    ).toBeNull()
    expect(
      getEnglishLegacyOfferRedirect(
        new URL("https://paradigmjp.com/en/video"),
      )?.toString(),
    ).toBe("https://paradigmjp.com/en/services#package-modules")
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
      "https://paradigmjp.com/en/services?utm_campaign=launch#package-modules",
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

  it("redirects Japanese legacy offers to the fixed Japan Entry package", () => {
    expect(
      getJapaneseLegacyOfferRedirect(
        new URL("https://paradigmjp.com/ja/video?utm_source=legacy"),
      )?.toString(),
    ).toBe("https://paradigmjp.com/ja#japan-entry-pricing")
    expect(
      getJapaneseLegacyOfferRedirect(new URL("https://paradigmjp.com/ja/pricing"))?.pathname,
    ).toBe("/ja")
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
      canonical: "https://paradigmjp.com/en/services",
      languages: {
        "x-default": "https://paradigmjp.com/en/services",
        "ja-JP": "https://paradigmjp.com/ja/services",
        "en-US": "https://paradigmjp.com/en/services",
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
