/**
 * Astro demo data — dynamic from Supabase + Keystatic, with industry theming.
 *
 * Priority: ?slug= query param → Supabase SSOT → Keystatic content → default
 */
export interface DemoData {
  title: string
  customerName: string
  companyId?: string
  domain?: string
  industry: string
  accentColor: string
  accentColorDark: string
  accentColorLight: string
  status: string
  heroHeadline: string
  heroSubtitle: string
  heroCta: string
  heroStats?: { label: string; value: string; suffix: string }[]
  beforeImage?: string
  afterImage?: string
  beforeLabel?: string
  afterLabel?: string
  improvementPoints?: string[]
  serviceTitle: string
  serviceSubtitle?: string
  services: { title: string; description: string; icon: string; features?: string[] }[]
  caseTitle: string
  caseDescription: string
  caseMetrics: { label: string; value: string; suffix: string; detail?: string }[]
  caseImage?: string
  processTitle?: string
  processSteps?: { step: string; title: string; description: string; icon: string }[]
  trustTitle?: string
  testimonials?: { quote: string; author: string; role: string; company: string }[]
  certifications?: string[]
  faqTitle?: string
  faqItems?: { question: string; answer: string }[]
  ctaTitle: string
  ctaBody: string
  calBookingUrl: string
  screenshotUrl?: string
  reportUrl?: string
  pagespeedMobile?: number
  pagespeedDesktop?: number
  issues?: string[]
}

/** Industry → accent color mapping */
const INDUSTRY_THEMES: Record<string, { accent: string; dark: string; light: string }> = {
  beauty_salon: { accent: "#ec4899", dark: "#be185d", light: "#f9a8d4" },
  dental: { accent: "#06b6d4", dark: "#0e7490", light: "#67e8f9" },
  restaurant: { accent: "#f59e0b", dark: "#b45309", light: "#fcd34d" },
  construction: { accent: "#f97316", dark: "#c2410c", light: "#fdba74" },
  accounting: { accent: "#6366f1", dark: "#4338ca", light: "#a5b4fc" },
  retail: { accent: "#10b981", dark: "#047857", light: "#6ee7b7" },
  cleaning: { accent: "#3b82f6", dark: "#1d4ed8", light: "#93c5fd" },
  consulting: { accent: "#7c3aed", dark: "#5b21b6", light: "#a78bfa" },
  medical: { accent: "#14b8a6", dark: "#0f766e", light: "#5eead4" },
  legal: { accent: "#64748b", dark: "#334155", light: "#94a3b8" },
  education: { accent: "#8b5cf6", dark: "#6d28d9", light: "#c4b5fd" },
  real_estate: { accent: "#0891b2", dark: "#155e75", light: "#67e8f9" },
}

function themeFor(industry: string) {
  return INDUSTRY_THEMES[industry] ?? INDUSTRY_THEMES.consulting
}

const JA_INDUSTRY: Record<string, string> = {
  beauty_salon: "美容サロン", dental: "歯科医院", restaurant: "飲食店",
  construction: "建設業", accounting: "会計事務所", retail: "小売業",
  cleaning: "清掃業", consulting: "コンサルティング", medical: "医療機関",
  legal: "法律事務所", education: "教育機関", real_estate: "不動産",
}

