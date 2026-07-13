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

const slug = "oikawa-yogashiten-private-review"
const instagramUrl = "https://www.instagram.com/oikawa_yogashiten/"
const noteUrl = "https://note.com/oikawa_yogashi"
const storyUrl = "https://note.com/oikawa_yogashi/n/n6dfed9aaa479"
const mapUrl = "https://www.google.com/maps/search/?api=1&query=及川洋菓子店%20東京都世田谷区代沢5-6-14"
const accent = "#742f32"
const accentDark = "#3d2020"
const feature = (title, description, icon) => ({
  title, description, icon, metricLabel: "", metricValue: "", metricBench: "", severity: "info",
})
const contentPage = (title, subtitle, eyebrow, sections) => ({ title, subtitle, eyebrow, sections, accentColor: accent })

const quality = {
  version: "manual-showcase-2026-07-13.2",
  score: 97,
  passed: true,
  hardBlockers: [],
  warnings: ["human_reviewed_showcase_not_automated_v4_output"],
  checks: { requiredPages: true, evidenceSafe: true, rightsSafe: true, structurallyUnique: true, contactReady: true },
}
const rightsManifest = {
  status: "proposal_safe",
  assets: [
    { kind: "text", source: noteUrl, usage: "public_fact", reference: "official profile, European baked sweets, weekend opening, Instagram" },
    { kind: "text", source: storyUrl, usage: "public_fact", reference: "official story, opening year, address, weekly schedule guidance" },
    { kind: "text", source: instagramUrl, usage: "public_fact", reference: "official opening and lineup channel" },
    { kind: "logo", source: "generated text monogram", usage: "proposal_only" },
    { kind: "image", source: "/demos/oikawa-yogashi/hero.jpg", usage: "proposal_only", reference: "OpenAI-generated concept visual" },
    { kind: "image", source: "/demos/oikawa-yogashi/craft.jpg", usage: "proposal_only", reference: "OpenAI-generated concept visual" },
    { kind: "image", source: "/demos/oikawa-yogashi/weekend-entry.jpg", usage: "proposal_only", reference: "OpenAI-generated concept visual" },
    { kind: "font", source: "application bundled fonts", usage: "licensed" },
    { kind: "map", source: mapUrl, usage: "public_fact" },
  ],
}
const premium = {
  style: "craft",
  heroMedia: [
    { src: "/demos/oikawa-yogashi/hero.jpg", alt: "ヨーロッパの焼菓子を木のテーブルに並べた提案用イメージ", kind: "image", caption: "European baked sweets for the weekend", objectPosition: "55% center" },
    { src: "/demos/oikawa-yogashi/craft.jpg", alt: "焼菓子を一つずつ仕上げる手元の提案用イメージ", kind: "image", caption: "Small batches, carefully finished", objectPosition: "center" },
    { src: "/demos/oikawa-yogashi/weekend-entry.jpg", alt: "住宅街の小さな店へ向かう週末の提案用イメージ", kind: "image", caption: "A hidden weekend stop in Shimokitazawa", objectPosition: "center" },
  ],
  gallery: [
    { src: "/demos/oikawa-yogashi/hero.jpg", alt: "焼き色の美しい焼菓子の提案用イメージ", kind: "image", caption: "週末に並ぶ、ヨーロッパの焼菓子", objectPosition: "55% center" },
    { src: "/demos/oikawa-yogashi/craft.jpg", alt: "焼菓子を仕上げる手元の提案用イメージ", kind: "image", caption: "その週のラインナップを、一つずつ", objectPosition: "center" },
    { src: "/demos/oikawa-yogashi/weekend-entry.jpg", alt: "下北沢の住宅街にある小さな店を想起させる提案用イメージ", kind: "image", caption: "下北沢の小さなアパート、その二階へ", objectPosition: "center" },
  ],
  intro: {
    eyebrow: "A LITTLE SHOP FOR THE WEEKEND",
    title: "アパートの二階に、\n週末だけの洋菓子店。",
    body: "及川洋菓子店は、東京・下北沢で週末を中心に店を開く小さな洋菓子店です。\nフランスやスペインなど、ヨーロッパの焼菓子を中心に、その週のお菓子を届けています。",
    note: "掲載写真は公開事実から着想した提案用コンセプトビジュアルです。実際の商品・店内・外観ではありません。正式制作時に店舗承認済みの実写へ差し替えます。",
  },
  social: [{ label: "及川洋菓子店 公式Instagram", href: instagramUrl, network: "instagram" }],
}

