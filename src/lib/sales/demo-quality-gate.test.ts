import { describe, expect, it } from "vitest"
import {
  buildDesignRecipe,
  buildProposalRightsManifest,
  evaluateDemoQuality,
  fingerprint,
  summarizeCandidate,
} from "./demo-quality-gate"
import type { DemoMultiPageData } from "./demo-site-types"
import { DEMO_TEMPLATES } from "./demo-templates/registry"

function fixture(): DemoMultiPageData {
  const contentPage = {
    title: "追加ページ",
    subtitle: "確認済み情報を掲載します。",
    eyebrow: "Proposal",
    sections: [{ id: "section", heading: "掲載内容", body: "内容は確認後に確定します。" }],
    accentColor: "#2563eb",
  }
  return {
    slug: "sample-demo",
    companyId: "company-1",
    companyName: "サンプル商店",
    locale: "ja",
    industry: "retail",
    templateId: "prism",
    premium: {
      style: "retail",
      heroMedia: [1, 2, 3].map((index) => ({ src: `/generated/hero-${index}.jpg`, alt: `提案用画像${index}`, kind: "image" as const })),
      gallery: [1, 2, 3].map((index) => ({ src: `/generated/gallery-${index}.jpg`, alt: `提案用ギャラリー${index}`, kind: "image" as const })),
      intro: { eyebrow: "STORY", title: "丁寧な仕事を伝える", body: "確認済み情報をもとにした紹介文です。" },
      social: [{ label: "Instagram", href: "https://instagram.com/example", network: "instagram" }],
    },
    meta: {
      title: "サンプル商店",
      description: "公開情報を基にした提案デモ",
      ogImage: "",
      industry: "retail",
      locale: "ja",
      companyName: "サンプル商店",
      accentColor: "#2563eb",
      accentColorDark: "#1e40af",
      calBookingUrl: "https://example.com/contact",
      generatedAt: "2026-07-13T00:00:00.000Z",
      engine: "deepseek",
      sourceEvidence: ["google_maps", "instagram"],
    },
    pages: {
      home: {
        hero: {
          title: "暮らしに合う道具を、丁寧に。",
          subtitle: "公開情報を基にした構成提案です。",
          tagline: "提案デモ",
          companyName: "サンプル商店",
          industryLabel: "小売",
          locationLabel: "東京都",
          primaryCta: { text: "お問い合わせ", href: "/contact" },
          secondaryCta: { text: "サービス", href: "/services" },
          accentColor: "#2563eb",
          accentColorDark: "#1e40af",
        },
        features: [
          { title: "特徴1", description: "説明1", icon: "star", metricLabel: "", metricValue: "", metricBench: "", severity: "info" },
          { title: "特徴2", description: "説明2", icon: "star", metricLabel: "", metricValue: "", metricBench: "", severity: "info" },
          { title: "特徴3", description: "説明3", icon: "star", metricLabel: "", metricValue: "", metricBench: "", severity: "info" },
        ],
        stats: [],
        beforeAfter: [],
        totalLoss: "",
        cta: { title: "お問い合わせ", subtitle: "ご相談内容をお知らせください。", buttonText: "お問い合わせ", buttonHref: "/contact", accentColor: "#2563eb", accentColorDark: "#1e40af" },
      },
      about: {
        title: "私たちについて", subtitle: "事業紹介", companyName: "サンプル商店", industryLabel: "小売", locationLabel: "東京都",
        story: "公開情報を基にした紹介文案です。", mission: "内容は確認後に確定します。", values: [], teamNote: "", accentColor: "#2563eb",
      },
      services: {
        title: "サービス", subtitle: "取扱内容", accentColor: "#2563eb",
        services: [
          { title: "サービス1", description: "説明", icon: "star", features: [] },
          { title: "サービス2", description: "説明", icon: "star", features: [] },
        ],
        process: [],
      },
      contact: {
        title: "お問い合わせ", subtitle: "ご相談ください。", companyName: "サンプル商店", email: "", address: "東京都",
        calBookingUrl: "", formNote: "送信内容を確認後にご連絡します。", formEnabled: false, accentColor: "#2563eb",
      },
      works: contentPage,
      news: contentPage,
      faq: contentPage,
      recruit: contentPage,
      privacy: contentPage,
      terms: contentPage,
      commerce: contentPage,
    },
  }
}

