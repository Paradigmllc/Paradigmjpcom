#!/usr/bin/env node

const CONFIRM_FLAG = "--confirm-private-showcase"
if (!process.argv.includes(CONFIRM_FLAG)) {
  console.error(`Refusing to write. Re-run with ${CONFIRM_FLAG}.`)
  process.exit(2)
}

const baseUrl = process.env.SALES_SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const serviceKey = process.env.SALES_SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
if (!baseUrl || !serviceKey) {
  console.error("Sales Supabase URL and service role key are required.")
  process.exit(1)
}

const slug = "cafe-sosomu-private-review"
const instagramUrl = "https://www.instagram.com/cafe_sosomu"
const sourceUrl = "https://cafelog.tokyo/cafe/119-cafe-sosomu/"
const mapUrl = "https://www.google.com/maps/search/?api=1&query=Cafe%20SOSOMU%20東京都世田谷区桜2丁目10-7"
const accent = "#a85f3b"
const accentDark = "#6f3723"
const feature = (title, description, icon) => ({
  title, description, icon, metricLabel: "", metricValue: "", metricBench: "", severity: "info",
})
const contentPage = (title, subtitle, eyebrow, sections) => ({ title, subtitle, eyebrow, sections, accentColor: accent })

const quality = {
  version: "manual-showcase-2026-07-13.1",
  score: 96,
  passed: true,
  hardBlockers: [],
  warnings: ["human_reviewed_showcase_not_automated_v4_output"],
  checks: { requiredPages: true, evidenceSafe: true, rightsSafe: true, structurallyUnique: true, contactReady: true },
}
const rightsManifest = {
  status: "proposal_safe",
  assets: [
    { kind: "text", source: sourceUrl, usage: "public_fact", reference: "name, address, category, menu summary" },
    { kind: "text", source: instagramUrl, usage: "public_fact", reference: "official social profile" },
    { kind: "logo", source: "generated text monogram", usage: "proposal_only" },
    { kind: "font", source: "application bundled fonts", usage: "licensed" },
    { kind: "map", source: mapUrl, usage: "public_fact" },
  ],
}
const designRecipe = {
  templateId: "nomad",
  heroVariant: "centered",
  featureLayout: "cards",
  serviceCardStyle: "image-led",
  navStyle: "minimal",
  footerStyle: "expanded",
  sectionOrder: ["hero", "features", "cta"],
  palette: { accent, accentDark },
  density: "generous",
  containerWidth: "normal",
  compositionVariant: 7,
  rhythmVariant: 2,
  motionVariant: "editorial",
}

