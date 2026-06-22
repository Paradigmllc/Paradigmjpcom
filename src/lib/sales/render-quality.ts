import type { Industry, ReportLocale } from "./types"

export type SalesRenderTheme = {
  accent: string
  accentDark: string
  accentSoft: string
  ink: string
  muted: string
  paper: string
  surface: string
  line: string
  signal: string
}

const INDUSTRY_LABEL_MAP: Record<string, { ja: string; en: string }> = {
  beauty_salon: { ja: "美容サロン", en: "beauty salon" },
  dental: { ja: "歯科医院", en: "dental clinic" },
  restaurant: { ja: "飲食店", en: "restaurant" },
  construction: { ja: "建設・工務店", en: "construction firm" },
  accounting: { ja: "会計事務所", en: "accounting firm" },
  retail: { ja: "小売・店舗", en: "retail store" },
  cleaning: { ja: "清掃・メンテナンス", en: "cleaning and maintenance business" },
  consulting: { ja: "コンサルティング", en: "consulting firm" },
  // Additional industries from RevenueOS classification
  "Hospitality / Food": { ja: "飲食・ホテル", en: "hospitality / food" },
  "E-Commerce / Retail": { ja: "EC・小売", en: "e-commerce / retail" },
  "Technology / IT": { ja: "テクノロジー・IT", en: "technology / IT" },
  "Healthcare / Medical": { ja: "医療・ヘルスケア", en: "healthcare / medical" },
  "Manufacturing / Industrial": { ja: "製造・工業", en: "manufacturing / industrial" },
  "Real Estate / Property": { ja: "不動産", en: "real estate / property" },
  "Education / Training": { ja: "教育・研修", en: "education / training" },
  "Legal / Professional Services": { ja: "法務・専門サービス", en: "legal / professional services" },
  "Finance / Insurance": { ja: "金融・保険", en: "finance / insurance" },
  "Transport / Logistics": { ja: "運輸・物流", en: "transport / logistics" },
  "Media / Entertainment": { ja: "メディア・エンタメ", en: "media / entertainment" },
  "Nonprofit / Government": { ja: "非営利・政府", en: "nonprofit / government" },
  "Energy / Utilities": { ja: "エネルギー・公益", en: "energy / utilities" },
  "Agriculture / Farming": { ja: "農業", en: "agriculture / farming" },
  "Fashion / Apparel": { ja: "ファッション・アパレル", en: "fashion / apparel" },
  Other: { ja: "その他業種", en: "other industry" },
}

export const INDUSTRY_LABEL: Record<Industry, { ja: string; en: string }> = INDUSTRY_LABEL_MAP as Record<Industry, { ja: string; en: string }>
