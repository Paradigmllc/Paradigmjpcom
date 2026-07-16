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
    expect(page.pages.contact).toEqual(expect.objectContaining({ title: "店舗情報・アクセス", subtitle: "所在地、地図、最新情報の確認先をご案内します。" }))
    expect(page.pages.works?.sections).toHaveLength(4)
    expect(page.pages.works?.sections.map((section) => section.heading)).toEqual(["店内とメニュー", "一杯を淹れる時間", "店の佇まい", "季節の一皿"])
    expect(page.meta.primaryCtaHref).toBe("https://instagram.com/example")

    base.pages.works!.sections = [1, 2, 3, 4].map((index) => ({
      id: `authored-${index}`,
      heading: `確認済みの読み物 ${index}`,
      body: `確認済みの写真と公開情報を組み合わせ、第${index}の視点から事業と場所の特徴を詳しく紹介します。画像だけでは伝わらない利用前の確認事項、提供内容、次に見るべき情報を一続きの文章として整理し、変わる可能性がある内容は断定せず現在の公式案内へつなぎます。単なるキャプション一覧ではなく、判断材料になる読み物として構成します。`,
    }))
    const authored = applyIndustryPresentation(base)

    expect(authored.pages.works?.sections.map((section) => section.id)).toEqual([
      "authored-1", "authored-2", "authored-3", "authored-4",
    ])
  })

  it("infers the hospitality profile when a source omitted its industry code", () => {
    const base = buildDemoMultiPageData({
      id: "company-2",
      company_name: "料理屋サンプル",
      domain: "demo-only.invalid",
      slug: "ryori-sample",
      industry: null,
      prefecture: "大阪府",
      report_locale: "ja",
      meta: {},
    } as Parameters<typeof buildDemoMultiPageData>[0], {
      slug: "ryori-sample",
      company_id: "company-2",
      report_locale: "ja",
    } as unknown as Parameters<typeof buildDemoMultiPageData>[1]) as DemoMultiPageData
    base.pages.home.hero.industryLabel = "飲食店"

    const page = applyIndustryPresentation(base)

    expect(page.presentation?.industryProfile).toBe("restaurant")
    expect(page.meta.navLabels?.works).toBe("店の景色")
    expect(page.pages.home.narrativeModules).toHaveLength(3)
    expect(page.pages.news?.sections.length).toBeGreaterThanOrEqual(3)
  })

  it("keeps inferred clinic copy and reviewed media customer-facing", () => {
    const base = buildDemoMultiPageData({
      id: "company-3",
      company_name: "ほさか歯科",
      domain: "demo-only.invalid",
      slug: "hosaka-dental",
      industry: null,
      prefecture: "東京都",
      report_locale: "ja",
      meta: {},
    } as Parameters<typeof buildDemoMultiPageData>[0], {
      slug: "hosaka-dental",
      company_id: "company-3",
      report_locale: "ja",
    } as unknown as Parameters<typeof buildDemoMultiPageData>[1]) as DemoMultiPageData
    base.premium = {
      style: "professional",
      heroMedia: [
        { src: "https://image.ekiten.jp/shop/3/photo.jpg?1to1_m", alt: "エキテン掲載素材", caption: "権利確認前は公開・納品に使用しない", kind: "image" },
        { src: "https://image.ekiten.jp/shop/3/photo.jpg?1to1_l", alt: "同じ写真", caption: "権利確認前", kind: "image" },
        { src: "/clinic-2.jpg", alt: "受付", caption: "受付", kind: "image" },
      ],
      gallery: [],
      intro: { eyebrow: "STORY", title: "ほさか歯科", body: "ご案内", note: "提案用素材" },
      social: [],
    }

    const page = applyIndustryPresentation(base)

    expect(page.presentation?.industryProfile).toBe("dental")
    expect(page.pages.home.hero.industryLabel).toBe("歯科医院")
    expect(page.pages.about.industryLabel).toBe("歯科医院")
    expect(page.premium?.heroMedia).toHaveLength(2)
    expect(JSON.stringify(page.premium)).not.toMatch(/エキテン掲載素材|権利確認前|提案用素材/u)
    expect(page.premium?.intro.note).not.toMatch(/提案用|権利確認/u)
  })
})
