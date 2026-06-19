import {
  getPremiumDemoProfile,
  inferDemoArchetype,
  type DemoArchetype,
  type DemoLocale,
} from "./premium-demo"

export type FullSiteSection =
  | "home"
  | "services"
  | "pricing"
  | "cases"
  | "faq"
  | "about"
  | "blog"
  | "contact"
  | "privacy"
  | "terms"
  | "tokushoho"

export interface FullSiteProfile {
  slug: string
  locale: DemoLocale
  archetype: DemoArchetype
  companyName: string
  industryLabel: string
  siteTitle: string
  description: string
  accentColor: string
  accentColorDark: string
  accentColorLight: string
  imageUrl: string
  calUrl: string
  nav: Array<{ section: FullSiteSection; label: string; href: string }>
  hero: { eyebrow: string; title: string; lead: string; primary: string; secondary: string }
  proof: Array<{ value: string; label: string }>
  services: Array<{ title: string; body: string; deliverables: string[] }>
  plans: Array<{ name: string; price: string; lead: string; features: string[]; featured?: boolean }>
  cases: Array<{ title: string; industry: string; body: string; metrics: string[] }>
  faqs: Array<{ question: string; answer: string }>
  posts: Array<{ title: string; category: string; excerpt: string; date: string }>
  company: Array<{ label: string; value: string }>
  legal: { privacy: string[]; terms: string[]; tokushoho: Array<{ label: string; value: string }> }
}

interface FullSiteInput {
  slug: string
  title?: string
  meta?: Record<string, unknown>
  locale?: string
}

const pageSections: FullSiteSection[] = [
  "services",
  "pricing",
  "cases",
  "faq",
  "about",
  "blog",
  "contact",
]

const sectionLabelsJa: Record<FullSiteSection, string> = {
  home: "ホーム",
  services: "サービス",
  pricing: "料金",
  cases: "事例",
  faq: "FAQ",
  about: "会社情報",
  blog: "コラム",
  contact: "お問い合わせ",
  privacy: "プライバシー",
  terms: "利用規約",
  tokushoho: "特商法表記",
}

const sectionLabelsEn: Record<FullSiteSection, string> = {
  home: "Home",
  services: "Services",
  pricing: "Pricing",
  cases: "Cases",
  faq: "FAQ",
  about: "About",
  blog: "Journal",
  contact: "Contact",
  privacy: "Privacy",
  terms: "Terms",
  tokushoho: "Legal Notice",
}

const titleByArchetypeJa: Record<DemoArchetype, string> = {
  culinary: "予約と来店体験まで設計された飲食店ホームページ",
  construction: "施工実績と信頼を積み上げる建設会社ホームページ",
  clinical: "安心して初診予約できるクリニックホームページ",
  beauty: "世界観と指名予約を両立するサロンホームページ",
  commerce: "商品選びから購入まで迷わせないストアホームページ",
  advisory: "専門性を相談につなげる士業・相談型ホームページ",
  localService: "地域からすぐ相談されるサービス業ホームページ",
}

const titleByArchetypeEn: Record<DemoArchetype, string> = {
  culinary: "A restaurant website designed from discovery to reservation",
  construction: "A construction website built on project proof and trust",
  clinical: "A clinic website that makes first visits feel safe",
  beauty: "A salon website that turns point of view into bookings",
  commerce: "A retail website that guides customers from choice to purchase",
  advisory: "An expert-service website that turns credibility into inquiries",
  localService: "A local-service website built for fast, qualified inquiries",
}

function asText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function link(slug: string, section: FullSiteSection): string {
  return section === "home" ? `/demo/${slug}` : `/demo/${slug}/${section}`
}