describe("demo quality gate", () => {
  it("passes a complete proposal-safe demo and emits stable fingerprints", () => {
    const page = fixture()
    const template = DEMO_TEMPLATES.find((item) => item.id === "prism")!
    const recipe = buildDesignRecipe(template, page)
    const quality = evaluateDemoQuality(page, recipe, buildProposalRightsManifest([
      { src: "/generated/hero-1.jpg", usage: "proposal_only" },
    ]))
    const summary = summarizeCandidate(page, recipe, quality)

    expect(quality.passed).toBe(true)
    expect(quality.score).toBeGreaterThanOrEqual(90)
    expect(summary.structuralFingerprint).toBe(fingerprint(recipe))
    expect(summary.designFingerprint).not.toBe(summary.structuralFingerprint)
  })

  it("blocks fabricated outcomes, financial projections, and synthetic proof", () => {
    const page = fixture()
    page.pages.home.totalLoss = "¥300,000"
    page.pages.home.testimonials = [{ id: "fake", quote: "問い合わせが2倍に増えました。", author: "A社", role: "代表", avatarInitials: "A" }]
    const template = DEMO_TEMPLATES.find((item) => item.id === "prism")!
    const recipe = buildDesignRecipe(template, page)
    const quality = evaluateDemoQuality(page, recipe, buildProposalRightsManifest([
      { src: "/generated/hero-1.jpg", usage: "proposal_only" },
    ]))

    expect(quality.passed).toBe(false)
    expect(quality.hardBlockers).toEqual(expect.arrayContaining([
      "unverified_social_proof",
      "unverified_financial_projection",
      "fabricated_outcome_claim",
    ]))
  })

  it("blocks a structural collision and unknown asset rights", () => {
    const page = fixture()
    const template = DEMO_TEMPLATES.find((item) => item.id === "prism")!
    const recipe = buildDesignRecipe(template, page)
    const rights = buildProposalRightsManifest([{ src: "/generated/hero-1.jpg", usage: "proposal_only" }])
    rights.assets.push({ kind: "image", source: "social media", usage: "unknown" })
    const quality = evaluateDemoQuality(page, recipe, rights, new Set([fingerprint(recipe)]))

    expect(quality.passed).toBe(false)
    expect(quality.hardBlockers).toEqual(expect.arrayContaining([
      "asset_rights_unverified",
      "structural_collision",
    ]))
  })

  it("blocks provider sales copy and a live form from a private customer demo", () => {
    const page = fixture()
    page.pages.home.hero.primaryCta = { text: "Japan Entryについて問い合わせる", href: "https://cal.com/paradigm-jp/15min" }
    page.pages.contact.formEnabled = true
    const template = DEMO_TEMPLATES.find((item) => item.id === "prism")!
    const recipe = buildDesignRecipe(template, page)
    const quality = evaluateDemoQuality(page, recipe, buildProposalRightsManifest([
      { src: "/generated/hero-1.jpg", usage: "proposal_only" },
    ]))

    expect(quality.passed).toBe(false)
    expect(quality.hardBlockers).toEqual(expect.arrayContaining([
      "provider_brand_leak",
      "private_demo_form_send_enabled",
      "unreviewed_external_cta",
    ]))
  })

  it("blocks unsupported history and diagnostic copy", () => {
    const page = fixture()
    page.pages.about.story = "2020年の創業以来、長年の信頼を築いてきました。Inquiry path is not machine-discoverable yet."
    const template = DEMO_TEMPLATES.find((item) => item.id === "prism")!
    const recipe = buildDesignRecipe(template, page)
    const quality = evaluateDemoQuality(page, recipe, buildProposalRightsManifest([
      { src: "/generated/hero-1.jpg", usage: "proposal_only" },
    ]))

    expect(quality.hardBlockers).toEqual(expect.arrayContaining([
      "sales_diagnostic_copy_leak",
      "unsupported_chronology_claim",
      "unsupported_history_claim",
    ]))
  })

  it("blocks invented operations, product details, and image provenance", () => {
    const page = fixture()
    page.pages.about.story = "外は香ばしく中はしっとり。掲載写真は権利確認済みの公式素材です。"
    page.pages.contact.subtitle = "InstagramのDMで予約を承り、翌営業日に返信します。"
    const template = DEMO_TEMPLATES.find((item) => item.id === "prism")!
    const recipe = buildDesignRecipe(template, page)
    const quality = evaluateDemoQuality(page, recipe, buildProposalRightsManifest([
      { src: "/generated/hero-1.jpg", usage: "proposal_only" },
    ]))

    expect(quality.hardBlockers).toEqual(expect.arrayContaining([
      "unsupported_asset_provenance_claim",
      "unsupported_operational_claim",
      "unsupported_product_detail_claim",
    ]))
  })
})