/** Fetch demo data from Supabase (SSOT) */
async function fetchFromSupabase(slug: string): Promise<DemoData | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://yihdmgtxiqfdgdueolub.supabase.co"
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) return null

  try {
    // Try sales_companies with demo_site meta
    const res = await fetch(
      `${url}/rest/v1/sales_companies?select=*&slug=eq.${encodeURIComponent(slug)}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const companies = await res.json() as any[]
    if (!companies.length) return null
    const c = companies[0]
    const theme = themeFor(c.industry)
    const demoSite = c.meta?.demo_site || {}
    const scan = c.meta?.scan || {}

    return {
      title: slug,
      customerName: c.company_name || "サンプル企業",
      companyId: c.id,
      domain: c.domain,
      industry: c.industry || "consulting",
      accentColor: theme.accent,
      accentColorDark: theme.dark,
      accentColorLight: theme.light,
      status: "ready",
      heroHeadline: demoSite.hero || `${c.company_name}のWeb改善提案`,
      heroSubtitle: demoSite.subtitle || "データ診断に基づくパーソナライズド改善プラン",
      heroCta: "無料診断を申し込む",
      heroStats: [
        { label: "PageSpeed", value: String(c.pagespeed_mobile || "—"), suffix: "点" },
        { label: "検出課題", value: String((c.detected_issues || []).length || "—"), suffix: "件" },
        { label: "改善余地", value: "大", suffix: "" },
      ],
      beforeImage: c.meta?.screenshot_url,
      afterImage: demoSite.preview_url,
      beforeLabel: "現状のサイト",
      afterLabel: "改善イメージ",
      improvementPoints: (c.detected_issues || []).slice(0, 4).map((i: string) => {
        const map: Record<string, string> = {
          slow_pagespeed: "表示速度を大幅改善",
          no_ssl: "SSL証明書を導入し安全性を確保",
          no_mobile: "スマートフォン対応を完了",
          no_form: "問い合わせフォームを新設",
          no_seo: "検索エンジン最適化を実施",
          no_meo: "Googleマップ対策を実施",
          broken_links: "リンク切れを全て修正",
          no_analytics: "アクセス解析を導入",
          old_design: "モダンなデザインに刷新",
          no_sns: "SNS連携を強化",
        }
        return map[i] || `${i}を改善`
      }),
      serviceTitle: "改善ソリューション",
      services: [
        { title: "Webサイトリニューアル", description: "コンバージョン最適化を軸に、高速表示とモダンデザインを両立", icon: "Globe", features: ["レスポンシブ対応", "Core Web Vitals最適化", "CMS導入"] },
        { title: "SEO/MEO対策", description: "検索上位表示とGoogleマップ最適化で安定的な集客基盤を構築", icon: "Search", features: ["キーワード戦略", "内部施策", "MEO最適化"] },
        { title: "AI活用・自動化", description: "AIチャットボット・自動応答で24時間顧客対応を実現", icon: "Zap", features: ["AIチャットボット", "自動返信", "リード管理"] },
      ],
      caseTitle: "改善シミュレーション",
      caseDescription: "診断データに基づく改善後の想定インパクト",
      caseMetrics: [
        { label: "表示速度", value: "90+", suffix: "点", detail: "PageSpeed Insights目標スコア" },
        { label: "問合せ増加", value: "1.5-3", suffix: "x", detail: "改善後の想定問合せ倍率" },
        { label: "検索順位", value: "上位", suffix: "表示", detail: "主要キーワードでの検索順位改善" },
      ],
      processTitle: "プロジェクトの流れ",
      processSteps: [
        { step: "01", title: "無料診断", description: "現状サイトを分析し改善余地を可視化。3営業日でレポートお届け。", icon: "Search" },
        { step: "02", title: "戦略提案", description: "優先度・予算感を含めた改善ロードマップを提案。", icon: "Zap" },
        { step: "03", title: "制作・実装", description: "デザインから開発まで一貫品質でスピーディに進行。", icon: "BarChart" },
        { step: "04", title: "効果検証", description: "公開後も分析とABテストで継続改善。レポート提出。", icon: "Shield" },
      ],
      trustTitle: "信頼の実績",
      testimonials: [
        { quote: "サイトリニューアル後、問合せ数が3倍に。投資回収は3ヶ月でした。", author: "導入企業A", role: "代表取締役", company: "株式会社A" },
      ],
      certifications: ["Google Partner", "AWS Certified"],
      faqTitle: "よくあるご質問",
      faqItems: [
        { question: "制作期間はどのくらいですか？", answer: "5ページ程度のサイトで4〜6週間が目安。診断は3営業日で完了します。" },
        { question: "SEO対策は含まれますか？", answer: "全プランに基本的なSEO対策（内部施策、構造化データ、Core Web Vitals最適化）が含まれます。" },
        { question: "保守・更新はどうなりますか？", answer: "月額保守プランあり。更新、セキュリティアップデート、分析レポートを含みます。" },
        { question: "支払い方法は？", answer: "銀行振込・クレジットカードに対応。分割払いもご相談可能です。" },
      ],
      ctaTitle: "まずは無料診断から",
      ctaBody: "15分のオンライン診断で改善余地を可視化。お気軽にご予約ください。",
      calBookingUrl: c.meta?.contact_form_url || demoSite.cal_url || "https://cal.com/paradigm-jp/15min",
      screenshotUrl: c.meta?.screenshot_url,
      reportUrl: c.report_url,
      pagespeedMobile: c.pagespeed_mobile,
      pagespeedDesktop: c.pagespeed_desktop,
      issues: c.detected_issues,
    }
  } catch {
    return null
  }
}

/** Default demo data for fallback */
function defaultDemo(slug: string): DemoData {
  const theme = themeFor("consulting")
  return {
    title: slug,
    customerName: "サンプル企業",
    domain: "example.com",
    industry: "consulting",
    accentColor: theme.accent,
    accentColorDark: theme.dark,
    accentColorLight: theme.light,
    status: "ready",
    heroHeadline: "データに基づくWeb改善提案",
    heroSubtitle: "診断→改善→成長。貴社のWebサイトを次のステージへ",
    heroCta: "無料診断を申し込む",
    heroStats: [
      { label: "平均CVR改善", value: "2.4", suffix: "x" },
      { label: "お客様満足度", value: "98", suffix: "%" },
      { label: "納品実績", value: "200", suffix: "件+" },
    ],
    beforeLabel: "現状",
    afterLabel: "改善後",
    improvementPoints: ["表示速度の大幅改善", "問い合わせ導線の最適化", "検索流入の拡大", "モバイル対応の完全化"],
    serviceTitle: "改善ソリューション",
    services: [
      { title: "Webサイト制作", description: "コンバージョン最適化を軸に、高速表示とモダンデザインを両立", icon: "Globe" },
      { title: "SEO/MEO対策", description: "検索上位表示とGoogleマップ最適化で集客", icon: "Search" },
      { title: "AI活用支援", description: "AIチャットボット・自動化で業務効率化", icon: "Zap" },
    ],
    caseTitle: "導入実績",
    caseDescription: "データに基づくアプローチで確実な成果を実現",
    caseMetrics: [
      { label: "CVR改善", value: "2.4", suffix: "x" },
      { label: "問合せ増加", value: "156", suffix: "%" },
      { label: "表示速度", value: "92", suffix: "点" },
    ],
    processSteps: [
      { step: "01", title: "無料診断", description: "現状を分析し改善余地をレポート", icon: "Search" },
      { step: "02", title: "戦略提案", description: "改善ロードマップを提案", icon: "Zap" },
      { step: "03", title: "制作実装", description: "一貫品質でスピーディに進行", icon: "BarChart" },
      { step: "04", title: "効果検証", description: "公開後も継続的に改善", icon: "Shield" },
    ],
    certifications: ["Google Partner", "AWS Certified"],
    faqItems: [
      { question: "制作期間は？", answer: "4〜6週間が目安です。診断は3営業日で完了します。" },
      { question: "SEO対策は含まれますか？", answer: "全プランに基本的なSEO対策が含まれます。" },
    ],
    ctaTitle: "まずは無料診断から",
    ctaBody: "15分のオンライン診断で改善余地を可視化します",
    calBookingUrl: "https://cal.com/paradigm-jp/15min",
  }
}

export async function getDemoData(slug: string): Promise<DemoData> {
  // Try Supabase first
  const supabase = await fetchFromSupabase(slug)
  if (supabase) return supabase
  // Fallback to default
  return defaultDemo(slug)
}

export { INDUSTRY_THEMES, JA_INDUSTRY, themeFor }
