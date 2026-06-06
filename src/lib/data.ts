/**
 * Bilingual content for paradigm services / pricing / FAQs / works.
 *
 * P18-D-11 (2026-04-30): Replaced JP-only constants with `getServices(locale)`
 * etc. functions that return locale-appropriate strings. Solves the
 * "language switch shows JP everywhere" bug while we wait for full PayloadCMS
 * Block-driven migration (永久ルール A-CONTENT / AE-PHP-7).
 *
 * Backward compatibility: legacy `SERVICES` / `PRICING` exports remain (= JA
 * default) so any unsourced caller still works. New code must use the
 * locale-aware getters.
 */

export type Locale = "ja" | "en" | string

type Service = {
  id: string
  icon: string
  title: string
  tagline: string
  desc: string
  features: readonly string[]
  results: string
  color: string
}

type Plan = {
  name: string
  price: string
  period: string
  desc: string
  features: readonly string[]
  popular?: boolean
}

type ServiceKey = "web" | "meo" | "seo" | "ai"

const SERVICES_JA: readonly Service[] = [
  {
    id: "web",
    icon: "🌐",
    title: "Web制作",
    tagline: "売れるサイトを、最新技術で。",
    desc: "Next.js/WordPressによる高速・SEO最適化されたWebサイトを制作。デザインからコーディング、公開後の運用まで一貫してサポートします。",
    features: ["Next.js / WordPress対応", "レスポンシブ（モバイルファースト）", "Core Web Vitals最適化", "SEO内部対策込み", "CMS導入（更新が簡単）", "SSL/セキュリティ対策"],
    results: "平均ページ速度 95+（Lighthouse）",
    color: "indigo",
  },
  {
    id: "meo",
    icon: "📍",
    title: "MEO対策",
    tagline: "地域No.1を、Googleマップで。",
    desc: "Googleビジネスプロフィールの最適化により、地域検索で上位表示。来店型ビジネスの集客を最大化します。",
    features: ["GBPプロフィール最適化", "口コミ獲得施策", "投稿コンテンツ運用", "順位トラッキング", "競合分析レポート", "写真/動画最適化"],
    results: "平均3ヶ月でTOP3表示",
    color: "emerald",
  },
  {
    id: "seo",
    icon: "🔍",
    title: "SEO/GEO対策",
    tagline: "検索される仕組みを、つくる。",
    desc: "従来のSEOに加え、AI検索（ChatGPT/Gemini/Perplexity）での表示最適化（GEO）にも対応。未来の検索に備えます。",
    features: ["キーワード戦略設計", "コンテンツSEO", "テクニカルSEO", "AI検索最適化（GEO）", "構造化データ対応", "月次レポート"],
    results: "オーガニック流入 平均2.5倍",
    color: "amber",
  },
  {
    id: "ai",
    icon: "🤖",
    title: "AI導入支援",
    tagline: "AIを、ビジネスの武器に。",
    desc: "ChatGPT/Gemini等の最新AIを業務に導入。チャットボット、自動化、データ分析で生産性を劇的に向上させます。",
    features: ["AIチャットボット構築", "業務自動化（Trigger.dev/Dify）", "AIコンテンツ生成", "データ分析・可視化", "社内AI研修", "カスタムAI開発"],
    results: "業務時間 平均40%削減",
    color: "purple",
  },
]

const SERVICES_EN: readonly Service[] = [
  {
    id: "web",
    icon: "🌐",
    title: "Web Development",
    tagline: "Sites that sell, built on modern stacks.",
    desc: "High-performance, SEO-optimised websites in Next.js or WordPress. From design to coding to post-launch operations, end-to-end.",
    features: ["Next.js / WordPress", "Responsive (mobile-first)", "Core Web Vitals tuned", "On-page SEO included", "CMS integration", "SSL / security hardening"],
    results: "Lighthouse 95+ on average",
    color: "indigo",
  },
  {
    id: "meo",
    icon: "📍",
    title: "MEO (Local SEO)",
    tagline: "Win your neighbourhood on Google Maps.",
    desc: "Optimise your Google Business Profile to rank top in local search and capture more foot-traffic conversions.",
    features: ["GBP profile optimisation", "Review generation playbook", "Post calendar operations", "Rank tracking", "Competitor analysis reports", "Photo / video curation"],
    results: "TOP3 listing in ~3 months",
    color: "emerald",
  },
  {
    id: "seo",
    icon: "🔍",
    title: "SEO / GEO",
    tagline: "Be findable today and tomorrow.",
    desc: "Conventional SEO plus AI-search optimisation (GEO) for ChatGPT / Gemini / Perplexity. Future-proof discovery.",
    features: ["Keyword strategy", "Content SEO", "Technical SEO", "AI-search (GEO) optimisation", "Structured data", "Monthly reports"],
    results: "Organic traffic +2.5x on average",
    color: "amber",
  },
  {
    id: "ai",
    icon: "🤖",
    title: "AI Integration",
    tagline: "Turn AI into competitive advantage.",
    desc: "Bring ChatGPT / Gemini-class AI into your operations. Chatbots, automation, analytics — productivity step-change.",
    features: ["AI chatbot deployment", "Workflow automation (Trigger.dev/Dify)", "AI content generation", "Analytics & dashboards", "In-house AI training", "Custom AI development"],
    results: "Operating time -40% on average",
    color: "purple",
  },
]

