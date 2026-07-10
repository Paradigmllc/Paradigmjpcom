import { defineRouting } from "next-intl/routing"
import { createNavigation } from "next-intl/navigation"
import { ROUTING_LOCALES } from "./locales"

export {
  INTERNATIONAL_REPORT_LOCALES,
  MARKETING_DEFAULT_LOCALE,
  MARKETING_LOCALES,
  ROUTING_LOCALES,
} from "./locales"
export type { Locale } from "./locales"

/**
 * i18n routing — 12-locale 対応（P17 2026-04-27 拡張）
 *
 * ja/en は公開サイトとして維持し、残10ロケールは report/demo の言語スコープとして維持する。
 * - SalesRegion (appexx canonical 12値) との対応は src/lib/locale-map.ts を参照
 * - RTL は ar のみ・layout.tsx で `dir="rtl"` を出し分ける
 * - AE-10 URL-state supremacy: locale 切替 UI は LocaleSwitcher.tsx のみが所有
 */
export const routing = defineRouting({
  locales: ROUTING_LOCALES,
  defaultLocale: "ja",
  localePrefix: "always",
  localeDetection: true,
})

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
