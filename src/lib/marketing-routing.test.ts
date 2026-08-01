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

  it("keeps international marketing URLs locale-aware", () => {
    const result = getInternationalMarketingRedirect(
      new URL("https://paradigmjp.com/de?utm_source=partner"),
    )

    expect(result).toBeNull()
  })

  it("does not redirect international package routes to English", () => {
    const result = getInternationalMarketingRedirect(
      new URL("https://paradigmjp.com/fr/services/seo?utm_campaign=launch"),
    )

    expect(result).toBeNull()
  })

  it("does not rewrite international contact intent", () => {
    const result = getInternationalMarketingRedirect(
      new URL("https://paradigmjp.com/es/contact?utm_source=directory"),
    )

    expect(result).toBeNull()
  })

  it("does not redirect personalised report and demo routes", () => {
    expect(
      getInternationalMarketingRedirect(
        new URL("https://paradigmjp.com/de/report/acme"),
      ),
    ).toBeNull()
    expect(isPublicMarketingPath("/de/demo/acme")).toBe(false)
  })

  it("keeps renewed Japanese package pages live and identifies retired paths", () => {
    expect(isJapaneseOnlyLegacyOfferPath("/ja/services/seo")).toBe(true)
    expect(isJapaneseOnlyLegacyOfferPath("/ja/video")).toBe(true)
    expect(isJapaneseOnlyLegacyOfferPath("/en/pricing")).toBe(false)
  })

  it("redirects Japanese retired offers to the general services page", () => {
    expect(
      getJapaneseLegacyOfferRedirect(
        new URL("https://paradigmjp.com/ja/video?utm_source=legacy"),
      )?.toString(),
    ).toBe("https://paradigmjp.com/ja/services")
    expect(getJapaneseLegacyOfferRedirect(new URL("https://paradigmjp.com/ja/pricing"))).toBeNull()
    expect(getJapaneseLegacyOfferRedirect(new URL("https://paradigmjp.com/ja/services/seo"))).toBeNull()
  })

  it("publishes only maintained hreflang URLs", () => {
    expect(pageAlternates("de", "/pricing")).toEqual({
      canonical: "https://paradigmjp.com/de/pricing",
      languages: {
        "x-default": "https://paradigmjp.com/en/pricing",
        "ja-JP": "https://paradigmjp.com/ja/pricing",
        "en-US": "https://paradigmjp.com/en/pricing",
        "ko-KR": "https://paradigmjp.com/ko/pricing",
        "zh-Hans": "https://paradigmjp.com/zh/pricing",
        "de-DE": "https://paradigmjp.com/de/pricing",
        "fr-FR": "https://paradigmjp.com/fr/pricing",
        "es-ES": "https://paradigmjp.com/es/pricing",
        "pt-BR": "https://paradigmjp.com/pt/pricing",
        "ru-RU": "https://paradigmjp.com/ru/pricing",
        "ar-SA": "https://paradigmjp.com/ar/pricing",
        "vi-VN": "https://paradigmjp.com/vi/pricing",
        "id-ID": "https://paradigmjp.com/id/pricing",
      },
    })
    expect(pageAlternates("en", "/services")).toEqual({
      canonical: "https://paradigmjp.com/en/services",
      languages: {
        "x-default": "https://paradigmjp.com/en/services",
        "ja-JP": "https://paradigmjp.com/ja/services",
        "en-US": "https://paradigmjp.com/en/services",
        "ko-KR": "https://paradigmjp.com/ko/services",
        "zh-Hans": "https://paradigmjp.com/zh/services",
        "de-DE": "https://paradigmjp.com/de/services",
        "fr-FR": "https://paradigmjp.com/fr/services",
        "es-ES": "https://paradigmjp.com/es/services",
        "pt-BR": "https://paradigmjp.com/pt/services",
        "ru-RU": "https://paradigmjp.com/ru/services",
        "ar-SA": "https://paradigmjp.com/ar/services",
        "vi-VN": "https://paradigmjp.com/vi/services",
        "id-ID": "https://paradigmjp.com/id/services",
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
