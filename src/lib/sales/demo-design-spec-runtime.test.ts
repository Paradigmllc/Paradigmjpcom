import { describe, expect, it } from "vitest"
import type { DemoDesignSpec } from "./demo-design-types"
import { applyDemoDesignSpec, brandSystemFromDesignSpec, readPersistedDemoDesignSpec } from "./demo-design-spec-runtime"
import type { DemoMultiPageData } from "./demo-site-types"

const spec = {
  schema_version: 1,
  slug: "atelier-demo",
  locale: "ja",
  generated_at: "2026-07-18T00:00:00.000Z",
  engine: "deepseek-v4-pro",
  company: {
    name: "アトリエ工務店",
    domain: "atelier.example.jp",
    industry: "construction",
    location: "東京都",
    available_images: { hero: null, logo: null, gallery: [] },
    extracted_colors: null,
    real_content: { about_text: null, services_text: null, testimonials_text: null, pricing_text: null },
    diagnosis: { pain_summary: "", issues: [], pagespeed_mobile: null, pagespeed_desktop: null, tech_stack: [], improvement_actions: [] },
  },
  creative_brief: {
    company_essence: "素材と暮らしに向き合う工務店",
    customer_psychology: "",
    competitive_context: "",
    transformation_story: "相談前の不安を、完成後の暮らしまで見通せる体験へ。",
  },
  design_philosophy: {
    visual_language: "documentary",
    layout_rhythm: "asymmetric-fluid",
    navigation_style: "floating-minimal",
    color_strategy: "dark-premium",
    typography_personality: "classic-serif",
    motion_character: "fluid-parallax",
    rationale: "",
  },
  design_tokens: {
    palette: { primary: "#123456", primaryDark: "#0f2233", accent: "#c58b42", background: "#101820", surface: "#1f2b35", text: "#f8fafc", textMuted: "#c5ced6", border: "#4a5964" },
    typography: { headingFont: '"Noto Serif JP", serif', bodyFont: '"Noto Sans JP", sans-serif', scale: "generous" },
    radius: "soft",
  },
  site: { pages: ["home", "about", "services"], nav: [], footer: { tagline: "暮らしをつくる仕事", address: null, phone: null, email: null, social_links: [] } },
  pages: {
    home: {
      title: "アトリエ工務店",
      description: "",
      hero: { type: "hero", variant: "split", image: null, eyebrow: "CRAFT / BUILD", headline: "暮らしの輪郭から、住まいをつくる。", subheadline: "設計と施工を一つの視点で考えます。", primary_cta: { label: "施工事例を見る", href: "#cases" }, secondary_cta: { label: "相談する", href: "#contact" } },
      blocks: [{ type: "cards", title: "できること", subtitle: null, layout: "grid-3", items: [{ title: "設計", body: "暮らしの条件を整理し、計画に落とし込みます。", icon_emoji: null, image: null, link: null, bullets: ["ヒアリング", "設計提案"] }, { title: "施工", body: "現場の品質と工程を丁寧に管理します。", icon_emoji: null, image: null, link: null, bullets: ["現地確認", "工程管理"] }] }],
    },
    about: { title: "私たちについて", description: "", blocks: [{ type: "media-text", image_position: "left", image: null, headline: "素材と暮らしに向き合う", body: "相談から完成まで、判断の背景を丁寧にご説明します。", ctas: null }] },
    services: { title: "サービス", description: "", blocks: [{ type: "cards", title: "サービス", subtitle: null, layout: "grid-3", items: [{ title: "新築", body: "土地と暮らしに合わせた新築計画。", icon_emoji: null, image: null, link: null, bullets: ["設計", "施工"] }, { title: "リフォーム", body: "今の住まいを活かした改修。", icon_emoji: null, image: null, link: null, bullets: ["現地調査", "提案"] }] }] },
  },
} satisfies DemoDesignSpec

function baseData(): DemoMultiPageData {
  return {
    slug: "atelier-demo",
    companyId: "atelier-1",
    companyName: "アトリエ工務店",
    locale: "ja",
    industry: "construction",
    meta: { title: "", description: "", ogImage: "", industry: "construction", locale: "ja", companyName: "アトリエ工務店", accentColor: "#9b6b3d", accentColorDark: "#704a29", calBookingUrl: "/atelier-demo/contact", generatedAt: "", engine: "test" },
    brandSystem: { id: "built-solid", displayFont: "sans", bodyFont: "sans", headingWeight: 700, surface: "#fff", surfaceAlt: "#eee", ink: "#111", muted: "#666", line: "#ddd", heroTone: "precision", imageTreatment: "crisp", shape: "square" },
    pages: {
      home: { hero: { title: "旧タイトル", subtitle: "旧本文", tagline: "工務店", companyName: "アトリエ工務店", industryLabel: "工務店", locationLabel: "東京都", primaryCta: { text: "見る", href: "#old" }, secondaryCta: { text: "相談", href: "#old-contact" }, accentColor: "#9b6b3d", accentColorDark: "#704a29" }, features: [], stats: [], beforeAfter: [], totalLoss: "", cta: { title: "お問い合わせ", subtitle: "", buttonText: "送信", buttonHref: "/atelier-demo/contact", accentColor: "#9b6b3d", accentColorDark: "#704a29" } },
      about: { title: "旧", subtitle: "旧", companyName: "アトリエ工務店", industryLabel: "工務店", locationLabel: "東京都", story: "旧", mission: "旧", values: [], teamNote: "", accentColor: "#9b6b3d" },
      services: { title: "旧サービス", subtitle: "旧", services: [], process: [], accentColor: "#9b6b3d" },
      contact: { title: "お問い合わせ", subtitle: "", companyName: "アトリエ工務店", email: "", address: "東京都", calBookingUrl: "/atelier-demo/contact", accentColor: "#9b6b3d" },
    },
  }
}

describe("demo design spec runtime", () => {
  it("validates and projects a rich spec into the public renderer data", () => {
    const parsed = readPersistedDemoDesignSpec(spec)
    expect(parsed).not.toBeNull()

    const result = applyDemoDesignSpec(baseData(), parsed as DemoDesignSpec)
    expect(result.brandSystem?.id).toBe("spec-atelier-demo")
    expect(result.brandSystem?.surface).toBe("#101820")
    expect(result.designRecipe?.creativeDirection.heroComposition).toBe("mosaic")
    expect(result.pages.home.hero.title).toContain("暮らし")
    expect(result.pages.services.services.map((item) => item.title)).toEqual(["新築", "リフォーム"])
    expect(result.pages.about.mission).toContain("素材と暮らし")
  })

  it("rejects unsafe internal copy and industry-mismatched labels", () => {
    const restaurant = { ...baseData(), industry: "restaurant" as const, presentation: { featureEyebrow: "", featureHeading: "", servicesEyebrow: "", servicesHeading: "", galleryEyebrow: "", galleryHeading: "", industryProfile: "restaurant" } }
    const invalid = { ...spec, company: { ...spec.company, name: "アトリエ工務店" }, pages: { ...spec.pages, home: { ...spec.pages.home, hero: { ...spec.pages.home.hero, headline: "コンサルティングの提案" } } } }
    const result = applyDemoDesignSpec(restaurant, invalid)
    expect(result.pages.home.hero.title).not.toContain("コンサルティング")
  })

  it("keeps design tokens as a directly executable brand system", () => {
    const brand = brandSystemFromDesignSpec(spec, baseData())
    expect(brand.displayFont).toContain("Noto Serif JP")
    expect(brand.imageTreatment).toBe("natural")
  })
})
