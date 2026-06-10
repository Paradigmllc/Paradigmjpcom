/**
 * Multi-template demo system — industry × appeal × locale
 *
 * Generates unique demo combinations that customers can browse and select.
 */

export interface DemoData {
  title: string; customerName: string; companyId?: string; domain?: string
  industry: string; accentColor: string; accentColorDark: string; accentColorLight: string
  status: string; heroHeadline: string; heroSubtitle: string; heroCta: string
  heroStats?: { label: string; value: string; suffix: string }[]
  screenshotUrl?: string; afterImage?: string
  improvementPoints?: string[]
  serviceTitle: string; serviceSubtitle?: string
  services: { title: string; description: string; icon: string; features?: string[] }[]
  caseTitle: string; caseDescription: string
  caseMetrics: { label: string; value: string; suffix: string; detail?: string }[]
  processTitle?: string
  processSteps?: { step: string; title: string; description: string; icon: string }[]
  testimonial?: { quote: string; author: string; role: string; company: string }
  certifications?: string[]
  faqTitle?: string
  faqItems?: { question: string; answer: string }[]
  ctaTitle: string; ctaBody: string; calBookingUrl: string
  pagespeedMobile?: number; pagespeedDesktop?: number
  issues?: string[]; reportUrl?: string
  appeal?: string // "diagnostic" | "sales" | "brand" | "tech"
}

/* ═══════════════ Industry Themes ═══════════════ */
const INDUSTRY_THEMES: Record<string, { accent: string; dark: string; light: string; labelJa: string; labelEn: string }> = {
  dental: { accent: "#06b6d4", dark: "#0e7490", light: "#67e8f9", labelJa: "歯科医院", labelEn: "Dental Clinic" },
  restaurant: { accent: "#f59e0b", dark: "#b45309", light: "#fcd34d", labelJa: "飲食店", labelEn: "Restaurant" },
  construction: { accent: "#f97316", dark: "#c2410c", light: "#fdba74", labelJa: "建設業", labelEn: "Construction" },
  consulting: { accent: "#7c3aed", dark: "#5b21b6", light: "#a78bfa", labelJa: "コンサル", labelEn: "Consulting" },
  retail: { accent: "#10b981", dark: "#047857", light: "#6ee7b7", labelJa: "小売業", labelEn: "Retail" },
  beauty_salon: { accent: "#ec4899", dark: "#be185d", light: "#f9a8d4", labelJa: "美容サロン", labelEn: "Beauty Salon" },
  accounting: { accent: "#6366f1", dark: "#4338ca", light: "#a5b4fc", labelJa: "会計事務所", labelEn: "Accounting" },
  cleaning: { accent: "#3b82f6", dark: "#1d4ed8", light: "#93c5fd", labelJa: "清掃業", labelEn: "Cleaning" },
}

/* ═══════════════ Appeal Types ═══════════════ */
type AppealType = "diagnostic" | "sales" | "brand" | "tech"

const APPEAL_CONFIG: Record<AppealType, { labelJa: string; labelEn: string; icon: string; descriptionJa: string; descriptionEn: string }> = {
  diagnostic: { labelJa: "診断重視", labelEn: "Diagnostic Focus", icon: "🔍", descriptionJa: "PageSpeed・SEO・セキュリティのデータに基づく改善提案", descriptionEn: "Data-driven improvement proposals based on PageSpeed, SEO, and security audits" },
  sales: { labelJa: "営業提案", labelEn: "Sales Proposal", icon: "📊", descriptionJa: "ROI試算と競合比較を含む説得力のある営業資料", descriptionEn: "Compelling sales materials with ROI estimates and competitive comparisons" },
  brand: { labelJa: "ブランド訴求", labelEn: "Brand Showcase", icon: "✨", descriptionJa: "デザイン性を重視した洗練されたブランド体験", descriptionEn: "Sophisticated brand experience with premium design focus" },
  tech: { labelJa: "技術スタック", labelEn: "Tech Stack", icon: "⚡", descriptionJa: "使用技術・パフォーマンス・開発体制の透明性を訴求", descriptionEn: "Transparency around tech stack, performance, and development practices" },
}

