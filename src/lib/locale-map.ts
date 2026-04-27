/**
 * locale-map.ts — Locale × SalesRegion × PPP 係数 × RTL の単一の真実の源
 *
 * P17 2026-04-27 新規実装（12-locale 拡張）
 *
 * 設計原則:
 * - SalesRegion (appexx canonical 12値) と Locale (paradigmjp 12 言語コード) は別概念
 *   → SALES_REGION_TO_LOCALE マッピングで吸収
 * - PPP 係数は en (USD $1.0) 基準で乗算 — Worldbank PPP 2024 保守的目安
 * - RTL は ar のみ — `isRtlLocale()` で判定
 * - AE-10 URL-state supremacy: locale は URL の `[locale]` segment が唯一の正
 *
 * 参考: グローバル CLAUDE.md s10-5 (Sericia ar RTL 実装パターン)
 */

import { routing } from "@/i18n/routing"

// ──────────────────────────────────────────────
// Locale (12 個・routing.ts と完全同期)
// ──────────────────────────────────────────────

export const LOCALES = routing.locales
export type Locale = (typeof LOCALES)[number]

export const isValidLocale = (l: string): l is Locale =>
  (LOCALES as readonly string[]).includes(l)

// ──────────────────────────────────────────────
// 表示名（LocaleSwitcher dropdown / hreflang）
// ──────────────────────────────────────────────

export const LOCALE_DISPLAY_NAME: Record<Locale, string> = {
  ja: "日本語",
  en: "English",
  ko: "한국어",
  zh: "中文",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  pt: "Português",
  ru: "Русский",
  ar: "العربية",
  vi: "Tiếng Việt",
  id: "Bahasa Indonesia",
}

// 国旗絵文字（LocaleSwitcher 視覚識別用）
export const LOCALE_FLAG: Record<Locale, string> = {
  ja: "🇯🇵",
  en: "🇺🇸",
  ko: "🇰🇷",
  zh: "🇨🇳",
  de: "🇩🇪",
  fr: "🇫🇷",
  es: "🇪🇸",
  pt: "🇧🇷",
  ru: "🇷🇺",
  ar: "🇸🇦",
  vi: "🇻🇳",
  id: "🇮🇩",
}

// hreflang attribute 値（ISO 639-1 / BCP 47）
export const LOCALE_HREFLANG: Record<Locale, string> = {
  ja: "ja-JP",
  en: "en-US",
  ko: "ko-KR",
  zh: "zh-Hans",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  pt: "pt-BR",
  ru: "ru-RU",
  ar: "ar-SA",
  vi: "vi-VN",
  id: "id-ID",
}

// ──────────────────────────────────────────────
// RTL（右→左）対応 — Sericia 実装と同パターン
// ──────────────────────────────────────────────

const RTL_LOCALES = new Set<Locale>(["ar"])

export const isRtlLocale = (l: Locale): boolean => RTL_LOCALES.has(l)

export const localeDirection = (l: Locale): "rtl" | "ltr" =>
  isRtlLocale(l) ? "rtl" : "ltr"

// ──────────────────────────────────────────────
// SalesRegion (appexx canonical 12値) → Locale
// ──────────────────────────────────────────────

export type SalesRegion =
  | "ja"
  | "ko"
  | "zh"
  | "en"
  | "europe"
  | "es"
  | "pt"
  | "ru"
  | "ar"
  | "sea"
  | "africa"
  | "others"

export interface SalesRegionLocaleMap {
  primary: Locale
  alts: Locale[]
}

export const SALES_REGION_TO_LOCALE: Record<SalesRegion, SalesRegionLocaleMap> =
  {
    ja: { primary: "ja", alts: [] },
    en: { primary: "en", alts: [] },
    ko: { primary: "ko", alts: [] },
    zh: { primary: "zh", alts: [] },
    europe: { primary: "de", alts: ["fr", "es"] },
    es: { primary: "es", alts: [] },
    pt: { primary: "pt", alts: [] },
    ru: { primary: "ru", alts: [] },
    ar: { primary: "ar", alts: [] },
    sea: { primary: "vi", alts: ["id"] },
    africa: { primary: "fr", alts: ["en", "pt"] },
    others: { primary: "en", alts: [] }, // fallback only
  }

export const salesRegionToLocale = (region: SalesRegion): Locale =>
  SALES_REGION_TO_LOCALE[region].primary

// ──────────────────────────────────────────────
// PPP 係数（Worldbank PPP 2024 保守的目安）
// 価格 = en基準USD価格 × LOCALE_PPP_FACTOR[locale]
// ──────────────────────────────────────────────

export const LOCALE_PPP_FACTOR: Record<Locale, number> = {
  ja: 1.0, // JPY 価格は別途固定（s3-1）
  en: 1.0, // USD 基準 ($3,500/$8,500/$18,000+)
  ko: 0.85,
  zh: 0.55,
  de: 0.95,
  fr: 0.95,
  es: 0.75,
  pt: 0.45,
  ru: 0.4,
  ar: 0.65,
  vi: 0.4,
  id: 0.4,
}

// 表示通貨（PPP 計算後の価格を表示する単位）
export const LOCALE_DISPLAY_CURRENCY: Record<Locale, string> = {
  ja: "JPY",
  en: "USD",
  ko: "USD", // KRW は変動が大きいため USD 表示
  zh: "USD",
  de: "EUR",
  fr: "EUR",
  es: "EUR", // ラテンアメリカ向けは別途 USD 切替検討
  pt: "USD",
  ru: "USD",
  ar: "USD",
  vi: "USD",
  id: "USD",
}

// EN基準価格表（s3-2 確定値）
export const EN_BASE_PRICES = {
  essential: 3500,
  growth: 8500,
  scale: 18000,
} as const

/**
 * PPP 補正後の価格を計算
 * @param locale 対象 locale
 * @param tier "essential" | "growth" | "scale"
 * @returns 補正後の数値（小数点以下切り捨て・100単位丸め）
 */
export function pppPrice(
  locale: Locale,
  tier: keyof typeof EN_BASE_PRICES,
): number {
  const base = EN_BASE_PRICES[tier]
  const factor = LOCALE_PPP_FACTOR[locale]
  // 100 単位で丸め（$3,500 × 0.85 = $2,975 → そのまま）
  return Math.round((base * factor) / 100) * 100
}
