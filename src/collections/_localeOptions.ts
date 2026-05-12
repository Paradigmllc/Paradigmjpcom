/**
 * _localeOptions.ts — 全 collection の availableLocales select options 共有 const.
 *
 * 役割:
 *   PayloadCMS collection の `availableLocales` field が「コンテンツ配信ロケール」を
 *   12 locale から多選択するための options 配列を一元定義。
 *
 * Why centralized:
 *   AE-2 (single-route-owner): 「12 locale」という事実は 1 箇所に住む。
 *   Pages/Services/Posts/Works/Pricing/FAQs の 6 collection で重複定義していた
 *   旧パターン (2026-05-12 以前は 2-4 locale のみ) を統合。
 *   将来 13 locale 化する際もこのファイル 1 行追加で 6 collection に伝播する。
 *
 * Note:
 *   - routing.locales (i18n/routing.ts) と「同じ 12 locale」を維持する責務がある。
 *   - 順序はユーザ体感優先 (ja/en/ko/zh = アジア → de/fr/es/pt = 欧州 → ru/ar/vi/id = その他)。
 *   - label は native script を採用 (admin がどの言語かを native 表示で即視認できる)。
 */

// 型推論用の literal tuple (`as const` で値リテラル型を保持)
const LOCALE_VALUES = [
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

export type AvailableLocale = (typeof LOCALE_VALUES)[number]

// PayloadCMS の Option[] 型は mutable を要求するため、`as const` ではなく
// 明示的な mutable array 型で export (TS4104 回避).
export const AVAILABLE_LOCALE_OPTIONS: { label: string; value: AvailableLocale }[] = [
  { label: "日本語 (/ja)", value: "ja" },
  { label: "English (/en)", value: "en" },
  { label: "한국어 (/ko)", value: "ko" },
  { label: "中文 (/zh)", value: "zh" },
  { label: "Deutsch (/de)", value: "de" },
  { label: "Français (/fr)", value: "fr" },
  { label: "Español (/es)", value: "es" },
  { label: "Português (/pt)", value: "pt" },
  { label: "Русский (/ru)", value: "ru" },
  { label: "العربية (/ar)", value: "ar" },
  { label: "Tiếng Việt (/vi)", value: "vi" },
  { label: "Bahasa Indonesia (/id)", value: "id" },
]
