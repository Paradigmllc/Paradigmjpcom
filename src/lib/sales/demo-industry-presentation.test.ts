import { describe, expect, it } from "vitest"
import { applyIndustryPresentation } from "./demo-industry-presentation"
import type { DemoMultiPageData } from "./demo-site-types"
import { buildDemoMultiPageData } from "./demo-multi-page-builder"

describe("applyIndustryPresentation", () => {
  it("turns a restaurant demo into a customer-facing restaurant website without extra LLM calls", () => {
    const base = buildDemoMultiPageData({
      id: "company-1",
      company_name: "喫茶サンプル",
      domain: "demo-only.invalid",
      slug: "kissa-sample",
      industry: "restaurant",
      prefecture: "東京都",
      report_locale: "ja",
      meta: {},
    } as Parameters<typeof buildDemoMultiPageData>[0], {
      slug: "kissa-sample",
      company_id: "company-1",
      report_locale: "ja",
    } as unknown as Parameters<typeof buildDemoMultiPageData>[1]) as DemoMultiPageData
    base.premium = {
      style: "editorial-cafe",
      heroMedia: [1, 2, 3].map((index) => ({ src: `/hero-${index}.jpg`, alt: `店内写真${index}`, kind: "image" as const, caption: `店内写真${index}` })),
      gallery: [1, 2, 3].map((index) => ({ src: `/gallery-${index}.jpg`, alt: `商品写真${index}`, kind: "image" as const, caption: `商品写真${index}` })),
      intro: { eyebrow: "STORY", title: "喫茶サンプル", body: "ご案内" },
      social: [{ label: "Instagram", href: "https://instagram.com/example", network: "instagram" }],
    }

    const page = applyIndustryPresentation(base)

    expect(page.meta.navLabels).toEqual(expect.objectContaining({ about: "お店について", services: "メニュー", works: "店の景色", contact: "アクセス" }))
    expect(page.pages.services.services.every((service) => service.priceNote === undefined)).toBe(true)
    expect(page.pages.services.processTitle).toBe("店で過ごす時間。")
    expect(page.pages.works?.sections).toHaveLength(4)
    expect(page.pages.works?.sections.map((section) => section.heading)).toEqual(["店内とメニュー", "一杯を淹れる時間", "店の佇まい", "季節の一皿"])
    expect(page.meta.primaryCtaHref).toBe("https://instagram.com/example")
  })
})
