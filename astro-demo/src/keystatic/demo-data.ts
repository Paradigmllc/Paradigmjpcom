export interface DemoData {
  // ── Identity ──
  title: string
  customerName: string
  companyId?: string
  domain?: string
  industry: string
  accentColor: string
  accentColorDark: string
  status: "draft" | "review" | "ready"

  // ── Hero ──
  heroHeadline: string
  heroSubtitle: string
  heroCta: string
  heroStats?: { label: string; value: string; suffix: string }[]

  // ── Before/After ──
  beforeImage?: string
  afterImage?: string
  beforeLabel?: string
  afterLabel?: string
  improvementPoints?: string[]

  // ── Services ──
  serviceTitle: string
  serviceSubtitle?: string
  services: { title: string; description: string; icon: string; features?: string[] }[]

  // ── Case Study ──
  caseTitle: string
  caseDescription: string
  caseMetrics: { label: string; value: string; suffix: string; detail?: string }[]
  caseImage?: string

  // ── Process ──
  processTitle?: string
  processSteps?: { step: string; title: string; description: string; icon: string }[]

  // ── Trust ──
  trustTitle?: string
  testimonials?: { quote: string; author: string; role: string; company: string }[]
  clientLogos?: string[]
  certifications?: string[]

  // ── FAQ ──
  faqTitle?: string
  faqItems?: { question: string; answer: string }[]

  // ── CTA ──
  ctaTitle: string
  ctaBody: string
  calBookingUrl: string
}

export const DEFAULT_DEMO: DemoData = {
  title: "default-demo",
  customerName: "株式会社サンプル",
  companyId: "",
  domain: "example.com",
  industry: "consulting",
  accentColor: "#7c3aed",
  accentColorDark: "#5b21b6",
  status: "ready",

  // Hero
  heroHeadline: "デジタルマーケティングを次のステージへ",
  heroSubtitle: "データ診断に基づくパーソナライズド改善プラン。御社の現状を可視化し、具体的な改善ロードマップをご提案します。",
  heroCta: "無料診断を申し込む",
  heroStats: [
    { label: "平均CVR改善", value: "2.4", suffix: "x" },
    { label: "お客様満足度", value: "98", suffix: "%" },
    { label: "納品実績", value: "200", suffix: "件+" },
  ],

  // Before/After
  beforeImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
  afterImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
  beforeLabel: "現状のサイト",
  afterLabel: "改善後のサイト",
  improvementPoints: [
    "スマートフォン表示速度を3.2秒→0.8秒に改善",
    "問い合わせフォームの離脱率を67%削減",
    "検索エンジンからの流入を月間2.4倍に拡大",
    "ユーザー滞在時間を平均2.8分→5.1分に延伸",
  ],

  // Services
  serviceTitle: "改善ソリューション",
  serviceSubtitle: "診断データに基づき、最も効果の高い領域から着手します",
  services: [
    {
      title: "Webサイトリニューアル",
      description: "コンバージョン最適化を軸に、モダンなデザインと高速表示を両立",
      icon: "Globe",
      features: ["レスポンシブデザイン", "Core Web Vitals最適化", "CMS導入"],
    },
    {
      title: "SEO/MEO対策",
      description: "検索上位表示とマップ最適化で、新規顧客の安定的な獲得基盤を構築",
      icon: "Search",
      features: ["キーワード戦略", "内部施策", "MEO対策"],
    },
    {
      title: "コンテンツマーケティング",
      description: "見込み客の課題に応える記事・動画で、自然な問い合わせ導線を設計",
      icon: "Play",
      features: ["記事制作", "動画制作", "SNS運用"],
    },
  ],

  // Case Study
  caseTitle: "導入実績",
  caseDescription: "同業他社での改善実績。データに基づくアプローチで、確実な成果を実現しています。",
  caseMetrics: [
    { label: "CVR改善", value: "2.4", suffix: "x", detail: "資料請求からの成約率が2.4倍に向上" },
    { label: "問合せ増加", value: "156", suffix: "%", detail: "月間問合せ数が前年比156%に成長" },
    { label: "表示速度", value: "92", suffix: "点", detail: "Google PageSpeed Insightsスコア" },
    { label: "直帰率低減", value: "42", suffix: "%", detail: "改善前比で直帰率を42%削減" },
  ],
  caseImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",

  // Process
  processTitle: "プロジェクトの流れ",
  processSteps: [
    { step: "01", title: "無料診断", description: "現状サイトを分析し、改善余地を可視化したレポートをお届けします。所要3営業日。", icon: "Search" },
    { step: "02", title: "戦略提案", description: "診断結果に基づき、優先度・予算感を含めた改善ロードマップをご提案します。", icon: "Zap" },
    { step: "03", title: "制作・実装", description: "デザインから開発まで、一貫した品質管理でスピーディに進行します。", icon: "BarChart" },
    { step: "04", title: "効果検証", description: "公開後もアクセス解析とABテストで継続改善。成果をレポーティングします。", icon: "Shield" },
  ],

  // Trust
  trustTitle: "信頼の実績",
  testimonials: [
    { quote: "サイトリニューアル後、問合せ数が月間50件から130件に増加。投資回収は3ヶ月でした。", author: "山田太郎", role: "代表取締役", company: "株式会社A" },
    { quote: "SEO対策で検索順位が圏外から3位に。安定した集客基盤ができました。", author: "佐藤花子", role: "マーケティング部長", company: "株式会社B" },
  ],
  clientLogos: [],
  certifications: ["Google Partner", "AWS Certified", "Microsoft Partner"],

  // FAQ
  faqTitle: "よくあるご質問",
  faqItems: [
    { question: "制作期間はどのくらいですか？", answer: "規模にもよりますが、5ページ程度のコーポレートサイトで4〜6週間、LPで2〜3週間が目安です。診断フェーズは3営業日で完了します。" },
    { question: "保守・更新はどうなりますか？", answer: "月額の保守プランをご用意しています。コンテンツ更新、セキュリティアップデート、アクセス解析レポートを含みます。" },
    { question: "SEO対策は含まれますか？", answer: "はい。全プランに基本的なSEO対策（内部施策、構造化データ、Core Web Vitals最適化）が含まれます。" },
    { question: "他社で制作したサイトの改修も可能ですか？", answer: "可能です。既存サイトの診断から開始し、必要な改修範囲を特定してご提案します。" },
    { question: "支払い方法を教えてください", answer: "銀行振込・クレジットカードに対応しています。分割払いもご相談可能です。" },
  ],

  // CTA
  ctaTitle: "まずは無料診断から",
  ctaBody: "15分のオンライン診断で、改善の余地を可視化します。お気軽にご予約ください。",
  calBookingUrl: "https://cal.com/paradigm-jp/15min",
}

export const DEMO_REGISTRY: Record<string, DemoData> = {
  "default-demo": DEFAULT_DEMO,
}

export function getDemoData(slug: string): DemoData {
  return DEMO_REGISTRY[slug] ?? DEFAULT_DEMO
}
