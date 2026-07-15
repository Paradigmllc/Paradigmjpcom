import { describe, expect, it } from "vitest"
import {
  buildDesignRecipe as buildBaseDesignRecipe,
  buildProposalRightsManifest,
  collidingCandidateIndexes,
  evaluateDemoQuality,
  renderGrammarFingerprint,
  summarizeCandidate,
  visualGrammarSimilarity,
} from "./demo-quality-gate"
import type { DemoMultiPageData } from "./demo-site-types"
import { DEMO_TEMPLATES } from "./demo-templates/registry"
import { upgradeDemoToPremiumV3 } from "./demo-premium-v3"
import type { DemoCreativeDirection } from "./demo-site-types"
const TEST_DIRECTION: DemoCreativeDirection = {
  source: "deepseek",
  concept: "確認済みの商品と場所を静かな編集デザインで伝える",
  typographyStyle: "modern-grotesk",
  heroComposition: "precision-split",
  serviceLayout: "precision-grid",
  worksLayout: "case-grid",
  paletteMood: "cool-professional",
  density: "balanced",
  motion: "editorial",
  signatureMotif: "numbered-index",
}
function buildDesignRecipe(
  template: Parameters<typeof buildBaseDesignRecipe>[0],
  page: Parameters<typeof buildBaseDesignRecipe>[1],
) {
  return buildBaseDesignRecipe(template, page, TEST_DIRECTION)
}
function fixture(): DemoMultiPageData {
  const contentPage = {
    title: "追加ページ",
    subtitle: "確認済み情報を掲載します。",
    eyebrow: "Proposal",
    sections: [{ id: "section", heading: "掲載内容", body: "確認済みの商品、店舗、所在地、公式情報をもとに、初めて利用する方にも分かりやすい順序でご案内します。変わる可能性がある内容は、現在の公式案内をご確認ください。" }],
    accentColor: "#2563eb",
  }
  const narratives = (scope: string) => [1, 2, 3].map((index) => ({
    eyebrow: `${scope.toUpperCase()} 0${index}`,
    title: `${scope}で確かめたいこと ${index}`,
    body: `${scope}では、確認済みの商品、店舗、所在地、公式情報を第${index}の視点から詳しく整理します。初めて知る方が、事業の特徴だけでなく、利用前に確認したいこと、次に見るべき情報、変わる可能性がある内容まで一つの流れで理解できる構成です。公開情報から断定できない価格、在庫、営業時間、個別対応については固定情報として扱わず、現在の公式案内へつなぎます。写真、説明、関連する案内を同じ章にまとめ、ページを行き来しなくても検討に必要な前提を理解できるようにします。`,
    points: [`${scope}の確認済み情報 ${index}`, "現在の提供内容", "公式情報への案内"],
  }))
  const workSections = [1, 2, 3, 4].map((index) => ({
    id: `work-${index}`,
    heading: `商品と店舗の風景 ${index}`,
    body: `確認できる写真と公開情報を組み合わせ、商品や店舗の特徴を第${index}の切り口から具体的に紹介します。見た目だけでなく、どのような商品を扱い、利用前に何を確認でき、次にどのページを見ると判断しやすいかまでを一続きの読み物として整理しています。変わる可能性がある内容は断定せず、現在の公式案内を確認できる導線を設けます。写真の背景にある仕事や利用場面も言葉で補い、単なる画像一覧では終わらない構成にします。`,
  }))
  return {
    slug: "sample-demo",
    companyId: "company-1",
    companyName: "サンプル商店",
    locale: "ja",
    industry: "retail",
    templateId: "prism",
    premium: {
      style: "retail",
      heroMedia: [1, 2, 3].map((index) => ({ src: `/generated/hero-${index}.jpg`, alt: `提案用画像${index}`, kind: "image" as const, width: 1_600, height: 1_000 })),
      gallery: [1, 2, 3].map((index) => ({ src: `/generated/gallery-${index}.jpg`, alt: `提案用ギャラリー${index}`, kind: "image" as const, width: 1_600, height: 1_000 })),
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
      verifiedFacts: ["東京都", "焼菓子"],
      proposalNotice: "提案用デモ · 公式サイトではありません",
      footerDescription: "サンプル商店のご案内です。",
      navLabels: { home: "ホーム", about: "お店について", services: "商品・サービス", works: "ギャラリー", faq: "よくある質問", contact: "店舗情報" },
    },
    pages: {
      home: {
        hero: {
          title: "暮らしに合う道具を、丁寧に。",
          subtitle: "東京都で確認できる商品と店舗情報を、初めて訪れる方にも分かりやすい順序でご案内します。最新情報と提供状況は公式案内をご確認ください。",
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
          { title: "丁寧な商品案内", description: "確認できる商品情報を整理し、特徴や選び方を事実の範囲で分かりやすくご案内します。", icon: "star", metricLabel: "", metricValue: "", metricBench: "", severity: "info" },
          { title: "店舗での体験", description: "所在地や店内の写真、取扱内容を一つの流れで確認でき、訪問前の不安を減らします。", icon: "star", metricLabel: "", metricValue: "", metricBench: "", severity: "info" },
          { title: "正確な最新情報", description: "営業や提供状況が変わる情報は公式案内へつなぎ、未確認の内容を掲載しません。", icon: "star", metricLabel: "", metricValue: "", metricBench: "", severity: "info" },
        ],
        stats: [],
        beforeAfter: [],
        totalLoss: "",
        narrativeModules: narratives("ホーム"),
        cta: { title: "最新情報とアクセスをご確認ください。", subtitle: "商品や営業に関する現在の案内は公式情報をご確認ください。所在地と地図はアクセスページにまとめています。取扱内容や訪問前に確認したい事項は、商品案内とよくある質問からもご覧いただけます。", buttonText: "お問い合わせ", buttonHref: "/contact", accentColor: "#2563eb", accentColorDark: "#1e40af" },
      },
      about: {
        title: "私たちについて", subtitle: "事業紹介", companyName: "サンプル商店", industryLabel: "小売", locationLabel: "東京都",
        story: "サンプル商店は、東京都で確認できる商品と店舗情報を分かりやすく届ける小売店です。初めて訪れる方が、取扱内容、場所、現在の案内を迷わず確認できることを大切にしています。\n\n商品については公開情報で確認できる内容を中心に紹介し、価格、在庫、営業時間など変わる可能性がある情報は公式案内へつなぎます。", mission: "日々の暮らしに寄り添う商品を、正確な情報とともにご案内します。", values: [
          { title: "正確さ", description: "確認できる内容と未確認の内容を分け、現在の情報を誠実にお伝えします。", icon: "shield" },
          { title: "選びやすさ", description: "商品やサービスを比較しやすい順序に整理し、必要な情報へ短くつなぎます。", icon: "star" },
          { title: "地域との接点", description: "所在地やアクセスを明確にし、訪問前に確認したい事項をまとめます。", icon: "users" },
          { title: "継続した案内", description: "営業や提供状況が変わる情報は、公式案内で継続的に更新します。", icon: "lightbulb" },
        ], chapters: narratives("私たちについて"), teamNote: "商品、店舗、営業に関する情報は、事業者が確認した内容だけを公開します。", accentColor: "#2563eb",
      },
      services: {
        title: "サービス", subtitle: "取扱内容", accentColor: "#2563eb",
        processEyebrow: "FLOW",
        processTitle: "ご利用の流れ",
        services: [
          { title: "商品案内", description: "確認済みの商品カテゴリーと選ぶ際に必要な情報を、写真と言葉で分かりやすくご案内します。", icon: "star", features: ["取扱カテゴリー", "写真による紹介", "最新情報への導線"] },
          { title: "店舗案内", description: "店舗の所在地、地図、店内の雰囲気をまとめ、初めて訪れる方が必要な情報を確認できるようにします。", icon: "star", features: ["所在地", "アクセス地図", "店内写真"] },
          { title: "最新情報", description: "営業日や提供状況など変わる可能性がある情報を、公式案内から確認できるようにします。", icon: "star", features: ["営業案内", "提供状況", "公式SNS"] },
        ],
        process: [
          { step: 1, title: "商品を知る", description: "商品・サービスページで確認できる取扱内容をご覧ください。" },
          { step: 2, title: "最新情報を確認", description: "営業日や提供状況など、現在の案内を公式情報から確認します。" },
          { step: 3, title: "場所を確認", description: "アクセスページの所在地と地図から、訪問経路をご確認ください。" },
          { step: 4, title: "正式窓口を利用", description: "掲載情報にない事項は、事業者が案内する正式な窓口をご利用ください。" },
        ],
        guidance: narratives("サービス"),
      },
      contact: {
        title: "お問い合わせ", subtitle: "ご相談ください。", companyName: "サンプル商店", email: "", address: "東京都",
        calBookingUrl: "", formNote: "商品、営業、アクセスに関する現在の情報は公式案内をご確認ください。この提案デモのフォームは入力確認まで体験できますが、外部へ送信されません。所在地と地図、問い合わせ前の注意事項、正式公開時に必要となる入力項目を同じページで確認できます。", formEnabled: false, accentColor: "#2563eb",
      },
      works: { ...contentPage, sections: workSections },
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
    const basePage = fixture()
    const template = DEMO_TEMPLATES.find((item) => item.id === "prism")!
    const recipe = buildDesignRecipe(template, basePage)
    const page = upgradeDemoToPremiumV3(basePage, recipe)
    const brandedRecipe = page.designRecipe ?? recipe
    const quality = evaluateDemoQuality(page, brandedRecipe, buildProposalRightsManifest([
      { src: "/generated/hero-1.jpg", usage: "proposal_only" },
    ]))
    const summary = summarizeCandidate(page, brandedRecipe, quality)

    expect(quality.passed, JSON.stringify(quality)).toBe(true)
    expect(quality.score).toBeGreaterThanOrEqual(92)
    expect(summary.structuralFingerprint).toBe(renderGrammarFingerprint(brandedRecipe))
    expect(summary.designFingerprint).not.toBe(summary.structuralFingerprint)
  })
  it("does not mistake reused reviewed-media captions for duplicated body copy", () => {
    const basePage = fixture()
    const caption = "エキテン公式店舗掲載画像をブラウザで目視確認。人物・透かしなし。非公開提案デモ限定。"
    basePage.premium!.heroMedia = basePage.premium!.heroMedia.map((media) => ({ ...media, caption }))
    basePage.premium!.gallery = basePage.premium!.gallery.map((media) => ({ ...media, caption }))
    const template = DEMO_TEMPLATES.find((item) => item.id === "prism")!
    const recipe = buildDesignRecipe(template, basePage)
    const page = upgradeDemoToPremiumV3(basePage, recipe)
    const quality = evaluateDemoQuality(page, page.designRecipe ?? recipe, buildProposalRightsManifest([
      { src: "/generated/hero-1.jpg", usage: "proposal_only" },
    ]))

    expect(quality.hardBlockers).not.toContain("repeated_customer_copy")
  })
  it("still blocks genuinely repeated long body copy", () => {
    const page = fixture()
    const repeated = "同じ長い本文を複数の独立したセクションへ繰り返し掲載すると、読み手には薄いテンプレートとして見えてしまいます。"
    page.pages.works!.sections = [1, 2, 3].map((index) => ({ id: `duplicate-${index}`, heading: `内容${index}`, body: repeated }))
    const template = DEMO_TEMPLATES.find((item) => item.id === "prism")!
    const recipe = buildDesignRecipe(template, page)
    const quality = evaluateDemoQuality(page, recipe, buildProposalRightsManifest([
      { src: "/generated/hero-1.jpg", usage: "proposal_only" },
    ]))

    expect(quality.hardBlockers).toContain("repeated_customer_copy")
  })
  it("blocks a home page that repeats its hero as the editorial introduction", () => {
    const page = fixture()
    page.premium!.intro.title = page.pages.home.hero.title
    const template = DEMO_TEMPLATES.find((item) => item.id === "prism")!
    const recipe = buildDesignRecipe(template, page)
    const quality = evaluateDemoQuality(page, recipe, buildProposalRightsManifest([
      { src: "/generated/hero-1.jpg", usage: "proposal_only" },
    ]))

    expect(quality.passed).toBe(false)
    expect(quality.hardBlockers).toContain("repeated_home_narrative")
  })

  it("accepts a registry-verified corporate demo without forcing an SNS account", () => {
    const basePage = fixture()
    basePage.industry = "construction"
    basePage.premium!.social = []
    basePage.meta.sourceEvidence = ["public_registry"]
    const template = DEMO_TEMPLATES.find((item) => item.id === "prism")!
    const recipe = buildDesignRecipe(template, basePage)
    const page = upgradeDemoToPremiumV3(basePage, recipe)
    const quality = evaluateDemoQuality(page, page.designRecipe ?? recipe, buildProposalRightsManifest([
      { src: "/generated/hero-1.jpg", usage: "proposal_only" },
    ]))

    expect(quality.hardBlockers, JSON.stringify(quality)).toEqual([])
    expect(quality.hardBlockers).not.toContain("verified_brand_path_missing")
    expect(page.pages.contact.formNote).not.toContain("公式SNS")
    expect(new Set([
      page.pages.home.cta.subtitle,
      page.pages.services.ctaSubtitle,
      page.pages.contact.formNote,
    ]).size).toBe(3)
  })

  it("blocks a demo that has neither a verified source path nor an official social path", () => {
    const basePage = fixture()
    basePage.premium!.social = []
    basePage.meta.sourceEvidence = []
    const template = DEMO_TEMPLATES.find((item) => item.id === "prism")!
    const recipe = buildDesignRecipe(template, basePage)
    const page = upgradeDemoToPremiumV3(basePage, recipe)
    const quality = evaluateDemoQuality(page, page.designRecipe ?? recipe, buildProposalRightsManifest([
      { src: "/generated/hero-1.jpg", usage: "proposal_only" },
    ]))

    expect(quality.passed).toBe(false)
    expect(quality.hardBlockers).toContain("verified_source_coverage_missing")
    expect(quality.hardBlockers).toContain("verified_brand_path_missing")
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
    const quality = evaluateDemoQuality(page, recipe, rights, new Set([renderGrammarFingerprint(recipe)]))

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

  it("blocks thin template copy even when rights and required pages are present", () => {
    const page = fixture()
    page.pages.works = {
      ...page.pages.works!,
      title: "実績",
      sections: [{ id: "placeholder", heading: "代表事例 01", body: "ヒアリング後に確定します。" }],
    }
    const template = DEMO_TEMPLATES.find((item) => item.id === "prism")!
    const recipe = buildDesignRecipe(template, page)
    const quality = evaluateDemoQuality(page, recipe, buildProposalRightsManifest([
      { src: "/generated/hero-1.jpg", usage: "proposal_only" },
    ]))

    expect(quality.passed).toBe(false)
    expect(quality.score).toBeLessThanOrEqual(70)
    expect(quality.hardBlockers).toContain("customer_facing_draft_copy")
    expect(quality.dimensions).toEqual(expect.objectContaining({ specificity: expect.any(Number), contentDepth: expect.any(Number) }))
  })

  it("blocks source-health metadata and repeated editorial sentences from inflating content depth", () => {
    const page = fixture()
    const repeated = "写真と言葉の間に余白を持たせ、日々の利用場面を想像しながら読み進められる構成にしています。"
    page.pages.about.story = `${repeated}${repeated}`
    page.pages.works!.sections[0].body = "登録公式URL non-hair-salon.business.site は2026年7月14日に404を確認。"
    const template = DEMO_TEMPLATES.find((item) => item.id === "prism")!
    const recipe = buildDesignRecipe(template, page)
    const quality = evaluateDemoQuality(page, recipe, buildProposalRightsManifest([
      { src: "/generated/hero-1.jpg", usage: "proposal_only" },
    ]))

    expect(quality.passed).toBe(false)
    expect(quality.hardBlockers).toEqual(expect.arrayContaining([
      "editorial_source_metadata_leak",
      "repeated_editorial_fragment",
    ]))
  })

  it("blocks the former shallow page architecture even when legacy fields exist", () => {
    const page = fixture()
    page.pages.home.narrativeModules = []
    page.pages.about.chapters = []
    page.pages.services.guidance = []
    page.pages.works!.sections = page.pages.works!.sections.slice(0, 2)
    const template = DEMO_TEMPLATES.find((item) => item.id === "prism")!
    const recipe = buildDesignRecipe(template, page)
    const quality = evaluateDemoQuality(page, recipe, buildProposalRightsManifest([
      { src: "/generated/hero-1.jpg", usage: "proposal_only" },
    ]))

    expect(quality.passed).toBe(false)
    expect(quality.hardBlockers).toEqual(expect.arrayContaining([
      "home_narrative_depth_missing",
      "about_narrative_depth_missing",
      "service_guidance_depth_missing",
      "works_content_architecture_missing",
    ]))
  })

  it("blocks a full site that repeats one composition across its lower pages", () => {
    const basePage = fixture()
    const template = DEMO_TEMPLATES.find((item) => item.id === "prism")!
    const recipe = buildDesignRecipe(template, basePage)
    const repeatedRecipe = {
      ...recipe,
      pageCompositions: Object.fromEntries(
        Object.keys(recipe.pageCompositions ?? {}).map((key) => [key, "same-layout"]),
      ) as typeof recipe.pageCompositions,
    }
    const page = upgradeDemoToPremiumV3(basePage, repeatedRecipe)
    const quality = evaluateDemoQuality(page, repeatedRecipe, buildProposalRightsManifest([
      { src: "/generated/hero-1.jpg", usage: "proposal_only" },
    ]))

    expect(quality.passed).toBe(false)
    expect(quality.hardBlockers).toContain("page_composition_repetition")
  })

  it("blocks every non-mosaic hero when the reviewed source is only a thumbnail", () => {
    const basePage = fixture()
    basePage.premium!.heroMedia[0] = {
      ...basePage.premium!.heroMedia[0],
      src: "https://image.ekiten.jp/shop/1/photo/1?1to1_m",
      width: 159,
      height: 159,
    }
    const template = DEMO_TEMPLATES.find((item) => item.id === "prism")!
    const recipe = buildBaseDesignRecipe(template, basePage, {
      ...TEST_DIRECTION,
      heroComposition: "cinematic",
    })
    const page = upgradeDemoToPremiumV3(basePage, recipe)
    const quality = evaluateDemoQuality(page, page.designRecipe ?? recipe, buildProposalRightsManifest([
      { src: basePage.premium!.heroMedia[0].src, usage: "proposal_only" },
    ]))

    expect(quality.passed).toBe(false)
    expect(quality.hardBlockers).toContain("hero_media_resolution_risk")
    expect(quality.assessmentStage).toBe("structural_preflight")
  })

  it("fails closed on unknown hero dimensions but permits a low-resolution mosaic", () => {
    const basePage = fixture()
    basePage.premium!.heroMedia[0] = {
      src: "https://image.example.test/reviewed-source.jpg",
      alt: "寸法未確認の審査素材",
      kind: "image",
    }
    const template = DEMO_TEMPLATES.find((item) => item.id === "prism")!
    const splitRecipe = buildBaseDesignRecipe(template, basePage, {
      ...TEST_DIRECTION,
      heroComposition: "precision-split",
    })
    const splitQuality = evaluateDemoQuality(basePage, splitRecipe, buildProposalRightsManifest([
      { src: basePage.premium!.heroMedia[0].src, usage: "proposal_only" },
    ]))
    const mosaicRecipe = buildBaseDesignRecipe(template, basePage, {
      ...TEST_DIRECTION,
      heroComposition: "mosaic",
    })
    const mosaicQuality = evaluateDemoQuality(basePage, mosaicRecipe, buildProposalRightsManifest([
      { src: basePage.premium!.heroMedia[0].src, usage: "proposal_only" },
    ]))

    expect(splitQuality.hardBlockers).toContain("hero_media_resolution_risk")
    expect(mosaicQuality.hardBlockers).not.toContain("hero_media_resolution_risk")
  })

  it("detects candidates that only change template IDs but render the same visual grammar", () => {
    const page = fixture()
    const templates = DEMO_TEMPLATES.slice(0, 3)
    const recipes = templates.map((template) => buildBaseDesignRecipe(template, page, TEST_DIRECTION))

    expect(collidingCandidateIndexes(recipes)).toEqual(new Set([0, 1, 2]))
  })

  it("blocks candidates and existing demos that are visually near-identical", () => {
    const page = fixture()
    const templates = DEMO_TEMPLATES.slice(0, 2)
    const nearMatch: DemoCreativeDirection = { ...TEST_DIRECTION, motion: "restrained" }
    const recipes = [
      buildBaseDesignRecipe(templates[0], page, TEST_DIRECTION),
      buildBaseDesignRecipe(templates[1], page, nearMatch),
    ]
    const quality = evaluateDemoQuality(
      page,
      recipes[0],
      buildProposalRightsManifest([{ src: "/generated/hero-1.jpg", usage: "proposal_only" }]),
      new Set(),
      [nearMatch],
    )

    expect(visualGrammarSimilarity(TEST_DIRECTION, nearMatch)).toBeGreaterThanOrEqual(0.8)
    expect(collidingCandidateIndexes(recipes)).toEqual(new Set([0, 1]))
    expect(quality.hardBlockers).toContain("visual_similarity_collision")
  })

  it("keeps exact grammar collisions blocked while allowing scalable near-match batches", () => {
    const page = fixture()
    const template = DEMO_TEMPLATES[0]
    const nearMatch: DemoCreativeDirection = { ...TEST_DIRECTION, motion: "restrained" }
    const recipe = buildBaseDesignRecipe(template, page, TEST_DIRECTION)
    const quality = evaluateDemoQuality(
      page,
      recipe,
      buildProposalRightsManifest([{ src: "/generated/hero-1.jpg", usage: "proposal_only" }]),
      new Set(),
      Array.from({ length: 300 }, () => nearMatch),
    )

    expect(quality.hardBlockers).not.toContain("visual_similarity_collision")
    expect(quality.hardBlockers).not.toContain("structural_collision")
  })
})
