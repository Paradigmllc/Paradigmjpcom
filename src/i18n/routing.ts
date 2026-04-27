import { defineRouting } from "next-intl/routing"
import { createNavigation } from "next-intl/navigation"

/**
 * i18n routing — 12-locale 対応（P17 2026-04-27 拡張）
 *
 * Plan B: ja/en は独自設計維持・残10ロケールは Japan Entry Package + nav/cta/footer 翻訳のみ
 * - SalesRegion (appexx canonical 12値) との対応は src/lib/locale-map.ts を参照
 * - RTL は ar のみ・layout.tsx で `dir="rtl"` を出し分ける
 * - AE-10 URL-state supremacy: locale 切替 UI は LocaleSwitcher.tsx のみが所有
 */
export const routing = defineRouting({
  locales: [
    "ja", // 日本（独自設計）
    "en", // 英語汎用（Japan Entry Package 母版）
    "ko", // 韓国
    "zh", // 中国（簡体字）
    "de", // ドイツ・DACH
    "fr", // フランス・欧州+西アフリカ仏語圏
    "es", // スペイン語（欧州+ラテンアメリカ）
    "pt", // ポルトガル語（ブラジル基準）
    "ru", // ロシア・CIS
    "ar", // アラビア（MENA・RTL）
    "vi", // ベトナム（SEA 主言語）
    "id", // インドネシア（SEA 副言語）
  ],
  defaultLocale: "ja",
  localePrefix: "always",
  localeDetection: true,
})

export type Locale = (typeof routing.locales)[number]

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
