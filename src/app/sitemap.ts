import type { MetadataRoute } from "next"
import { getAllBlogPosts } from "@/lib/blog-cms"
import {
  MARKETING_DEFAULT_LOCALE,
  MARKETING_LOCALES,
} from "@/i18n/locales"
import type { MarketingLocale } from "@/lib/marketing-routing"

const BASE = "https://paradigmjp.com"

/**
 * Google hreflang 仕様:
 *   - sitemap.xml の各 <url> に <xhtml:link rel="alternate" hreflang="ja" href=".../ja/..." /> を
 *     同じロケールグループの全URL分だけ並べる
 *   - x-default は国際向けの英語ファネルに揃える
 *   - Next.js の MetadataRoute.Sitemap は `alternates.languages` オブジェクトを受け付け、
 *     XML 出力時に自動で <xhtml:link> として emit してくれる
 *
 * なぜ静的配列を先に作るのか:
 *   ロケール分岐の分岐回数を減らし、将来 ko/zh を追加するときに
 *   公開維持対象の ja/en と日本語限定の国内サービスを明示的に分ける。
 */

type StaticRoute = {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
  priority: number
  locales?: readonly MarketingLocale[]
}

const JAPANESE_ONLY = ["ja"] as const
const INTERNATIONAL_ONLY = ["en", "ko", "zh", "de", "fr", "es", "pt", "ru", "ar", "vi", "id"] as const

const STATIC_ROUTES: StaticRoute[] = [
  { path: "", changeFrequency: "weekly", priority: 1.0 },
  { path: "/about", changeFrequency: "monthly", priority: 0.8 },
  { path: "/services", changeFrequency: "monthly", priority: 0.9 },
  { path: "/services/web", changeFrequency: "monthly", priority: 0.8, locales: JAPANESE_ONLY },
  { path: "/services/meo", changeFrequency: "monthly", priority: 0.8, locales: JAPANESE_ONLY },
  { path: "/services/seo", changeFrequency: "monthly", priority: 0.8, locales: JAPANESE_ONLY },
  { path: "/services/ai", changeFrequency: "monthly", priority: 0.8, locales: JAPANESE_ONLY },
  { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.8 },
  { path: "/works", changeFrequency: "monthly", priority: 0.7 },
  { path: "/video", changeFrequency: "monthly", priority: 0.8, locales: JAPANESE_ONLY },
  { path: "/agency", changeFrequency: "monthly", priority: 0.7, locales: JAPANESE_ONLY },
  { path: "/contact", changeFrequency: "yearly", priority: 0.9 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal", changeFrequency: "yearly", priority: 0.3 },
  { path: "/tools/japan-entry-score", changeFrequency: "weekly", priority: 0.95, locales: INTERNATIONAL_ONLY },
  { path: "/lp/web", changeFrequency: "monthly", priority: 0.7, locales: JAPANESE_ONLY },
  { path: "/lp/meo", changeFrequency: "monthly", priority: 0.7, locales: JAPANESE_ONLY },
  { path: "/lp/seo", changeFrequency: "monthly", priority: 0.7, locales: JAPANESE_ONLY },
  { path: "/lp/ai", changeFrequency: "monthly", priority: 0.7, locales: JAPANESE_ONLY },
]

/**
 * 同一コンテンツの全ロケール分のURLをペアにして alternates.languages に詰めたオブジェクトを作る。
 */
function languageAlternates(
  path: string,
  locales: readonly MarketingLocale[] = MARKETING_LOCALES,
) {
  const defaultLocale = locales.includes(MARKETING_DEFAULT_LOCALE)
    ? MARKETING_DEFAULT_LOCALE
    : locales[0]
  const languages: Record<string, string> = {
    "x-default": `${BASE}/${defaultLocale}${path}`,
  }
  for (const locale of locales) {
    languages[locale] = `${BASE}/${locale}${path}`
  }
  return languages
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = STATIC_ROUTES.flatMap((route) =>
    (route.locales ?? MARKETING_LOCALES).map((locale) => ({
      url: `${BASE}/${locale}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: languageAlternates(
          route.path,
          route.locales ?? MARKETING_LOCALES,
        ),
      },
    })),
  )

  /**
   * ブログ記事は PayloadCMS Posts collection から取得し、availableLocales で
   * 各 locale ごとに表示可否を判定する。Payload が空の場合は legacy BLOG_POSTS
   * (JP-only 4 件 seed) にフォールバックされる。EN は明示的な公開承認 tag と
   * 販売コピー安全検査を通った記事だけを返す (lib/blog-cms.ts で吸収)。
   */
  const blogPostsPerLocale = await Promise.all(
    MARKETING_LOCALES.map(async (locale) => {
      const posts = await getAllBlogPosts(locale)
      return { locale, posts }
    }),
  )
  const localesByBlogSlug = new Map<string, MarketingLocale[]>()
  for (const { locale, posts } of blogPostsPerLocale) {
    for (const post of posts) {
      const locales = localesByBlogSlug.get(post.slug) ?? []
      locales.push(locale)
      localesByBlogSlug.set(post.slug, locales)
    }
  }
  const blogPagesPerLocale = blogPostsPerLocale.map(({ locale, posts }) =>
    posts.map((post) => ({
      url: `${BASE}/${locale}/blog/${post.slug}`,
      lastModified: post.date ? new Date(post.date) : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: {
        languages: languageAlternates(
          `/blog/${post.slug}`,
          localesByBlogSlug.get(post.slug) ?? [locale],
        ),
      },
    })),
  )
  const blogPages: MetadataRoute.Sitemap = blogPagesPerLocale.flat()

  return [...staticPages, ...blogPages]
}