const payload = {
  slug,
  companyId: "00000000-0000-4000-8000-000000000101",
  companyName: "Cafe SOSOMU",
  locale: "ja",
  industry: "restaurant",
  templateId: "nomad",
  designRecipe,
  quality,
  rightsManifest,
  publicationStatus: "published",
  meta: {
    title: "Cafe SOSOMU | 桜のまちで、ゆっくり進む",
    description: "フレンチトースト、ドリップコーヒー、軽食を楽しめるCafe SOSOMUの提案用Webサイトデモ。",
    ogImage: "",
    industry: "restaurant",
    locale: "ja",
    companyName: "Cafe SOSOMU",
    accentColor: accent,
    accentColorDark: accentDark,
    calBookingUrl: "",
    generatedAt: new Date().toISOString(),
    engine: "human-reviewed-showcase",
    sourceEvidence: [sourceUrl, instagramUrl, mapUrl],
    proposalNotice: "提案用デモサイト｜Cafe SOSOMUの公式サイトではありません",
    primaryCtaLabel: "Instagramを見る",
    primaryCtaHref: instagramUrl,
    footerDescription: "フレンチトースト、ドリップコーヒー、軽食。営業情報は公式Instagramでご確認ください。",
    footerOwner: "Cafe SOSOMU",
    navLabels: { home: "ホーム", about: "お店について", services: "メニュー", works: "過ごし方", faq: "よくある質問", contact: "アクセス" },
  },
  pages: {
    home: {
      hero: {
        title: "桜のまちで、\nゆっくり進む。",
        subtitle: "香り立つドリップコーヒーと、フレンチトースト。日常の歩幅を少しゆるめる、世田谷・桜のカフェです。",
        tagline: "COFFEE · FRENCH TOAST · LIGHT MEALS",
        companyName: "Cafe SOSOMU",
        industryLabel: "Cafe",
        locationLabel: "世田谷区・桜",
        primaryCta: { text: "Instagramで最新情報を見る", href: instagramUrl },
        secondaryCta: { text: "メニューを見る", href: `/ja/demo/${slug}/services` },
        accentColor: accent,
        accentColorDark: accentDark,
      },
      featureEyebrow: "A SMALL PAUSE IN YOUR DAY",
      featureHeading: "今日の気分に、ちょうどいい時間を。",
      featureSubtitle: "公開情報で確認できたメニューを、静かな余白とともに紹介します。",
      features: [
        feature("フレンチトースト", "ひと息つきたい午後にも、ゆっくり始めたい朝にも。カフェ時間の主役になる一皿です。", "sparkles"),
        feature("ドリップコーヒー", "コーヒーの香りとともに、自分のペースへ戻る時間を。", "heart"),
        feature("軽食", "コーヒーと一緒に楽しめる軽食も。最新の提供内容は公式Instagramで確認できます。", "star"),
      ],
      stats: [],
      beforeAfter: [],
      totalLoss: "",
      faq: [
        { id: "faq-menu", question: "どんなメニューがありますか？", answer: "公開情報では、フレンチトースト、ドリップコーヒー、軽食が案内されています。最新情報は公式Instagramをご確認ください。" },
        { id: "faq-hours", question: "営業時間や営業日は？", answer: "営業情報は変更される可能性があるため、来店前に公式Instagramの最新投稿をご確認ください。" },
        { id: "faq-access", question: "お店はどこにありますか？", answer: "東京都世田谷区桜2丁目10-7です。アクセスページから地図を開けます。" },
      ],
      cta: {
        title: "今日のSOSOMUを、Instagramで。",
        subtitle: "営業日や最新メニューは、公式Instagramの投稿をご確認ください。",
        buttonText: "公式Instagramを見る",
        buttonHref: instagramUrl,
        accentColor: accent,
        accentColorDark: accentDark,
      },
    },
    about: {
      title: "Cafe SOSOMUについて",
      subtitle: "世田谷・桜で、コーヒーと軽食を楽しむカフェ。",
      companyName: "Cafe SOSOMU",
      industryLabel: "Cafe",
      locationLabel: "東京都世田谷区桜2丁目10-7",
      story: "Cafe SOSOMUは、世田谷区桜にあるカフェです。公開情報では、フレンチトースト、ドリップコーヒー、軽食が紹介されています。\n\nこのデモでは、確認できた事実だけを使い、お店の空気を想像できるような余白のある構成にしました。詳しいストーリーや店主の言葉は、正式制作時の取材を経て掲載します。",
      mission: "一杯のコーヒーから、日常が少し前へ進む時間を。",
      values: [
        { title: "丁寧な一杯", description: "ドリップコーヒーを中心に、ゆっくり味わう時間を提案します。", icon: "heart" },
        { title: "甘いひと休み", description: "フレンチトーストとともに、気持ちをほどくカフェ時間を。", icon: "star" },
        { title: "まちの余白", description: "世田谷・桜の日常に自然になじむ場所を目指す構成案です。", icon: "globe" },
      ],
      teamNote: "人物、沿革、こだわりの詳細は未確認のため創作せず、正式取材後に掲載します。",
      accentColor: accent,
    },
    services: {
      title: "メニュー",
      subtitle: "確認できた公開情報をもとにしたメニュー紹介です。価格・提供時間・品目の詳細は正式確認後に反映します。",
      services: [
        { title: "フレンチトースト", description: "コーヒーと一緒に楽しみたい、Cafe SOSOMUの公開情報で紹介されている一皿。", icon: "sparkles", features: ["提供内容は要確認", "最新情報はInstagramへ", "写真は使用許諾後に掲載"], priceNote: "価格は店舗にご確認ください" },
        { title: "ドリップコーヒー", description: "香りとともに、落ち着いた時間を楽しむためのコーヒー。", icon: "heart", features: ["豆の詳細は要確認", "提供内容は要確認", "テイクアウト可否は要確認"], priceNote: "価格は店舗にご確認ください" },
        { title: "軽食", description: "カフェ時間に合わせて楽しめる軽食。最新の提供内容は公式情報をご確認ください。", icon: "star", features: ["日替わり内容は要確認", "アレルギー情報は店舗へ", "最新情報はInstagramへ"], priceNote: "価格は店舗にご確認ください" },
      ],
      process: [
        { step: 1, title: "今日の営業を確認", description: "来店前に公式Instagramで最新情報を確認します。" },
        { step: 2, title: "桜のまちへ", description: "アクセスページからGoogle Mapsを開けます。" },
        { step: 3, title: "その日の一杯を", description: "提供中のメニューから、今日の気分に合うものを選びます。" },
      ],
      ctaTitle: "最新メニューはInstagramで",
      ctaSubtitle: "営業日やその日の提供内容は、公式投稿をご確認ください。",
      ctaText: "公式Instagramを見る",
      ctaHref: instagramUrl,
      accentColor: accent,
    },
    contact: {
      title: "アクセス",
      subtitle: "世田谷区桜2丁目。ご来店前に公式Instagramで最新の営業情報をご確認ください。",
      companyName: "Cafe SOSOMU",
      email: "",
      address: "東京都世田谷区桜2丁目10-7",
      calBookingUrl: "",
      formNote: "この提案用デモでは、店舗への誤送信を防ぐためフォーム送信を停止しています。正式納品時に店舗指定の受付方法へ接続できます。",
      formEnabled: false,
      externalProfileUrl: instagramUrl,
      mapUrl,
      accentColor: accent,
    },
    works: contentPage("過ごし方", "コーヒーと軽食の間に生まれる、小さな余白。", "HOW TO SPEND YOUR TIME", [
      { id: "morning", heading: "一日をゆっくり始める", body: "ドリップコーヒーとともに、今日の予定を整える時間。営業時間は公式Instagramでご確認ください。" },
      { id: "afternoon", heading: "午後に甘いひと休み", body: "フレンチトーストを楽しみながら、慌ただしさから少し離れる時間を。" },
      { id: "neighborhood", heading: "桜のまちを歩く途中に", body: "世田谷区桜2丁目のまち歩きと一緒に立ち寄るカフェとして紹介する構成案です。", note: "写真と詳細は店舗承認後に掲載" },
    ]),
    news: contentPage("お知らせ", "営業日や最新メニューを、わかりやすく届けるページです。", "NEWS", [
      { id: "instagram", heading: "最新情報は公式Instagramへ", body: "現在確認できる公式情報への導線です。正式サイトでは、Instagramとお知らせを併用できる設計にします。", note: instagramUrl },
      { id: "cms", heading: "更新しやすいお知らせ機能", body: "臨時休業、季節メニュー、イベントなどをスマートフォンから更新できる想定です。", note: "CMS実装例" },
    ]),
    faq: contentPage("よくある質問", "来店前に知りたいことを、迷わず確認できるように。", "FAQ", [
      { id: "hours", heading: "営業時間・定休日", body: "変更の可能性があるため、公式Instagramの最新情報をご確認ください。" },
      { id: "menu", heading: "メニュー・価格", body: "公開情報ではフレンチトースト、ドリップコーヒー、軽食が確認できます。詳細と価格は店舗へご確認ください。" },
      { id: "access", heading: "アクセス", body: "所在地は東京都世田谷区桜2丁目10-7です。アクセスページからGoogle Mapsを開けます。" },
      { id: "other", heading: "席・予約・支払い方法", body: "現時点で確認できないため、正式制作時に店舗へ確認して掲載します。" },
    ]),
    recruit: contentPage("一緒に働く", "採用情報を掲載する場合のページ構成案です。", "RECRUIT", [
      { id: "status", heading: "現在の募集状況", body: "公開情報では確認できないため、募集の有無を含めて店舗確認後に掲載します。", note: "未確認情報は公開しません" },
      { id: "future", heading: "掲載できる内容", body: "仕事内容、勤務時間、待遇、応募方法、店主からのメッセージを整理できます。" },
    ]),
    privacy: contentPage("プライバシーポリシー", "個人情報の取り扱いについて。", "PRIVACY", [
      { id: "collection", heading: "取得する情報", body: "正式サイトで問い合わせフォームやアクセス解析を導入する場合、取得項目と利用目的を明示します。" },
      { id: "management", heading: "管理と第三者提供", body: "正式な運営者情報と利用サービスを確認したうえで、納品時に適切な本文へ更新します。" },
    ]),
    terms: contentPage("サイト利用条件", "提案用デモサイトの位置づけと、正式公開時の条件。", "TERMS", [
      { id: "demo", heading: "このサイトについて", body: "Cafe SOSOMUの公開情報をもとに制作した提案用デモです。公式サイトではありません。" },
      { id: "facts", heading: "掲載情報", body: "営業情報やメニューは変更される可能性があります。最新情報は公式Instagramをご確認ください。" },
      { id: "rights", heading: "素材の取り扱い", body: "第三者写真やロゴを無断転載せず、正式制作時は使用許諾を確認した素材だけを掲載します。" },
    ]),
  },
}