const designRecipe = {
  templateId: "nomad",
  heroVariant: "editorial-split",
  featureLayout: "numbered-list",
  serviceCardStyle: "letterpress",
  navStyle: "minimal",
  footerStyle: "expanded",
  sectionOrder: ["hero", "story", "products", "gallery", "faq", "cta"],
  palette: { accent, accentDark },
  density: "editorial",
  containerWidth: "wide",
  compositionVariant: 11,
  rhythmVariant: 4,
  motionVariant: "craft-marquee",
}

const payload = {
  slug,
  companyId: "00000000-0000-4000-8000-000000000102",
  companyName: "及川洋菓子店",
  locale: "ja",
  industry: "restaurant",
  templateId: "nomad",
  premium,
  designRecipe,
  quality,
  rightsManifest,
  publicationStatus: "published",
  meta: {
    title: "及川洋菓子店 | 週末、焼き上がります。",
    description: "下北沢で週末を中心に営業する、ヨーロッパの焼菓子を扱う及川洋菓子店の提案用Webサイトデモ。",
    ogImage: "/demos/oikawa-yogashi/hero.jpg",
    industry: "restaurant",
    locale: "ja",
    companyName: "及川洋菓子店",
    accentColor: accent,
    accentColorDark: accentDark,
    calBookingUrl: "",
    generatedAt: new Date().toISOString(),
    engine: "human-reviewed-showcase",
    sourceEvidence: [noteUrl, storyUrl, instagramUrl, mapUrl],
    proposalNotice: "提案用デモサイト｜及川洋菓子店の公式サイトではありません",
    primaryCtaLabel: "今週の営業を見る",
    primaryCtaHref: instagramUrl,
    footerDescription: "フランスやスペインなどヨーロッパの焼菓子を中心に、週末の下北沢で営業。最新情報は公式Instagramへ。",
    footerOwner: "及川洋菓子店",
    navLabels: { home: "ホーム", about: "店について", services: "お菓子", works: "週末の店", faq: "よくある質問", contact: "アクセス" },
  },
  pages: {
    home: {
      hero: {
        title: "週末、\n焼き上がります。",
        subtitle: "フランスやスペインなど、ヨーロッパの焼菓子を中心に。下北沢の小さな店から、週末のお菓子を届けます。",
        tagline: "EUROPEAN BAKED SWEETS · SHIMOKITAZAWA",
        companyName: "及川洋菓子店",
        industryLabel: "Weekend pastry shop",
        locationLabel: "東京・下北沢",
        primaryCta: { text: "今週の営業を見る", href: instagramUrl },
        secondaryCta: { text: "お菓子について", href: `/ja/demo/${slug}/services` },
        accentColor: accent,
        accentColorDark: accentDark,
      },
      featureEyebrow: "THIS WEEKEND'S TABLE",
      featureHeading: "その週に焼き上がるものを。",
      featureSubtitle: "毎週のラインナップと営業日は、公式Instagramで案内されています。",
      features: [
        feature("ヨーロッパの焼菓子", "フランスやスペインなど、ヨーロッパの焼菓子を中心に扱う店です。", "sparkles"),
        feature("週末のラインナップ", "その週に並ぶお菓子と営業情報は、公式Instagramで案内されています。", "star"),
        feature("下北沢の小さな店", "代沢の小さなアパート二階で、2020年3月に店を開いたと公式noteで紹介されています。", "heart"),
      ],
      stats: [],
      beforeAfter: [],
      totalLoss: "",
      faq: [
        { id: "faq-open", question: "営業日はいつですか？", answer: "週末を中心に営業しています。週ごとに変わる可能性があるため、公式Instagramの最新投稿をご確認ください。" },
        { id: "faq-menu", question: "どんなお菓子がありますか？", answer: "フランスやスペインなどヨーロッパの焼菓子が中心です。その週のラインナップは公式Instagramで案内されています。" },
        { id: "faq-access", question: "お店はどこにありますか？", answer: "東京都世田谷区代沢5-6-14 岩本荘2Fです。公式noteの道順とInstagramの最新案内もあわせてご確認ください。" },
      ],
      cta: {
        title: "今週のお菓子と営業日を、\nInstagramで。",
        subtitle: "その週のラインナップ、営業日、道順は公式Instagramの最新情報をご確認ください。",
        buttonText: "公式Instagramを見る",
        buttonHref: instagramUrl,
        accentColor: accent,
        accentColorDark: accentDark,
      },
    },
    about: {
      title: "及川洋菓子店について",
      subtitle: "下北沢の小さなアパートで、週末を中心に開く洋菓子店。",
      companyName: "及川洋菓子店",
      industryLabel: "Weekend pastry shop",
      locationLabel: "東京都世田谷区代沢5-6-14 岩本荘2F",
      story: "及川洋菓子店は、東京・下北沢で週末を中心に営業する小さな洋菓子店です。公式noteでは、友人からお菓子の依頼を受けるようになったことをきっかけに、2020年3月、小さなアパートの二階で店を開いたと紹介されています。\n\nフランスやスペインなどヨーロッパの焼菓子を中心に、その週に並ぶお菓子を届けています。営業日とラインナップは公式Instagramで案内されています。",
      mission: "皆様の週末のお供になれるようなお菓子を。",
      values: [
        { title: "週末に開く店", description: "毎週の営業日は公式Instagramで知らせる、小さな週末の洋菓子店です。", icon: "heart" },
        { title: "ヨーロッパの焼菓子", description: "フランスやスペインなどの焼菓子を中心に紹介されています。", icon: "star" },
        { title: "お菓子の話", description: "公式noteでは、店で出すお菓子について一つずつ綴られています。", icon: "globe" },
      ],
      teamNote: "素材、製法、人物の詳細は公式発信で確認できる範囲を超えて創作せず、正式取材後に掲載します。",
      accentColor: accent,
    },
    services: {
      title: "お菓子について",
      subtitle: "ヨーロッパの焼菓子を中心に、その週のラインナップを届けています。詳細は公式Instagramをご確認ください。",
      processEyebrow: "FOR THIS WEEKEND",
      processTitle: "週末のお菓子に出会うまで",
      services: [
        { title: "ヨーロッパの焼菓子", description: "フランスやスペインなど、ヨーロッパの焼菓子を中心に扱っています。", icon: "sparkles", features: ["週ごとに内容を案内", "最新情報はInstagram", "正式写真は許諾後に掲載"], priceNote: "価格は公式案内をご確認ください" },
        { title: "その週のラインナップ", description: "焼き上がるお菓子は毎週の公式Instagramで案内されています。", icon: "star", features: ["営業日と同時に確認", "売り切れ状況は要確認", "取り置き方法は店舗確認"], priceNote: "提供内容は週ごとに異なります" },
        { title: "お菓子の読みもの", description: "公式noteでは、店で出すお菓子についての記事が公開されています。", icon: "heart", features: ["公式noteへ案内", "背景を読んで選べる", "記事更新にも対応可能"], priceNote: "公開中の記事をご覧ください" },
      ],
      process: [
        { step: 1, title: "今週の案内を確認", description: "公式Instagramで営業日とラインナップを確認します。" },
        { step: 2, title: "下北沢・代沢へ", description: "公式の道順と地図を確認して、小さなアパートの二階へ。" },
        { step: 3, title: "週末のお菓子を選ぶ", description: "その日に並ぶ焼菓子から、週末のお供を選びます。" },
      ],
      ctaTitle: "今週のラインナップはInstagramで",
      ctaSubtitle: "営業日とその週のお菓子は、公式投稿をご確認ください。",
      ctaText: "公式Instagramを見る",
      ctaHref: instagramUrl,
      accentColor: accent,
    },
    contact: {
      title: "アクセス",
      subtitle: "東京・下北沢、代沢の小さなアパート二階。ご来店前に公式案内をご確認ください。",
      companyName: "及川洋菓子店",
      email: "",
      address: "東京都世田谷区代沢5-6-14 岩本荘2F 真ん中",
      calBookingUrl: "",
      formNote: "この提案用デモでは、事業者への誤送信を防ぐためフォーム送信を停止しています。正式納品時に店舗指定の受付方法へ接続できます。",
      formEnabled: false,
      externalProfileUrl: instagramUrl,
      mapUrl,
      accentColor: accent,
    },
    works: contentPage("週末の店", "店が開く週末までを、迷わず確認できるように。", "THE WEEKEND SHOP", [
      { id: "announcement", heading: "Instagramで営業日を知る", body: "営業日とその週のラインナップは、公式Instagramで案内されています。" },
      { id: "story", heading: "noteでお菓子の話を読む", body: "公式noteには、店で出すお菓子についての記事が公開されています。", note: noteUrl },
      { id: "visit", heading: "下北沢の小さな店へ", body: "所在地と道順を確認して、代沢のアパート二階へ向かいます。", note: "来店前に最新情報をご確認ください" },
    ]),
    news: contentPage("営業のお知らせ", "営業日と今週のお菓子を、一か所で確認するためのページ案です。", "OPENING NEWS", [
      { id: "instagram", heading: "最新の営業情報", body: "現在の正本は公式Instagramです。最新投稿をご確認ください。", note: instagramUrl },
      { id: "future", heading: "正式サイトでできること", body: "Instagramに加え、臨時営業、売り切れ、季節のお菓子をスマートフォンから更新できる設計にできます。", note: "CMS実装例" },
    ]),
    faq: contentPage("よくある質問", "来店前に確認したい情報をまとめています。", "FAQ", [
      { id: "open", heading: "営業日", body: "週末を中心に営業しています。正確な営業日は公式Instagramの最新投稿をご確認ください。" },
      { id: "menu", heading: "お菓子の種類と価格", body: "ヨーロッパの焼菓子が中心です。週ごとの内容と価格は公式案内をご確認ください。" },
      { id: "access", heading: "道順", body: "東京都世田谷区代沢5-6-14 岩本荘2Fです。公式Instagramの道順案内もご確認ください。" },
      { id: "other", heading: "予約・取り置き・支払い方法", body: "確認できる公開情報だけでは確定できないため、正式制作時に店舗確認後掲載します。" },
    ]),
    recruit: contentPage("一緒に働く", "採用を行う場合に、仕事内容と店の考え方を伝えるページ案です。", "RECRUIT", [
      { id: "status", heading: "現在の募集状況", body: "公開情報では募集を確認できないため、店舗確認後に掲載します。", note: "未確認の募集は表示しません" },
      { id: "future", heading: "掲載できる内容", body: "仕事内容、勤務日、応募条件、店主からのメッセージを整理できます。" },
    ]),
    privacy: contentPage("プライバシーポリシー", "個人情報の取り扱いについて。", "PRIVACY", [
      { id: "collection", heading: "取得する情報", body: "正式サイトで問い合わせやアクセス解析を導入する場合、取得項目と利用目的を明示します。" },
      { id: "management", heading: "管理と第三者提供", body: "正式な運営者情報と利用サービスを確認し、納品時に実態に合う本文へ更新します。" },
    ]),
    terms: contentPage("サイト利用条件", "提案用デモの位置づけと正式公開時の条件。", "TERMS", [
      { id: "demo", heading: "このサイトについて", body: "及川洋菓子店の公式note・Instagramの公開情報をもとに制作した提案用デモであり、公式サイトではありません。" },
      { id: "facts", heading: "営業・商品情報", body: "営業日、ラインナップ、価格は変更される可能性があります。最新情報は公式Instagramをご確認ください。" },
      { id: "rights", heading: "素材の取り扱い", body: "掲載写真は提案用生成ビジュアルです。正式制作時は店舗承認済みの素材だけを掲載します。" },
    ]),
    commerce: contentPage("特定商取引法に基づく表記", "オンライン販売や有料予約を行う場合の確認用ページです。", "COMMERCE DISCLOSURE", [
      { id: "operator", heading: "販売事業者・責任者", body: "正式な事業者名、責任者、所在地、連絡先を店舗確認後に掲載します。", note: "事業者確認が必要です" },
      { id: "price", heading: "販売価格・追加費用", body: "オンライン販売を行う場合は、販売価格、送料、決済手数料など実際の条件を掲載します。" },
      { id: "delivery", heading: "提供時期・返品・キャンセル", body: "商品の性質と受付方法に合わせ、提供時期と返品・キャンセル条件を専門家確認後に確定します。" },
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
  design_fingerprint: "dq-oikawa-craft-showcase-v1",
  structural_fingerprint: "dq-oikawa-craft-editorial-v1",
  quality_score: quality.score,
  quality_report: quality,
  rights_manifest: rightsManifest,
  generation_candidates: [{ templateId: "nomad", score: quality.score, passed: true, designFingerprint: "dq-oikawa-craft-showcase-v1", structuralFingerprint: "dq-oikawa-craft-editorial-v1", hardBlockers: [] }],
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
