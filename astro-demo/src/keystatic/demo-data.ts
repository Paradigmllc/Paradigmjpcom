export interface DemoData {
  title: string
  customerName: string
  companyId?: string
  domain?: string
  industry: string
  accentColor: string
  accentColorDark: string
  status: "draft" | "review" | "ready"
  heroHeadline: string
  heroSubtitle: string
  serviceTitle: string
  services: { title: string; description: string; icon: string }[]
  caseTitle: string
  caseDescription: string
  caseMetrics: { label: string; value: string; suffix: string }[]
  ctaTitle: string
  ctaBody: string
  calBookingUrl: string
}

export const DEFAULT_DEMO: DemoData = {
  title: "default-demo",
  customerName: "株式会社サンプル",
  companyId: "",
  domain: "",
  industry: "consulting",
  accentColor: "#7c3aed",
  accentColorDark: "#5b21b6",
  status: "draft",
  heroHeadline: "デジタルマーケティングを次のステージへ",
  heroSubtitle: "診断データに基づくパーソナライズド・リニューアル提案",
  serviceTitle: "提供サービス",
  services: [
    { title: "Webサイト制作", description: "最新技術でコンバージョン最適化", icon: "Globe" },
    { title: "SEO/MEO対策", description: "検索上位表示で新規顧客獲得", icon: "Search" },
    { title: "動画マーケティング", description: "視覚的訴求でエンゲージメント向上", icon: "Play" },
  ],
  caseTitle: "導入実績",
  caseDescription: "同業種での改善実績とKPIデータ",
  caseMetrics: [
    { label: "CVR改善", value: "2.4", suffix: "x" },
    { label: "問合せ増加", value: "156", suffix: "%" },
    { label: "表示速度", value: "92", suffix: "点" },
  ],
  ctaTitle: "まずは無料相談から",
  ctaBody: "15分のオンライン診断で、改善の余地を可視化します。お気軽にご予約ください。",
  calBookingUrl: "https://cal.com/paradigm-jp/15min",
}