/* ═══════════════ Industry-specific Copy ═══════════════ */
function generateHero(industry: string, appeal: AppealType, lang: "ja" | "en"): { headline: string; subtitle: string } {
  const isJa = lang === "ja"
  const base: Record<string, { ja: { headline: string; subtitle: string }; en: { headline: string; subtitle: string } }> = {
    dental: { ja: { headline: "新患数が{val}倍に。データが証明する歯科医院のWeb集患", subtitle: "御院のWebサイトを診断。Googleマップと検索からの予約数を最大化します。" }, en: { headline: "New Patients Up {val}x. Data-Proven Dental Web Marketing", subtitle: "We diagnose your clinic's website and maximize bookings from Google Maps and search." } },
    restaurant: { ja: { headline: "予約率{val}%向上。データドリブンな飲食店Web戦略", subtitle: "メニュー表示、予約導線、Googleマップ最適化で売上を伸ばします。" }, en: { headline: "Reservations Up {val}%. Data-Driven Restaurant Web Strategy", subtitle: "Optimize your menu display, booking flow, and Google Maps presence." } },
    construction: { ja: { headline: "問合せ数{val}倍。建設業のためのWeb集客改善", subtitle: "施工事例の見せ方、問合せフォームの最適化、MEO対策で安定受注を実現します。" }, en: { headline: "Inquiries Up {val}x. Web Lead Gen for Construction", subtitle: "Optimize your portfolio showcase, inquiry forms, and local SEO for consistent project wins." } },
    consulting: { ja: { headline: "成約率{val}%改善。コンサルティングファームのWeb刷新", subtitle: "知見の見える化、ホワイトペーパー導線、ブランド信頼構築をデータで加速します。" }, en: { headline: "Close Rate +{val}%. Consulting Firm Web Transformation", subtitle: "Accelerate thought leadership, white paper funnels, and brand trust with data." } },
    retail: { ja: { headline: "EC売上{val}%増。小売業のためのデジタル刷新", subtitle: "商品ページ最適化、決済導線改善、リピート率向上をデータで実現します。" }, en: { headline: "E-Commerce Sales +{val}%. Digital Overhaul for Retail", subtitle: "Optimize product pages, checkout flows, and repeat purchase rates with data." } },
    beauty_salon: { ja: { headline: "予約数{val}倍。美容サロンのためのWeb集客改善", subtitle: "ビフォーアフターの見せ方、Instagram連携、24時間予約システムで売上向上。" }, en: { headline: "Bookings Up {val}x. Web Marketing for Beauty Salons", subtitle: "Showcase your transformations, integrate Instagram, and enable 24/7 online booking." } },
  }
  const set = base[industry] || base.consulting
  const copy = set[lang]
  const vals: Record<string, string> = { diagnostic: "2.4", sales: "3.1", brand: "1.8", tech: "2.0" }
  return { headline: copy.headline.replace("{val}", vals[appeal] || "2"), subtitle: copy.subtitle }
}

function generateServices(industry: string, lang: "ja" | "en"): { title: string; description: string; icon: string; features: string[] }[] {
  const all: Record<string, { ja: {title:string;desc:string;features:string[]}[], en: {title:string;desc:string;features:string[]}[] }> = {
    dental: {
      ja: [
        { title: "MEO対策", desc: "Googleマップ検索で上位表示。競合医院より先に選ばれる仕組み。", features: ["マップ最適化", "口コミ管理", "写真最適化"] },
        { title: "Web予約システム", desc: "24時間オンライン予約。電話不要で新患獲得率を大幅向上。", features: ["LINE予約連携", "自動リマインド", "カルテ連携"] },
        { title: "医院ブランディング", desc: "清潔感・信頼感を伝える洗練されたサイトデザイン。", features: ["治療事例ギャラリー", "ドクター紹介", "設備紹介"] },
      ],
      en: [
        { title: "Local SEO", desc: "Top rankings on Google Maps. Get chosen before competitors.", features: ["Map Optimization", "Review Management", "Photo SEO"] },
        { title: "Online Booking", desc: "24/7 online reservations. Boost new patient acquisition.", features: ["LINE Integration", "Auto Reminders", "EHR Link"] },
        { title: "Clinic Branding", desc: "Clean, trustworthy design that conveys professionalism.", features: ["Case Gallery", "Doctor Profiles", "Facility Tour"] },
      ],
    },
    restaurant: {
      ja: [
        { title: "メニュー最適化", desc: "写真映えする料理ページ。注文率を最大化する導線設計。", features: ["料理写真撮影", "多言語対応", "アレルギー表示"] },
        { title: "Googleマップ対策", desc: "MEOで地域検索上位表示。ランチ・ディナー両方の集客に対応。", features: ["口コミ促進", "混雑状況表示", "写真更新"] },
        { title: "予約・テイクアウト", desc: "電話不要の24時間予約・注文システム。", features: ["LINE予約", "テイクアウト注文", "テーブル管理"] },
      ],
      en: [
        { title: "Menu Optimization", desc: "Mouth-watering food pages. Maximize order conversion.", features: ["Food Photography", "Multi-language", "Allergen Display"] },
        { title: "Google Maps SEO", desc: "Top local search rankings for both lunch and dinner traffic.", features: ["Review Boost", "Crowd Status", "Photo Updates"] },
        { title: "Reservation & Takeout", desc: "24/7 booking and ordering without phone calls.", features: ["LINE Booking", "Takeout Orders", "Table Management"] },
      ],
    },
  }
  const set = all[industry] || all.dental
  return (set[lang] || set.ja).map(s => ({ ...s, icon: "Globe", features: s.features }))
    .map((s, i) => ({ ...s, icon: ["Globe", "Search", "Zap"][i] || "Globe" }))
}

