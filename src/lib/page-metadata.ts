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
 *     - languages = actively maintained ja/en URLs only
 *     - x-default = international English funnel
 *   が正しく出力される。
 *
 * Personalised report/demo locales stay routable but are deliberately omitted
 * from public marketing hreflang until their public translations are maintained.
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

import {
  MARKETING_DEFAULT_LOCALE,
  MARKETING_LOCALES,
} from "@/i18n/locales"
import { LOCALE_HREFLANG } from "@/lib/locale-map"
import {
  isJapaneseOnlyLegacyOfferPath,
  isMarketingLocale,
  type MarketingLocale,
} from "@/lib/marketing-routing"

const BASE = "https://paradigmjp.com"

/**
 * Build `alternates` object for a page.
 *
 * @param locale  Current locale (URL の `[locale]` segment)
 * @param path    Locale 後のパス (例: "/about" "/services/web" ""=home)
 * @param availableLocales Optional per-resource locale set (for example a blog post)
 * @returns       { canonical, languages } shape for Next.js Metadata.alternates
 */
export function pageAlternates(
  locale: string,
  path: string = "",
  availableLocales?: readonly MarketingLocale[],
) {
  const japaneseOnly = isJapaneseOnlyLegacyOfferPath(path)
  const locales = availableLocales?.length
    ? availableLocales
    : japaneseOnly
      ? (["ja"] as const)
      : MARKETING_LOCALES
  const defaultLocale = locales.includes(MARKETING_DEFAULT_LOCALE)
    ? MARKETING_DEFAULT_LOCALE
    : locales[0]
  const languages: Record<string, string> = {
    "x-default": `${BASE}/${defaultLocale}${path}`,
  }
  for (const l of locales) {
    languages[LOCALE_HREFLANG[l]] = `${BASE}/${l}${path}`
  }
  const canonicalLocale = isMarketingLocale(locale) && locales.includes(locale)
    ? locale
    : defaultLocale
  return {
    canonical: `${BASE}/${canonicalLocale}${path}`,
    languages,
  }
}
