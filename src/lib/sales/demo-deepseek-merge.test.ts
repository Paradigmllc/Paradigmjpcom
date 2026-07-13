import { describe, expect, it } from "vitest"
import { mergeDeepSeekOutput } from "./demo-deepseek-merge"
import type { DeepSeekEnhancedOutput } from "./demo-deepseek-types"
import type { DemoMultiPageData } from "./demo-site-types"

describe("mergeDeepSeekOutput", () => {
  it("replaces stale diagnostic copy in premium intro and the fixed FAQ page", () => {
    const base = {
      premium: {
        style: "premium-v2",
        heroMedia: [],
        gallery: [],
        social: [],
        intro: { eyebrow: "STORY", title: "旧見出し", body: "長年の信頼とWeb改善デモ" },
      },
      meta: { engine: "full-stack" },
      pages: {
        home: {
          hero: { title: "旧見出し", subtitle: "旧本文" },
          features: [],
          faq: [{ id: "legacy", question: "改善期間は？", answer: "改善後のイメージです。" }],
          totalLoss: "",
        },
        about: { story: "旧事業紹介", mission: "", values: [] },
        services: { subtitle: "", services: [], process: [] },
        contact: { subtitle: "" },
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
      about: { story: "確認済みのメニューと所在地をご案内します。" },
      services: {},
      contact: {},
    } satisfies DeepSeekEnhancedOutput

    const merged = mergeDeepSeekOutput(base, ai, "ja")

    expect(merged.premium?.intro.title).toBe(ai.home.hero_title)
    expect(merged.premium?.intro.body).toBe(ai.about.story)
    expect(merged.pages.faq?.sections).toEqual([
      { id: "ai-faq-0", heading: ai.home.faq[0].q, body: ai.home.faq[0].a },
      { id: "ai-faq-1", heading: ai.home.faq[1].q, body: ai.home.faq[1].a },
    ])
  })
})