const DEFAULT_METRICS = {
  ja: [
    { label: "問合せ増加", value: "2.4", suffix: "x", detail: "改善後の想定問合せ倍率" },
    { label: "PageSpeed", value: "92", suffix: "点", detail: "Google公式指標" },
    { label: "CVR改善", value: "38", suffix: "%", detail: "コンバージョン率向上" },
    { label: "SEO順位", value: "3", suffix: "位", detail: "主要キーワード" },
  ],
  en: [
    { label: "Inquiries", value: "2.4", suffix: "x", detail: "Projected inquiry multiplier" },
    { label: "PageSpeed", value: "92", suffix: "pts", detail: "Google metric" },
    { label: "CVR Gain", value: "38", suffix: "%", detail: "Conversion rate improvement" },
    { label: "SEO Rank", value: "#3", suffix: "", detail: "Primary keyword" },
  ],
}

const DEFAULT_FAQ = {
  ja: [
    { question: "どのくらいの期間で完成しますか？", answer: "診断から改善案提示まで3営業日。実装は規模により4〜8週間です。" },
    { question: "費用の目安を教えてください", answer: "業界・規模によって異なりますが、Web制作は50万円〜、SEO/MEOは月5万円〜が目安です。" },
    { question: "すでにサイトがあるのですが改修できますか？", answer: "可能です。既存サイトの診断から開始し、必要な改修範囲を特定してご提案します。" },
    { question: "SEO対策は含まれますか？", answer: "全プランに基本的な内部SEO対策（構造化データ、Core Web Vitals、メタタグ最適化）が含まれます。" },
  ],
  en: [
    { question: "How long does it take?", answer: "Diagnosis to proposal: 3 business days. Implementation: 4-8 weeks depending on scope." },
    { question: "What's the cost range?", answer: "Web development from $3,000, SEO/MEO from $500/month. Varies by industry and scale." },
    { question: "Can you improve my existing site?", answer: "Yes. We start with a diagnostic of your current site and propose specific improvements." },
    { question: "Is SEO included?", answer: "All plans include basic on-page SEO (structured data, Core Web Vitals, meta optimization)." },
  ],
}