const PRICING_JA = {
  web: {
    plans: [
      { name: "ライトプラン", price: "298,000", period: "〜", desc: "小規模サイト（5ページ以内）", features: ["トップページ+4ページ", "レスポンシブ対応", "SEO基本対策", "お問い合わせフォーム", "公開後1ヶ月サポート"], popular: false },
      { name: "スタンダード", price: "598,000", period: "〜", desc: "中規模サイト（10ページ以内）", features: ["トップページ+9ページ", "CMS導入（WordPress）", "SEO内部対策", "アニメーション実装", "写真撮影代行", "公開後3ヶ月サポート"], popular: true },
      { name: "プレミアム", price: "980,000", period: "〜", desc: "本格的なコーポレートサイト", features: ["ページ数無制限", "Next.js/カスタム開発", "デザインカンプ3案", "多言語対応", "アクセス解析設定", "公開後6ヶ月サポート"], popular: false },
    ] as readonly Plan[],
    monthly: "保守運用: 月額 19,800円〜（更新代行/SSL管理/バックアップ/障害対応）",
  },
  meo: {
    plans: [
      { name: "エントリー", price: "29,800", period: "/月", desc: "まず始めてみたい方", features: ["GBP初期最適化", "月2回投稿代行", "順位レポート（月次）", "口コミ返信テンプレ"], popular: false },
      { name: "スタンダード", price: "49,800", period: "/月", desc: "本格的にMEOに取り組む方", features: ["GBP完全最適化", "月4回投稿代行", "写真最適化", "口コミ獲得施策", "週次レポート", "競合分析"], popular: true },
      { name: "プロ", price: "79,800", period: "/月", desc: "複数店舗・エリア制覇", features: ["複数店舗対応（3店舗まで）", "毎日投稿", "口コミ管理ツール", "SNS連携", "電話コンバージョン計測", "専任担当者"], popular: false },
    ] as readonly Plan[],
    monthly: "最低契約期間: 6ヶ月（成果が出るまで3ヶ月が目安）",
  },
  seo: {
    plans: [
      { name: "SEOベーシック", price: "49,800", period: "/月", desc: "内部SEO+コンテンツ", features: ["サイト診断・改善", "月2本記事作成", "キーワード調査", "月次レポート"], popular: false },
      { name: "SEO+GEO", price: "79,800", period: "/月", desc: "SEO+AI検索対策", features: ["SEOベーシック全機能", "AI検索最適化（GEO）", "構造化データ実装", "月4本記事作成", "競合分析"], popular: true },
      { name: "フルパッケージ", price: "148,000", period: "/月", desc: "SEO+GEO+コンテンツ戦略", features: ["SEO+GEO全機能", "コンテンツ戦略設計", "月8本記事作成", "被リンク施策", "週次ミーティング", "Slack即対応"], popular: false },
    ] as readonly Plan[],
    monthly: "最低契約期間: 6ヶ月 / 初期費用: 100,000円（サイト診断+戦略設計）",
  },
  ai: {
    plans: [
      { name: "AIスタート", price: "198,000", period: "〜", desc: "チャットボット1つ導入", features: ["AIチャットボット構築", "FAQ学習（100問）", "サイト埋め込み", "1ヶ月運用サポート"], popular: false },
      { name: "AI業務改革", price: "498,000", period: "〜", desc: "業務プロセスのAI化", features: ["業務フロー分析", "自動化ワークフロー3本", "AIチャットボット", "社内研修（2時間）", "3ヶ月サポート"], popular: true },
      { name: "AIフル導入", price: "980,000", period: "〜", desc: "全社AI戦略+開発", features: ["AI戦略コンサル", "カスタムAI開発", "自動化ワークフロー無制限", "データ分析基盤", "6ヶ月サポート", "専任エンジニア"], popular: false },
    ] as readonly Plan[],
    monthly: "保守: 月額 29,800円〜（AIモデル更新/障害対応/性能改善）",
  },
}

