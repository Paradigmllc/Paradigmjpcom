import { describe, expect, it } from "vitest"
import type { DemoMultiPageData } from "./demo-site-types"
import { resolveDemoBrandSystem, upgradeDemoToPremiumV3 } from "./demo-premium-v3"

describe("premium v3 industry typography", () => {
  it("does not let a generic art direction replace a salon with corporate fonts", () => {
    const page = {
      companyId: "salon-1",
      industry: "beauty_salon",
      designRecipe: {
        templateId: "prism",
        creativeDirection: {
          concept: "静かな余白で店内の質感を伝える",
          typographyStyle: "modern-grotesk",
        },
      },
    } as unknown as DemoMultiPageData

    const brand = resolveDemoBrandSystem(page)

    expect(brand.displayFont).toMatch(/Serif|Mincho/u)
    expect(brand.bodyFont).toContain("Zen Kaku Gothic New")
    expect(brand.displayFont).not.toContain("Outfit")
  })

  it("keeps works enrichment idempotent when generated demos are read again", () => {
    const page = {
      companyId: "salon-2",
      companyName: "ノン美容室",
      industry: "beauty_salon",
      premium: { style: "premium-v3", social: [], heroMedia: [], gallery: [], intro: {} },
      pages: {
        home: { cta: { subtitle: "" } },
        about: {},
        services: {
          ctaSubtitle: "",
          services: [
            { title: "カット" },
            { title: "カラー" },
            { title: "パーマ" },
          ],
        },
        works: {
          title: "スタイル",
          subtitle: "店内の風景",
          eyebrow: "WORKS",
          accentColor: "#000000",
          sections: [
            { id: "scene-1", heading: "セット面", body: "白い椅子と鏡のある空間です。営業日や提供内容などの最新情報は、正式な案内をご確認ください。" },
            { id: "scene-2", heading: "待合", body: "観葉植物のある待合です。営業日や提供内容などの最新情報は、公式SNSでご確認ください。" },
          ],
        },
        contact: { formNote: "" },
      },
    } as unknown as DemoMultiPageData

    const once = upgradeDemoToPremiumV3(page)
    const twice = upgradeDemoToPremiumV3(once)
    const serviceLine = "ノン美容室では、カット、カラー、パーマをご案内しています。"

    expect(twice.pages.works?.sections[0].body.split(serviceLine)).toHaveLength(2)
    expect(twice.pages.works?.sections[1].body).not.toContain(serviceLine)
    expect(JSON.stringify(twice.pages.works)).not.toMatch(/営業日や提供内容などの最新情報/u)
    expect(twice.pages.works).toEqual(once.pages.works)
  })

  it("removes repeated service copy without discarding distinct facts", () => {
    const page = {
      companyId: "service-copy-1",
      companyName: "Cafe SOSOMU",
      industry: "restaurant",
      premium: { style: "premium-v3", social: [], heroMedia: [], gallery: [], intro: {} },
      pages: {
        home: { cta: { subtitle: "" } },
        about: {},
        services: {
          title: "メニュー",
          subtitle: "素材と時間を大切にした一皿をご用意します",
          services: [{
            title: "ドリップコーヒー",
            description: "一杯ずつ丁寧に抽出します",
            icon: "coffee",
            features: ["一杯ずつ丁寧に抽出します ／ 豆の個性に合わせた抽出 ／ 豆の個性に合わせた抽出"],
          }],
          process: [],
        },
        contact: { formNote: "" },
      },
    } as unknown as DemoMultiPageData

    const upgraded = upgradeDemoToPremiumV3(page)
    expect(upgraded.pages.services.services[0].description).toBe("一杯ずつ丁寧に抽出します。")
    expect(upgraded.pages.services.services[0].features).toEqual(["豆の個性に合わせた抽出"])
    expect(upgradeDemoToPremiumV3(upgraded).pages.services).toEqual(upgraded.pages.services)
  })
})