/* ═══════════════ Generator ═══════════════ */
export function generateDemo(industry: string, appeal: AppealType, lang: "ja" | "en"): DemoData {
  const theme = INDUSTRY_THEMES[industry] || INDUSTRY_THEMES.consulting
  const appealCfg = APPEAL_CONFIG[appeal]
  const hero = generateHero(industry, appeal, lang)
  const isJa = lang === "ja"
  const name = isJa
    ? `${theme.labelJa}「サンプル医院」` 
    : `Sample ${theme.labelEn}`
  const nameMap: Record<string, { ja: string; en: string }> = {
    dental: { ja: "スマイル歯科クリニック", en: "Smile Dental Clinic" },
    restaurant: { ja: "和食ダイニング桜", en: "Sakura Japanese Dining" },
    construction: { ja: "未来建設工業株式会社", en: "Mirai Construction Co." },
    consulting: { ja: "株式会社ストラテジーラボ", en: "Strategy Lab Inc." },
    retail: { ja: "ナチュラルライフストア", en: "Natural Life Store" },
    beauty_salon: { ja: "美容サロン ルミナス", en: "Luminous Beauty Salon" },
    accounting: { ja: "山田会計事務所", en: "Yamada Accounting Office" },
    cleaning: { ja: "クリーンサービス匠", en: "Takumi Cleaning Service" },
  }
  const actualName = (nameMap[industry] || { ja: name, en: name })[lang]

  return {
    title: `${appeal}-${industry}`,
    customerName: actualName,
    industry, appeal,
    accentColor: theme.accent, accentColorDark: theme.dark, accentColorLight: theme.light,
    status: "ready",
    heroHeadline: hero.headline, heroSubtitle: hero.subtitle,
    heroCta: isJa ? "無料診断を申し込む" : "Get Free Diagnostic",
    heroStats: [
      { label: isJa ? "改善余地" : "Opportunity", value: "92", suffix: isJa ? "点" : "pts" },
      { label: isJa ? "検出課題" : "Issues", value: "3", suffix: isJa ? "件" : "" },
      { label: isJa ? "想定ROI" : "Est. ROI", value: appeal === "sales" ? "320" : appeal === "diagnostic" ? "240" : "180", suffix: "%" },
    ],
    improvementPoints: isJa
      ? ["表示速度を大幅改善", "スマートフォン対応を完全最適化", "問い合わせ導線を最短化", "検索流入を最大化"]
      : ["Dramatically improve load speed", "Full mobile optimization", "Shortest inquiry path", "Maximize search traffic"],
    serviceTitle: isJa ? "改善ソリューション" : "Improvement Solutions",
    serviceSubtitle: isJa ? `${theme.labelJa}の特性に合わせた最適プラン` : `Tailored plans for ${theme.labelEn}`,
    services: generateServices(industry, lang),
    caseTitle: isJa ? "改善シミュレーション" : "Improvement Simulation",
    caseDescription: isJa ? "同業他社での改善実績に基づく想定インパクト" : "Projected impact based on industry benchmarks",
    caseMetrics: DEFAULT_METRICS[lang],
    processTitle: isJa ? "プロジェクトの流れ" : "Project Process",
    processSteps: [
      { step: "01", title: isJa ? "無料診断" : "Free Diagnostic", description: isJa ? "現状サイトを分析し改善余地を可視化。3営業日でレポート提出。" : "Analyze your current site. Report in 3 business days.", icon: "Search" },
      { step: "02", title: isJa ? "戦略提案" : "Strategy Proposal", description: isJa ? "改善ロードマップと費用対効果を具体的に提示。" : "Concrete roadmap with cost-benefit analysis.", icon: "Zap" },
      { step: "03", title: isJa ? "制作・実装" : "Build & Deploy", description: isJa ? "デザインから開発まで一貫して品質管理。" : "End-to-end quality-controlled delivery.", icon: "BarChart" },
      { step: "04", title: isJa ? "効果検証" : "Verify & Improve", description: isJa ? "データに基づく継続改善サイクルを確立。" : "Establish data-driven continuous improvement.", icon: "Shield" },
    ],
    testimonial: { quote: isJa ? "問合せ数が3倍に。投資回収は3ヶ月でした" : "Inquiries tripled. ROI in 3 months.", author: isJa ? "導入企業A社" : "Client Company A", role: isJa ? "代表取締役" : "CEO", company: "株式会社A" },
    certifications: ["Google Partner", "AWS Certified", "Microsoft Partner"],
    faqTitle: isJa ? "よくあるご質問" : "FAQ",
    faqItems: DEFAULT_FAQ[lang],
    ctaTitle: isJa ? "まずは無料診断から" : "Start with a Free Diagnostic",
    ctaBody: isJa ? "15分のオンライン診断で改善余地を可視化します" : "15-minute online diagnostic reveals your improvement potential",
    calBookingUrl: "https://cal.com/paradigm-jp/15min",
  }
}

export function allIndustries(): string[] { return Object.keys(INDUSTRY_THEMES) }
export function allAppeals(): AppealType[] { return Object.keys(APPEAL_CONFIG) as AppealType[] }
export function allLocales(): ("ja" | "en")[] { return ["ja", "en"] }
export function getIndustryLabel(industry: string, lang: "ja" | "en"): string {
  return INDUSTRY_THEMES[industry]?.[lang === "ja" ? "labelJa" : "labelEn"] || industry
}
export function getAppealLabel(appeal: string, lang: "ja" | "en"): string {
  return APPEAL_CONFIG[appeal as AppealType]?.[lang === "ja" ? "labelJa" : "labelEn"] || appeal
}
export function getAppealIcon(appeal: string): string {
  return APPEAL_CONFIG[appeal as AppealType]?.icon || "📊"
}

// Legacy support
import type { DemoData as OldDemoData } from "./demo-data-legacy"
export async function getDemoData(slug: string): Promise<OldDemoData> {
  // Parse slug: "ja_dental_diagnostic" or just "default-demo"
  const parts = slug.split("_")
  if (parts.length >= 3) {
    const [lang, industry, appeal] = parts as ["ja" | "en", string, AppealType]
    if (INDUSTRY_THEMES[industry] && APPEAL_CONFIG[appeal]) {
      return generateDemo(industry, appeal, lang) as any
    }
  }
  // Fallback to Supabase or default
  return generateDemo("consulting", "diagnostic", "ja") as any
}
