/**
 * lib/page-metadata.ts — Page-level `alternates` (canonical + hreflang) ヘルパー
 *
 * 背景 (2026-05-13 i18n audit):
 *   [locale]/layout.tsx の generateMetadata が canonical を `${BASE}/${locale}`
 *   (home URL) でセットしており、子 page が override しないため、Next.js metadata
 *   inheritance で**全ページが home の canonical を継承** = SEO 致命的バグだった。
 *
 *   このヘルパーを使えば、各 page の generateMetadata で
 *   `alternates: pageAlternates(locale, "/about")` 1 行だけで:
 *     - canonical = paradigmjp.com/{locale}/about
 *     - languages = 全 12 locale の同じ path への hreflang
 *     - x-default = defaultLocale (ja) の同じ path
 *   が正しく出力される。
 *
 * Why centralized helper:
 *   AE-2 (single-route-owner): 12-locale URL 構築ロジックは 1 箇所に住む。
 *   将来 13 locale 化や URL 構造変更 (例: subdomain → path) もこのファイル 1 箇所で対応。
 *
 * 使用例:
 *   ```ts
 *   export async function generateMetadata({ params }): Promise<Metadata> {
 *     const { locale } = await params
 *     return {
 *       title: ...,
 *       alternates: pageAlternates(locale, "/about"),
 *     }
 *   }
 *   ```
 */

import { routing } from "@/i18n/routing"
import { LOCALE_HREFLANG } from "@/lib/locale-map"

const BASE = "https://paradigmjp.com"

/**
 * Build `alternates` object for a page.
 *
 * @param locale  Current locale (URL の `[locale]` segment)
 * @param path    Locale 後のパス (例: "/about" "/services/web" ""=home)
 * @returns       { canonical, languages } shape for Next.js Metadata.alternates
 */
export function pageAlternates(locale: string, path: string = "") {
  const languages: Record<string, string> = {
    "x-default": `${BASE}/${routing.defaultLocale}${path}`,
  }
  for (const l of routing.locales) {
    languages[LOCALE_HREFLANG[l]] = `${BASE}/${l}${path}`
  }
  return {
    canonical: `${BASE}/${locale}${path}`,
    languages,
  }
}