const PRICING_EN = {
  web: {
    plans: [
      { name: "Light", price: "298,000", period: "+", desc: "Small site (≤5 pages)", features: ["Home + 4 pages", "Responsive", "On-page SEO", "Contact form", "1 month support"], popular: false },
      { name: "Standard", price: "598,000", period: "+", desc: "Mid-size site (≤10 pages)", features: ["Home + 9 pages", "WordPress CMS", "On-page SEO", "Animations", "Photography", "3 month support"], popular: true },
      { name: "Premium", price: "980,000", period: "+", desc: "Full corporate site", features: ["Unlimited pages", "Next.js custom dev", "3 design variants", "i18n", "Analytics setup", "6 month support"], popular: false },
    ] as readonly Plan[],
    monthly: "Maintenance: ¥19,800+/mo (updates / SSL / backups / incident response)",
  },
  meo: {
    plans: [
      { name: "Entry", price: "29,800", period: "/mo", desc: "Get started", features: ["GBP setup", "2 posts/mo", "Monthly rank report", "Review reply templates"], popular: false },
      { name: "Standard", price: "49,800", period: "/mo", desc: "Serious about MEO", features: ["Full GBP optimisation", "4 posts/mo", "Photo curation", "Review playbook", "Weekly reports", "Competitor analysis"], popular: true },
      { name: "Pro", price: "79,800", period: "/mo", desc: "Multi-store / regional", features: ["Up to 3 stores", "Daily posts", "Review management tool", "Social sync", "Call conversion tracking", "Dedicated PM"], popular: false },
    ] as readonly Plan[],
    monthly: "6-month minimum (3 months is the typical results horizon)",
  },
  seo: {
    plans: [
      { name: "SEO Basic", price: "49,800", period: "/mo", desc: "On-page + content", features: ["Site audit & fixes", "2 articles/mo", "Keyword research", "Monthly report"], popular: false },
      { name: "SEO + GEO", price: "79,800", period: "/mo", desc: "SEO + AI-search", features: ["All SEO Basic", "AI-search (GEO)", "Structured data", "4 articles/mo", "Competitor analysis"], popular: true },
      { name: "Full Package", price: "148,000", period: "/mo", desc: "SEO + GEO + strategy", features: ["All SEO+GEO", "Content strategy", "8 articles/mo", "Backlink campaigns", "Weekly meeting", "Slack response"], popular: false },
    ] as readonly Plan[],
    monthly: "6-month minimum / Setup fee ¥100,000 (audit + strategy)",
  },
  ai: {
    plans: [
      { name: "AI Start", price: "198,000", period: "+", desc: "1 chatbot deployment", features: ["AI chatbot build", "FAQ training (100 Qs)", "Site embed", "1 month support"], popular: false },
      { name: "AI Transform", price: "498,000", period: "+", desc: "Operations transformation", features: ["Workflow analysis", "3 automation flows", "AI chatbot", "2-hour training", "3 month support"], popular: true },
      { name: "AI Full", price: "980,000", period: "+", desc: "Org-wide AI strategy + build", features: ["AI strategy consulting", "Custom AI dev", "Unlimited flows", "Analytics platform", "6 month support", "Dedicated engineer"], popular: false },
    ] as readonly Plan[],
    monthly: "Maintenance: ¥29,800+/mo (model updates / incident response / improvements)",
  },
}

export type ServicePricing = (typeof PRICING_JA)[ServiceKey]

export function getServices(locale: Locale): readonly Service[] {
  return locale === "en" ? SERVICES_EN : SERVICES_JA
}

export function getServiceByKey(locale: Locale, key: ServiceKey): Service {
  const list = getServices(locale)
  return list.find((s) => s.id === key)!
}

export function getPricingFor(locale: Locale, key: ServiceKey): ServicePricing {
  const root = locale === "en" ? PRICING_EN : PRICING_JA
  return root[key]
}

// ─── Backward compatibility (JA default) ─────────────────────────
export const SERVICES = SERVICES_JA
export const PRICING = PRICING_JA

// ─── FAQ (legacy JP-only export — replaced by Payload `faqs` collection) ─
export const FAQS = [
  { q: "初回相談は無料ですか？", a: "はい、初回のオンライン相談（30分）は完全無料です。" },
  { q: "制作期間はどのくらいですか？", a: "ライトプラン: 2-3週間、スタンダード: 1-2ヶ月、プレミアム: 2-3ヶ月が目安です。" },
]

// ─── Works (legacy JP-only export — replaced by Payload `works` collection) ─
export const WORKS = [
  { title: "飲食店HP制作+MEO", industry: "飲食", desc: "個人経営イタリアンのHP制作とMEO対策。", metrics: "予約数 +30件/月", tags: ["Web制作", "MEO"], color: "emerald" },
]