function contentFor(archetype: DemoArchetype, locale: DemoLocale) {
  const isJa = locale === "ja"
  const servicesJa: Record<DemoArchetype, FullSiteProfile["services"]> = {
    culinary: [
      { title: "予約導線設計", body: "席種、人数、記念日利用まで迷わず進める予約導線を設計します。", deliverables: ["予約CTA", "営業時間", "貸切案内"] },
      { title: "メニュー・コース設計", body: "看板料理、季節メニュー、コースを写真と価格で選びやすく整理します。", deliverables: ["写真導線", "コース比較", "アレルギー表記"] },
      { title: "口コミ・SNS連携", body: "来店前の信頼材料をトップ、事例、FAQに分散配置します。", deliverables: ["口コミ抜粋", "Instagram導線", "店舗情報"] },
    ],
    construction: [
      { title: "施工実績アーカイブ", body: "用途、工法、地域、金額帯で探せる実績ページを構築します。", deliverables: ["実績一覧", "工事写真", "仕様表"] },
      { title: "見積もり前の不安解消", body: "工程、保証、対応エリア、よくある質問を商談前に提示します。", deliverables: ["工程図", "保証説明", "対応エリア"] },
      { title: "問い合わせ品質改善", body: "予算、希望時期、現地調査の有無をフォームで取得します。", deliverables: ["見積もりフォーム", "資料DL", "追客導線"] },
    ],
    clinical: [
      { title: "診療内容の整理", body: "症状、診療科目、初診の流れを患者目線で再構成します。", deliverables: ["診療案内", "医師紹介", "初診FAQ"] },
      { title: "予約前の安心設計", body: "料金、持ち物、所要時間、キャンセル方針を明確にします。", deliverables: ["予約CTA", "アクセス", "診療時間"] },
      { title: "信頼コンテンツ", body: "院内写真、設備、資格、口コミを落ち着いたトーンで見せます。", deliverables: ["院内写真", "設備紹介", "口コミ"] },
    ],
    beauty: [
      { title: "スタイルギャラリー", body: "施術メニュー、仕上がり、担当者をひと目で比較できます。", deliverables: ["写真一覧", "メニュー", "担当者"] },
      { title: "指名予約導線", body: "スタッフの得意領域と予約CTAを近くに置きます。", deliverables: ["スタッフ紹介", "予約CTA", "SNS連携"] },
      { title: "リピート促進", body: "キャンペーン、ケア方法、次回来店目安をサイト内で伝えます。", deliverables: ["キャンペーン", "ケア記事", "LINE導線"] },
    ],
    commerce: [
      { title: "商品カテゴリ設計", body: "用途、価格帯、人気順で探せる商品導線を用意します。", deliverables: ["カテゴリ", "ランキング", "比較表"] },
      { title: "購入前の説得材料", body: "レビュー、素材、配送、返品条件を近くに配置します。", deliverables: ["レビュー", "配送案内", "返品FAQ"] },
      { title: "再購入導線", body: "会員登録、ニュースレター、関連商品を自然に案内します。", deliverables: ["会員CTA", "関連商品", "メルマガ"] },
    ],
    advisory: [
      { title: "専門領域の明確化", body: "相談範囲、対応できない範囲、費用感を先に提示します。", deliverables: ["業務範囲", "料金目安", "相談条件"] },
      { title: "実績・信頼設計", body: "守秘義務に配慮しながら事例、資格、メディア掲載を見せます。", deliverables: ["実績", "資格", "お客様の声"] },
      { title: "相談前ヒアリング", body: "問い合わせ時点で論点と期限を取得し、商談の質を上げます。", deliverables: ["相談フォーム", "資料DL", "初回面談"] },
    ],
    localService: [
      { title: "対応エリア導線", body: "市区町村、即日対応可否、出張費をわかりやすく表示します。", deliverables: ["対応エリア", "料金目安", "受付時間"] },
      { title: "作業事例と口コミ", body: "Before/After、所要時間、顧客評価を一覧化します。", deliverables: ["作業写真", "口コミ", "所要時間"] },
      { title: "緊急相談フォーム", body: "電話、LINE、フォームを状況別に出し分けます。", deliverables: ["電話CTA", "LINE導線", "写真添付"] },
    ],
  }

  const servicesEn: Record<DemoArchetype, FullSiteProfile["services"]> = {
    culinary: [
      { title: "Reservation flow", body: "Seats, party size, occasions, and timing are kept easy to choose.", deliverables: ["Booking CTA", "Hours", "Private dining"] },
      { title: "Menu architecture", body: "Signature dishes, seasonal menus, and courses are framed with photography and pricing.", deliverables: ["Menu photos", "Course comparison", "Dietary notes"] },
      { title: "Review and social proof", body: "Trust cues are placed throughout the home, cases, and FAQ pages.", deliverables: ["Reviews", "Instagram", "Store info"] },
    ],
    construction: [
      { title: "Project archive", body: "Projects can be browsed by use case, method, area, and budget range.", deliverables: ["Cases", "Site photos", "Spec sheets"] },
      { title: "Pre-quote clarity", body: "Process, warranties, service areas, and FAQs are visible before contact.", deliverables: ["Process", "Warranty", "Coverage"] },
      { title: "Qualified inquiries", body: "Budget, schedule, and site-survey details are captured in the form.", deliverables: ["Quote form", "Downloads", "Follow-up flow"] },
    ],
    clinical: [
      { title: "Treatment navigation", body: "Symptoms, services, and first-visit flow are reorganized around patient needs.", deliverables: ["Services", "Doctors", "First visit FAQ"] },
      { title: "Booking confidence", body: "Fees, what to bring, duration, and cancellation rules are clear.", deliverables: ["Booking CTA", "Access", "Hours"] },
      { title: "Trust content", body: "Interior photos, equipment, credentials, and reviews are presented calmly.", deliverables: ["Interior", "Equipment", "Reviews"] },
    ],
    beauty: [
      { title: "Style gallery", body: "Menus, outcomes, and stylists can be compared at a glance.", deliverables: ["Gallery", "Menu", "Stylists"] },
      { title: "Staff booking", body: "Staff strengths and booking CTAs stay close together.", deliverables: ["Profiles", "Booking CTA", "Social links"] },
      { title: "Retention content", body: "Campaigns, care tips, and return timing support repeat visits.", deliverables: ["Campaigns", "Care posts", "LINE flow"] },
    ],
    commerce: [
      { title: "Category design", body: "Customers can browse by use, price, popularity, and comparison needs.", deliverables: ["Categories", "Rankings", "Comparisons"] },
      { title: "Purchase proof", body: "Reviews, materials, shipping, and return policies sit near product choices.", deliverables: ["Reviews", "Shipping", "Return FAQ"] },
      { title: "Repeat flow", body: "Accounts, newsletters, and related products are introduced naturally.", deliverables: ["Account CTA", "Related items", "Newsletter"] },
    ],
    advisory: [
      { title: "Scope clarity", body: "Services, exclusions, and price expectations are explicit upfront.", deliverables: ["Scope", "Fee guide", "Fit criteria"] },
      { title: "Credibility layer", body: "Cases, credentials, and media proof are shown without overclaiming.", deliverables: ["Cases", "Credentials", "Testimonials"] },
      { title: "Pre-consult intake", body: "The form captures issues and timing before the first meeting.", deliverables: ["Intake form", "Downloads", "Consultation"] },
    ],
    localService: [
      { title: "Service area flow", body: "Cities, response speed, and travel fees are easy to confirm.", deliverables: ["Coverage", "Pricing", "Hours"] },
      { title: "Work proof", body: "Before/after photos, duration, and customer ratings are structured.", deliverables: ["Photos", "Reviews", "Duration"] },
      { title: "Urgent inquiry", body: "Phone, LINE, and forms are routed by customer situation.", deliverables: ["Phone CTA", "LINE", "Photo upload"] },
    ],
  }

  const services = isJa ? servicesJa[archetype] : servicesEn[archetype]
  const plans = isJa
    ? [
        { name: "ライト", price: "¥180,000〜", lead: "小規模サイトを短納期で整えるプラン", features: ["5ページ構成", "問い合わせフォーム", "基本SEO", "スマホ最適化"] },
        { name: "スタンダード", price: "¥420,000〜", lead: "事例・FAQ・ブログまで整える推奨プラン", features: ["8〜12ページ構成", "CMS/更新設計", "フォームAPI", "計測タグ"], featured: true },
        { name: "グロース", price: "¥780,000〜", lead: "改善運用とコンテンツ追加まで含むプラン", features: ["月次改善", "記事制作", "A/Bテスト", "CRM連携"] },
      ]
    : [
        { name: "Launch", price: "From ¥180,000", lead: "A fast plan for a compact business website.", features: ["5 pages", "Inquiry form", "Basic SEO", "Responsive design"] },
        { name: "Standard", price: "From ¥420,000", lead: "Recommended for cases, FAQ, and editorial growth.", features: ["8-12 pages", "CMS structure", "Form API", "Analytics"], featured: true },
        { name: "Growth", price: "From ¥780,000", lead: "Includes ongoing improvement and content production.", features: ["Monthly improvements", "Editorial", "A/B tests", "CRM sync"] },
      ]
  const cases = services.map((service, index) => ({
    title: isJa ? `${service.title}の改善事例` : `${service.title} improvement case`,
    industry: isJa ? "モデルケース" : "Model case",
    body: isJa
      ? "課題、改善方針、公開後の検証項目までひとつのページで説明できる構成です。"
      : "The page explains the issue, improvement direction, and post-launch verification points.",
    metrics: index === 0 ? ["CV +42%", "滞在時間 +31%", "直帰率 -18%"] : index === 1 ? ["問い合わせ +27%", "検索流入 +46%", "更新工数 -35%"] : ["商談化 +21%", "FAQ閲覧 +58%", "再訪 +19%"],
  }))
  const faqs = isJa
    ? [
        { question: "本当に静的LPではなくHPとして納品できますか？", answer: "はい。ホーム、サービス、料金、事例、FAQ、会社情報、問い合わせ、法務ページまで同じデザインシステムで構成します。" },
        { question: "問い合わせフォームは動きますか？", answer: "AstroのサーバーAPIで受け取り、計測イベントも送信します。外部フォーム依存だけで止まらない構成です。" },
        { question: "業種ごとにデザインは変わりますか？", answer: "飲食、建設、医療、美容、小売、士業、地域サービスで構成、写真、CTA、コピーを変えます。" },
        { question: "公開後に内容を更新できますか？", answer: "デモ生成データとCMS/CRM連携を前提に、サービス、FAQ、事例、ブログを更新できる設計です。" },
      ]
    : [
        { question: "Is this more than a static landing page?", answer: "Yes. It includes home, services, pricing, cases, FAQ, about, contact, and legal pages under one design system." },
        { question: "Does the contact form work?", answer: "It posts to an Astro server API and sends tracking events, so it is not only an external form embed." },
        { question: "Does each industry get its own design?", answer: "Yes. Structure, imagery, CTA placement, and copy vary by industry archetype." },
        { question: "Can content be updated after launch?", answer: "The structure is designed for generated data plus CMS/CRM updates to services, FAQs, cases, and posts." },
      ]
  return { services, plans, cases, faqs }
}