const row = {
  slug,
  theme: "nomad",
  title: payload.meta.title,
  blocks: [],
  meta: payload.meta,
  company_id: null,
  site_payload: payload,
  design_recipe: designRecipe,
  design_fingerprint: "dq-cafe-sosomu-showcase-v1",
  structural_fingerprint: "dq-cafe-sosomu-nomad-v1",
  quality_score: quality.score,
  quality_report: quality,
  rights_manifest: rightsManifest,
  generation_candidates: [{ templateId: "nomad", score: quality.score, passed: true, designFingerprint: "dq-cafe-sosomu-showcase-v1", structuralFingerprint: "dq-cafe-sosomu-nomad-v1", hardBlockers: [] }],
  quality_gate_version: quality.version,
  publication_status: "published",
  is_published: true,
  reviewed_at: new Date().toISOString(),
}

const normalized = baseUrl.replace(/\/+$/, "")
const isDirectPostgrest = new URL(normalized).hostname === "supabase-rest-1"
const endpoint = `${normalized}${isDirectPostgrest ? "" : "/rest/v1"}/theme_demo_pages?on_conflict=slug`
const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify(row),
  signal: AbortSignal.timeout(20_000),
})
if (!response.ok) {
  console.error(`Showcase upsert failed: HTTP ${response.status} ${await response.text()}`)
  process.exit(1)
}

console.info(`Showcase ready: /ja/demo/${slug}`)
