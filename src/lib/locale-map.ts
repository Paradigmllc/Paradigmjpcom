/**
 * locale-map.ts — Locale × SalesRegion × PPP 係数 × RTL の単一の真実の源
 *
 * P17 2026-04-27 新規実装（12-locale 拡張）
 * 2026-05-12: routing.ts (next-intl) からの import を削除し、データ層を独立化
 *             (Vitest 環境で next-intl/navigation が解決できない問題を回避・
 *              chrome data 層と routing 層の責務分離も同時に達成).
 *
 * 設計原則:
 * - SalesRegion (appexx canonical 12値) と Locale (paradigmjp 12 言語コード) は別概念
 *   → SALES_REGION_TO_LOCALE マッピングで吸収
 * - PPP 係数は en (USD $1.0) 基準で乗算 — Worldbank PPP 2024 保守的目安
 * - RTL は ar のみ — `isRtlLocale()` で判定
 * - AE-10 URL-state supremacy: locale は URL の `[locale]` segment が唯一の正
 *
 * 同期責任:
 *   この LOCALES tuple と src/i18n/routing.ts の routing.locales は 12 個の同じ値を
 *   持つ必要がある。片方を変えたら必ずもう一方も同期する (12 → 13 locale 拡張時等)。
 *
 * 参考: グローバル CLAUDE.md s10-5 (Sericia ar RTL 実装パターン)
 */

// ──────────────────────────────────────────────
// Locale (12 個・i18n/routing.ts と同期維持)
// ──────────────────────────────────────────────

export const LOCALES = [
  "ja",
  "en",
  "ko",
  "zh",
  "de",
  "fr",
  "es",
  "pt",
  "ru",
  "ar",
  "vi",
  "id",
] as const

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
// 同じ値が Intl.NumberFormat / Intl.DateTimeFormat / toLocaleString の locale 引数にも使える
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

// Open Graph locale (BCP 47 underscore 形式)
// hreflang と用途が違う (og:locale は underscore・hreflang は hyphen) ので別マップで持つ
export const LOCALE_OG_LOCALE: Record<Locale, string> = {
  ja: "ja_JP",
  en: "en_US",
  ko: "ko_KR",
  zh: "zh_CN",
  de: "de_DE",
  fr: "fr_FR",
  es: "es_ES",
  pt: "pt_BR",
  ru: "ru_RU",
  ar: "ar_SA",
  vi: "vi_VN",
  id: "id_ID",
}

// 組織表記 — locale ごとに最も自然な表記を選択
// ja は法人格表示が必須・他は LLC 表記または brand-only。JSON-LD の name に使用。
export const LOCALE_ORG_NAME: Record<Locale, string> = {
  ja: "Paradigm合同会社",
  en: "Paradigm LLC",
  ko: "Paradigm LLC",
  zh: "Paradigm LLC",
  de: "Paradigm LLC",
  fr: "Paradigm LLC",
  es: "Paradigm LLC",
  pt: "Paradigm LLC",
  ru: "Paradigm LLC",
  ar: "Paradigm LLC",
  vi: "Paradigm LLC",
  id: "Paradigm LLC",
}

// JSON-LD `alternateName` — 検索で hit するための別表記
export const LOCALE_ORG_ALTERNATE_NAMES: Record<Locale, string[]> = {
  ja: ["Paradigm LLC", "パラダイム"],
  en: ["Paradigm合同会社", "パラダイム"],
  ko: ["Paradigm合同会社", "パラダイム"],
  zh: ["Paradigm合同会社", "パラダイム"],
  de: ["Paradigm合同会社", "パラダイム"],
  fr: ["Paradigm合同会社", "パラダイム"],
  es: ["Paradigm合同会社", "パラダイム"],
  pt: ["Paradigm合同会社", "パラダイム"],
  ru: ["Paradigm合同会社", "パラダイム"],
  ar: ["Paradigm合同会社", "パラダイム"],
  vi: ["Paradigm合同会社", "パラダイム"],
  id: ["Paradigm合同会社", "パラダイム"],
}

/**
 * Plan B 12-locale → seed content 2 variant collapse helper.
 *
 * 背景: ja は独自設計母版・他 11 ロケールは Japan Entry Package en の翻訳 (CLAUDE.md s1).
 * JSON-LD description / knowsAbout 等の seed text は ja と en の 2 variant しか持たない。
 * Visible UI text は messages/{locale}.json で 12-locale 完全対応 (P17 完遂)。
 *
 * 使用箇所: jsonld.ts / seo/schemas.ts / api/contact 等の「seed text を出し分ける」場面
 */
export const localeContentVariant = (l: string): "ja" | "en" =>
  l === "ja" ? "ja" : "en"

// Breadcrumb 「ホーム」chrome string — 12 locale native 表記
// 設計判断: 「ホーム」は messages ではなく chrome data (LOCALE_DISPLAY_NAME 等と同じ層) として扱う。
// 理由: site chrome の short string (1 word) は admin 編集対象ではなく、ブランド統一の navigation primitive。
export const LOCALE_BREADCRUMB_HOME: Record<Locale, string> = {
  ja: "ホーム",
  en: "Home",
  ko: "홈",
  zh: "首页",
  de: "Startseite",
  fr: "Accueil",
  es: "Inicio",
  pt: "Início",
  ru: "Главная",
  ar: "الرئيسية",
  vi: "Trang chủ",
  id: "Beranda",
}

// 国コード (ISO 3166-1 alpha-2) — Slack notify / Twenty CRM enrich / OG metadata 等で使用
export const LOCALE_COUNTRY: Record<Locale, string> = {
  ja: "JP",
  en: "US",
  ko: "KR",
  zh: "CN",
  de: "DE",
  fr: "FR",
  es: "ES",
  pt: "BR",
  ru: "RU",
  ar: "SA",
  vi: "VN",
  id: "ID",
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
  en: 1.0, // USD base ($3,000/$5,000/$8,000)
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
  essential: 3000,
  growth: 5000,
  scale: 8000,
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