export function normalizeSection(value: string | undefined): FullSiteSection {
  const section = (value || "home").toLowerCase()
  const allowed: FullSiteSection[] = ["home", ...pageSections, "privacy", "terms", "tokushoho"]
  return allowed.includes(section as FullSiteSection) ? (section as FullSiteSection) : "home"
}

export function getFullSiteProfile(input: FullSiteInput): FullSiteProfile {
  const meta = input.meta ?? {}
  const locale: DemoLocale = input.locale === "en" || meta.locale === "en" ? "en" : "ja"
  const isJa = locale === "ja"
  const archetype = inferDemoArchetype(input)
  const premium = getPremiumDemoProfile(input)
  const companyName = asText(meta.company_name, isJa ? "サンプル企業" : "Sample Company")
  const content = contentFor(archetype, locale)
  const labels = isJa ? sectionLabelsJa : sectionLabelsEn
  const siteTitle = input.title || asText(meta.title, `${companyName} Demo`)
  const address = isJa ? "東京都渋谷区神宮前 1-1-1" : "1-1-1 Jingumae, Shibuya, Tokyo"
  const email = asText(meta.email, "hello@example.com")
  const phone = asText(meta.phone, "03-1234-5678")

  return {
    slug: input.slug,
    locale,
    archetype,
    companyName,
    industryLabel: premium.industryLabel,
    siteTitle,
    description: asText(
      meta.description,
      isJa ? `${companyName}の納品品質デモサイト。` : `Production-quality demo website for ${companyName}.`,
    ),
    accentColor: premium.accentColor,
    accentColorDark: premium.accentColorDark,
    accentColorLight: premium.accentColorLight,
    imageUrl: premium.imageUrl,
    calUrl: premium.calUrl,
    nav: [{ section: "home", label: labels.home, href: link(input.slug, "home") }, ...pageSections.map((section) => ({ section, label: labels[section], href: link(input.slug, section) }))],
    hero: {
      eyebrow: premium.badge,
      title: isJa ? titleByArchetypeJa[archetype] : titleByArchetypeEn[archetype],
      lead: premium.heroLead,
      primary: isJa ? "相談する" : "Start inquiry",
      secondary: isJa ? "サービスを見る" : "View services",
    },
    proof: premium.stats,
    services: content.services,
    plans: content.plans,
    cases: content.cases,
    faqs: content.faqs,
    posts: [
      {
        title: isJa ? "問い合わせ前の不安を消すHP設計" : "Website structure that reduces inquiry friction",
        category: isJa ? "設計思想" : "Strategy",
        excerpt: isJa ? "料金、実績、FAQ、CTAの距離を短くするだけで商談化率は変わります。" : "Pricing, proof, FAQ, and CTAs work better when they stay close together.",
        date: "2026-06-19",
      },
      {
        title: isJa ? `${premium.industryLabel}で優先すべき写真` : `Images that matter for ${premium.industryLabel}`,
        category: isJa ? "コンテンツ" : "Content",
        excerpt: isJa ? "ファーストビューに置くべき写真は、業種と購入前の不安によって変わります。" : "The right first-view image depends on the category and buyer hesitation.",
        date: "2026-06-12",
      },
      {
        title: isJa ? "公開後に改善し続けるための計測項目" : "Metrics to improve after launch",
        category: isJa ? "運用" : "Operations",
        excerpt: isJa ? "フォーム到達率、FAQ閲覧、CTAクリックを見れば次の改善点が見えます。" : "Form reach, FAQ views, and CTA clicks reveal the next improvement.",
        date: "2026-06-05",
      },
    ],
    company: [
      { label: isJa ? "会社名" : "Company", value: companyName },
      { label: isJa ? "所在地" : "Address", value: address },
      { label: isJa ? "代表" : "Representative", value: isJa ? "山田 太郎" : "Taro Yamada" },
      { label: isJa ? "設立" : "Founded", value: "2020" },
      { label: isJa ? "電話番号" : "Phone", value: phone },
      { label: isJa ? "メール" : "Email", value: email },
      { label: isJa ? "事業内容" : "Business", value: isJa ? `${premium.industryLabel}に特化したサービス提供` : `Services focused on ${premium.industryLabel}` },
    ],
    legal: {
      privacy: isJa
        ? ["取得した個人情報はお問い合わせ対応、資料送付、サービス改善の目的で利用します。", "第三者提供は法令に基づく場合を除き行いません。", "開示、訂正、削除のご依頼はお問い合わせ窓口で受け付けます。"]
        : ["Personal information is used for inquiries, document delivery, and service improvement.", "Data is not shared with third parties except where required by law.", "Requests for disclosure, correction, or deletion are accepted through the contact point."],
      terms: isJa
        ? ["本サイトの内容はデモであり、実際の契約条件は個別見積もりにより確定します。", "掲載内容の無断転載、複製、改変を禁じます。", "サービス提供範囲、納期、費用は発注書または契約書に定めます。"]
        : ["This site is a demo, and actual contract terms are confirmed by individual quotation.", "Unauthorized reproduction, copying, or modification is prohibited.", "Scope, delivery dates, and fees are defined in the order or agreement."],
      tokushoho: [
        { label: isJa ? "販売事業者" : "Seller", value: companyName },
        { label: isJa ? "所在地" : "Address", value: address },
        { label: isJa ? "連絡先" : "Contact", value: `${email} / ${phone}` },
        { label: isJa ? "販売価格" : "Price", value: isJa ? "各プラン・個別見積もりに記載" : "Listed in each plan or quotation" },
        { label: isJa ? "支払方法" : "Payment", value: isJa ? "銀行振込・クレジットカード" : "Bank transfer or credit card" },
      ],
    },
  }
}
