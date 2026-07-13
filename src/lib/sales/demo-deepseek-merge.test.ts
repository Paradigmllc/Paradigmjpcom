import { describe, expect, it } from "vitest"
import { mergeDeepSeekOutput } from "./demo-deepseek-merge"
import type { DeepSeekEnhancedOutput } from "./demo-deepseek-types"
import type { DemoMultiPageData } from "./demo-site-types"

describe("mergeDeepSeekOutput", () => {
  it("replaces stale premium copy while keeping FAQ and contact evidence-bound", () => {
    const base = {
      premium: {
        style: "premium-v2",
        heroMedia: [],
        gallery: [],
        social: [{ label: "Instagram", href: "https://instagram.com/cafe_sosomu", network: "instagram" }],
        intro: { eyebrow: "STORY", title: "旧見出し", body: "長年の信頼とWeb改善デモ" },
      },
      companyName: "Cafe SOSOMU",
      meta: { engine: "full-stack", verifiedFacts: ["Cafe SOSOMU", "東京都世田谷区桜2丁目10-7", "フレンチトースト", "ドリップコーヒー"] },
      pages: {
        home: {
          hero: { title: "旧見出し", subtitle: "旧本文" },
          features: [],
          faq: [{ id: "legacy", question: "改善期間は？", answer: "改善後のイメージです。" }],
          totalLoss: "",
        },
        about: { story: "旧事業紹介", mission: "", values: [] },
        services: { subtitle: "", services: [], process: [] },
        contact: { subtitle: "安全な固定文", address: "東京都世田谷区桜2丁目10-7" },
        faq: {
          title: "FAQ",
          subtitle: "",
          eyebrow: "FAQ",
          sections: [{ id: "legacy", heading: "改善期間は？", body: "改善後のイメージです。" }],
          accentColor: "#000000",
        },
      },
    } as unknown as DemoMultiPageData
    const ai = {
      engine: "deepseek",
      generatedAt: "2026-07-13T00:00:00.000Z",
      model: "deepseek-v4-pro",
      home: {
        hero_title: "フレンチトーストとコーヒーを、ゆっくりと。",
        hero_subtitle: "Cafe SOSOMUのご案内です。",
        faq: [
          { q: "営業時間はどこで確認できますか？", a: "公式Instagramをご確認ください。" },
          { q: "所在地はどこですか？", a: "アクセスページをご確認ください。" },
        ],
      },
      about: { story: "外は香ばしく中はしっとりしたフレンチトーストです。" },
      services: {
        intro: "一杯ずつハンドドリップで抽出します。",
        services: [
          { title: "フレンチトースト", description: "卵と牛乳の配合にこだわります。", icon: "sparkles", features: ["焼き加減を調整"] },
        ],
      },
      contact: {},
    } satisfies DeepSeekEnhancedOutput

    const merged = mergeDeepSeekOutput(base, ai, "ja")

    expect(merged.premium?.intro.title).toBe(ai.home.hero_title)
    expect(merged.premium?.intro.body).not.toContain("中はしっとり")
    expect(merged.pages.services.subtitle).not.toContain("ハンドドリップ")
    expect(JSON.stringify(merged.pages.services.services)).not.toMatch(/卵と牛乳|焼き加減/u)
    expect(merged.pages.contact.subtitle).toBe("安全な固定文")
    expect(JSON.stringify(merged.pages.faq?.sections)).toContain("最新の営業情報は公式Instagram")
    expect(JSON.stringify(merged.pages.faq?.sections)).toContain("このデモのフォームからは送信されません")
  })
})
