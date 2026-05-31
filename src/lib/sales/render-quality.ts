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
}

const INDUSTRY_THEME: Record<Industry, SalesRenderTheme> = {
  beauty_salon: {
    accent: "#d9467d",
    accentDark: "#9f1239",
    accentSoft: "#fdf2f8",
    ink: "#18181b",
    muted: "#667085",
    paper: "#fffafb",
    surface: "#ffffff",
    line: "#f3d6df",
    signal: "#f9a8d4",
  },
  dental: {
    accent: "#0891b2",
    accentDark: "#155e75",
    accentSoft: "#ecfeff",
    ink: "#111827",
    muted: "#64748b",
    paper: "#f8fafc",
    surface: "#ffffff",
    line: "#ccecf4",
    signal: "#67e8f9",
  },
  restaurant: {
    accent: "#c2410c",
    accentDark: "#7c2d12",
    accentSoft: "#fff7ed",
    ink: "#1c1917",
    muted: "#78716c",
    paper: "#fffbf7",
    surface: "#ffffff",
    line: "#fed7aa",
    signal: "#fb923c",
  },
  construction: {
    accent: "#ca8a04",
    accentDark: "#713f12",
    accentSoft: "#fefce8",
    ink: "#111827",
    muted: "#5b6472",
    paper: "#fbfaf5",
    surface: "#ffffff",
    line: "#fde68a",
    signal: "#facc15",
  },
  accounting: {
    accent: "#2563eb",
    accentDark: "#1e3a8a",
    accentSoft: "#eff6ff",
    ink: "#0f172a",
    muted: "#64748b",
    paper: "#f8fafc",
    surface: "#ffffff",
    line: "#bfdbfe",
    signal: "#60a5fa",
  },
  retail: {
    accent: "#7c3aed",
    accentDark: "#4c1d95",
    accentSoft: "#f5f3ff",
    ink: "#18181b",
    muted: "#71717a",
    paper: "#fbfaff",
    surface: "#ffffff",
    line: "#ddd6fe",
    signal: "#a78bfa",
  },
  cleaning: {
    accent: "#059669",
    accentDark: "#065f46",
    accentSoft: "#ecfdf5",
    ink: "#10201b",
    muted: "#64748b",
    paper: "#f8fffb",
    surface: "#ffffff",
    line: "#bbf7d0",
    signal: "#34d399",
  },
  consulting: {
    accent: "#4f46e5",
    accentDark: "#312e81",
    accentSoft: "#eef2ff",
    ink: "#111827",
    muted: "#64748b",
    paper: "#f9fafb",
    surface: "#ffffff",
    line: "#c7d2fe",
    signal: "#818cf8",
  },
}

const DEFAULT_THEME: SalesRenderTheme = {
  accent: "#111827",
  accentDark: "#030712",
  accentSoft: "#f3f4f6",
  ink: "#111827",
  muted: "#6b7280",
  paper: "#f9fafb",
  surface: "#ffffff",
  line: "#e5e7eb",
  signal: "#9ca3af",
}

export function themeForIndustry(industry: Industry | null | undefined): SalesRenderTheme {
  return industry ? INDUSTRY_THEME[industry] : DEFAULT_THEME
}

export function labelForIndustry(industry: Industry | null | undefined, locale: ReportLocale | string = "ja"): string {
  if (!industry) return locale === "ja" ? "対象業種" : "target industry"
  return locale === "ja" ? INDUSTRY_LABEL[industry].ja : INDUSTRY_LABEL[industry].en
}

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
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
