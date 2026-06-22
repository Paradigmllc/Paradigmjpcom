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

export const INDUSTRY_LABEL: Record<Industry, { ja: string; en: string }> = {
  beauty_salon: { ja: "美容サロン", en: "beauty salon" },
  dental: { ja: "歯科医院", en: "dental clinic" },
  restaurant: { ja: "飲食店", en: "restaurant" },
  construction: { ja: "建設・工務店", en: "construction firm" },
  accounting: { ja: "会計事務所", en: "accounting firm" },
  retail: { ja: "小売・店舗", en: "retail store" },
  cleaning: { ja: "清掃・メンテナンス", en: "cleaning and maintenance business" },
  consulting: { ja: "コンサルティング", en: "consulting firm" },
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

const INDUSTRY_THEME: Record<Industry, SalesRenderTheme> = {
  beauty_salon: {
    accent: "#d9467d", accentDark: "#9f1239", accentSoft: "#fff1f6",
    ink: "#18181b", muted: "#667085", paper: "#fffafb", surface: "#ffffff",
    line: "#f3d6df", signal: "#f9a8d4",
  },
  dental: {
    accent: "#0891b2", accentDark: "#155e75", accentSoft: "#ecfeff",
    ink: "#111827", muted: "#64748b", paper: "#f8fafc", surface: "#ffffff",
    line: "#ccecf4", signal: "#67e8f9",
  },
  restaurant: {
    accent: "#c2410c", accentDark: "#7c2d12", accentSoft: "#fff7ed",
    ink: "#1c1917", muted: "#78716c", paper: "#fffbf7", surface: "#ffffff",
    line: "#fed7aa", signal: "#fb923c",
  },
  construction: {
    accent: "#ca8a04", accentDark: "#713f12", accentSoft: "#fefce8",
    ink: "#111827", muted: "#5b6472", paper: "#fbfaf5", surface: "#ffffff",
    line: "#fde68a", signal: "#facc15",
  },
  accounting: {
    accent: "#2563eb", accentDark: "#1e3a8a", accentSoft: "#eff6ff",
    ink: "#0f172a", muted: "#64748b", paper: "#f8fafc", surface: "#ffffff",
    line: "#bfdbfe", signal: "#60a5fa",
  },
  retail: {
    accent: "#7c3aed", accentDark: "#4c1d95", accentSoft: "#f5f3ff",
    ink: "#18181b", muted: "#71717a", paper: "#fbfaff", surface: "#ffffff",
    line: "#ddd6fe", signal: "#a78bfa",
  },
  cleaning: {
    accent: "#059669", accentDark: "#065f46", accentSoft: "#ecfdf5",
    ink: "#10201b", muted: "#64748b", paper: "#f8fffb", surface: "#ffffff",
    line: "#bbf7d0", signal: "#34d399",
  },
  consulting: {
    accent: "#8b5cf6", accentDark: "#312e81", accentSoft: "#eef2ff",
    ink: "#111827", muted: "#64748b", paper: "#f9fafb", surface: "#ffffff",
    line: "#c7d2fe", signal: "#a78bfa",
  },
  "Hospitality / Food": { accent: "#d9467d", accentDark: "#9f1239", accentSoft: "#fff1f6", ink: "#18181b", muted: "#667085", paper: "#fffafb", surface: "#ffffff", line: "#f3d6df", signal: "#f9a8d4" },
  "E-Commerce / Retail": { accent: "#7c3aed", accentDark: "#4c1d95", accentSoft: "#f5f3ff", ink: "#18181b", muted: "#71717a", paper: "#fbfaff", surface: "#ffffff", line: "#ddd6fe", signal: "#a78bfa" },
  "Technology / IT": { accent: "#2563eb", accentDark: "#1e3a8a", accentSoft: "#eff6ff", ink: "#0f172a", muted: "#64748b", paper: "#f8fafc", surface: "#ffffff", line: "#bfdbfe", signal: "#60a5fa" },
  "Healthcare / Medical": { accent: "#059669", accentDark: "#065f46", accentSoft: "#ecfdf5", ink: "#10201b", muted: "#64748b", paper: "#f8fffb", surface: "#ffffff", line: "#bbf7d0", signal: "#34d399" },
  "Manufacturing / Industrial": { accent: "#ca8a04", accentDark: "#713f12", accentSoft: "#fefce8", ink: "#111827", muted: "#5b6472", paper: "#fbfaf5", surface: "#ffffff", line: "#fde68a", signal: "#facc15" },
  "Real Estate / Property": { accent: "#0f766e", accentDark: "#0f172a", accentSoft: "#f0fdfa", ink: "#111827", muted: "#6b7280", paper: "#f9fafb", surface: "#ffffff", line: "#e5e7eb", signal: "#5eead4" },
  "Education / Training": { accent: "#8b5cf6", accentDark: "#312e81", accentSoft: "#eef2ff", ink: "#111827", muted: "#64748b", paper: "#f9fafb", surface: "#ffffff", line: "#c7d2fe", signal: "#a78bfa" },
  "Legal / Professional Services": { accent: "#0f766e", accentDark: "#0f172a", accentSoft: "#f0fdfa", ink: "#111827", muted: "#6b7280", paper: "#f9fafb", surface: "#ffffff", line: "#e5e7eb", signal: "#5eead4" },
  "Finance / Insurance": { accent: "#2563eb", accentDark: "#1e3a8a", accentSoft: "#eff6ff", ink: "#0f172a", muted: "#64748b", paper: "#f8fafc", surface: "#ffffff", line: "#bfdbfe", signal: "#60a5fa" },
  "Transport / Logistics": { accent: "#ca8a04", accentDark: "#713f12", accentSoft: "#fefce8", ink: "#111827", muted: "#5b6472", paper: "#fbfaf5", surface: "#ffffff", line: "#fde68a", signal: "#facc15" },
  "Media / Entertainment": { accent: "#8b5cf6", accentDark: "#312e81", accentSoft: "#eef2ff", ink: "#111827", muted: "#64748b", paper: "#f9fafb", surface: "#ffffff", line: "#c7d2fe", signal: "#a78bfa" },
  "Nonprofit / Government": { accent: "#0f766e", accentDark: "#0f172a", accentSoft: "#f0fdfa", ink: "#111827", muted: "#6b7280", paper: "#f9fafb", surface: "#ffffff", line: "#e5e7eb", signal: "#5eead4" },
  "Energy / Utilities": { accent: "#059669", accentDark: "#065f46", accentSoft: "#ecfdf5", ink: "#10201b", muted: "#64748b", paper: "#f8fffb", surface: "#ffffff", line: "#bbf7d0", signal: "#34d399" },
  "Agriculture / Farming": { accent: "#059669", accentDark: "#065f46", accentSoft: "#ecfdf5", ink: "#10201b", muted: "#64748b", paper: "#f8fffb", surface: "#ffffff", line: "#bbf7d0", signal: "#34d399" },
  "Fashion / Apparel": { accent: "#d9467d", accentDark: "#9f1239", accentSoft: "#fff1f6", ink: "#18181b", muted: "#667085", paper: "#fffafb", surface: "#ffffff", line: "#f3d6df", signal: "#f9a8d4" },
  Other: { accent: "#0f766e", accentDark: "#0f172a", accentSoft: "#f0fdfa", ink: "#111827", muted: "#6b7280", paper: "#f9fafb", surface: "#ffffff", line: "#e5e7eb", signal: "#5eead4" },
}

const DEFAULT_THEME: SalesRenderTheme = {
  accent: "#0f766e", accentDark: "#0f172a", accentSoft: "#f0fdfa",
  ink: "#111827", muted: "#6b7280", paper: "#f9fafb", surface: "#ffffff",
  line: "#e5e7eb", signal: "#5eead4",
}

export function themeForIndustry(industry: Industry | null | undefined): SalesRenderTheme {
  if (!industry) return DEFAULT_THEME
  return INDUSTRY_THEME[industry] ?? DEFAULT_THEME
}

export function labelForIndustry(industry: Industry | null | undefined, locale: ReportLocale | string = "ja"): string {
  if (!industry) return locale === "ja" ? "対象業種" : "target industry"
  const entry = INDUSTRY_LABEL[industry]
  if (!entry) return locale === "ja" ? "その他業種" : "other industry"
  return locale === "ja" ? entry.ja : entry.en
}

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;")
}

export function compactText(value: string | null | undefined, fallback: string, max = 180): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim()
  if (!text) return fallback
  return text.length > max ? `${text.slice(0, max - 1)}...` : text
}

export function scoreTone(score: number | null | undefined): "good" | "warning" | "critical" | "neutral" {
  if (score === null || score === undefined) return "neutral"
  if (score < 50) return "critical"
  if (score < 75) return "warning"
  return "good"
}
