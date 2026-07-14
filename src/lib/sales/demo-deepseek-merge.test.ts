import { describe, expect, it } from "vitest"
import { mergeDeepSeekOutput } from "./demo-deepseek-merge"
import type { DeepSeekEnhancedOutput } from "./demo-deepseek-types"
import type { DemoMultiPageData } from "./demo-site-types"

describe("mergeDeepSeekOutput", () => {
  it("replaces stale premium copy while keeping FAQ and contact evidence-bound", () => {
    const base = {
      premium: {
        style: "premium-v2",
        heroMedia: [{ src: "/hero.jpg", alt: "一杯ずつハンドドリップ", caption: "2020年創業", kind: "image" }],
        gallery: [{ src: "/gallery.jpg", alt: "卵と牛乳の配合", caption: "権利確認済みの公式素材", kind: "image" }],
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
      works: {},
      contact: {},
      artDirections: [],
    } satisfies DeepSeekEnhancedOutput

    const merged = mergeDeepSeekOutput(base, ai, "ja")

    expect(merged.premium?.intro.title).toBe(ai.home.hero_title)
    expect(merged.premium?.intro.body).not.toContain("中はしっとり")
    expect(merged.pages.services.subtitle).not.toContain("ハンドドリップ")
    expect(JSON.stringify(merged.pages.services.services)).not.toMatch(/卵と牛乳|焼き加減/u)
    expect(JSON.stringify(merged.premium?.heroMedia)).not.toMatch(/ハンドドリップ|2020年/u)
    expect(JSON.stringify(merged.premium?.gallery)).not.toMatch(/卵と牛乳|公式素材/u)
    expect(merged.pages.contact.subtitle).toBe("安全な固定文")
    expect(JSON.stringify(merged.pages.faq?.sections)).toContain("最新の営業情報は公式Instagram")
    expect(JSON.stringify(merged.pages.faq?.sections)).toContain("このデモのフォームからは送信されません")
  })

  it("tops up incomplete model narratives from grounded fallback modules", () => {
    const fallbackNarratives = Array.from({ length: 3 }, (_, index) => ({
      eyebrow: `FALLBACK ${index + 1}`,
      title: `確認済みのご案内 ${index + 1}`,
      body: `神奈川県横浜市港北区で確認できる情報 ${index + 1}。`,
      points: ["所在地", "店内写真"],
    }))
    const base = {
      companyName: "ノン美容室",
      meta: { verifiedFacts: ["神奈川県横浜市港北区", "店内のセット面", "鏡と椅子が写る店内"] },
      pages: {
        home: { hero: { title: "旧見出し", subtitle: "旧本文" }, features: [], narrativeModules: fallbackNarratives },
        about: { story: "旧事業紹介", mission: "旧方針", values: [], chapters: fallbackNarratives },
        services: { subtitle: "", services: [], process: [], guidance: fallbackNarratives },
        contact: { subtitle: "固定文", address: "神奈川県横浜市港北区" },
        works: { title: "スタイル", subtitle: "旧本文", eyebrow: "WORKS", accentColor: "#000", sections: fallbackNarratives.map((item, index) => ({ id: `work-${index}`, heading: item.title, body: item.body })) },
      },
    } as unknown as DemoMultiPageData
    const narrative = { eyebrow: "STORY", title: "店内で確認できること", body: "店内の雰囲気をご紹介します。", points: ["店内写真"] }
    const ai = {
      engine: "deepseek",
      generatedAt: "2026-07-14T00:00:00.000Z",
      model: "deepseek-v4-pro",
      home: { hero_title: "ノン美容室", hero_subtitle: "横浜の美容室です。", features: [], narrative_modules: [narrative, { ...narrative, title: "サロンの空間" }] },
      about: { chapters: [narrative] },
      services: { services: [{ title: "カット", description: "確認済みの提供内容です。", icon: "sparkles", features: [] }], guidance: [narrative] },
      works: { intro: "店内の風景をご紹介します。", sections: [{ title: "セット面", body: "鏡と椅子が写る店内です。", note: "" }] },
      contact: {},
      artDirections: [],
    } satisfies DeepSeekEnhancedOutput

    const merged = mergeDeepSeekOutput(base, ai, "ja")
    expect(merged.pages.home.narrativeModules).toHaveLength(4)
    expect(merged.pages.about.chapters).toHaveLength(4)
    expect(merged.pages.services.guidance).toHaveLength(4)
    expect(merged.pages.works?.sections).toHaveLength(4)
    expect(merged.pages.home.narrativeModules?.every((item) => item.body.length >= 180)).toBe(true)
    expect(merged.pages.about.chapters?.every((item) => item.body.length >= 220)).toBe(true)
    expect(merged.pages.services.guidance?.every((item) => item.body.length >= 180)).toBe(true)
    expect(merged.pages.works?.sections.every((item) => item.body.length >= 180)).toBe(true)
    const counts = new Map<string, number>()
    const visit = (value: unknown) => {
      if (typeof value === "string" && value.length >= 42) counts.set(value, (counts.get(value) ?? 0) + 1)
      else if (Array.isArray(value)) value.forEach(visit)
      else if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach(visit)
    }
    visit(merged.pages)
    expect(Math.max(...counts.values())).toBeLessThan(3)
  })
})
