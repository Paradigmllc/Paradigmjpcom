import type { MetadataRoute } from "next"
import { getAllBlogPosts } from "@/lib/blog-cms"
import { routing } from "@/i18n/routing"

const BASE = "https://paradigmjp.com"

/**
 * Google hreflang 仕様:
 *   - sitemap.xml の各 <url> に <xhtml:link rel="alternate" hreflang="ja" href=".../ja/..." /> を
 *     同じロケールグループの全URL分だけ並べる
 *   - x-default は defaultLocale（= "ja"）に揃える
 *   - Next.js の MetadataRoute.Sitemap は `alternates.languages` オブジェクトを受け付け、
 *     XML 出力時に自動で <xhtml:link> として emit してくれる
 *
 * なぜ静的配列を先に作るのか:
 *   ロケール分岐の分岐回数を減らし、将来 ko/zh を追加するときに
 *   routing.locales の配列 1 箇所を触るだけで済むようにする（AE-10 URL-state supremacy 準拠）
 */

type StaticRoute = {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
  priority: number
}

const STATIC_ROUTES: StaticRoute[] = [
  { path: "", changeFrequency: "weekly", priority: 1.0 },
  { path: "/about", changeFrequency: "monthly", priority: 0.8 },
  { path: "/services", changeFrequency: "monthly", priority: 0.9 },
  { path: "/services/web", changeFrequency: "monthly", priority: 0.8 },
  { path: "/services/meo", changeFrequency: "monthly", priority: 0.8 },
  { path: "/services/seo", changeFrequency: "monthly", priority: 0.8 },
  { path: "/services/ai", changeFrequency: "monthly", priority: 0.8 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.9 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal", changeFrequency: "yearly", priority: 0.3 },
  { path: "/lp/web", changeFrequency: "monthly", priority: 0.7 },
  { path: "/lp/meo", changeFrequency: "monthly", priority: 0.7 },
  { path: "/lp/seo", changeFrequency: "monthly", priority: 0.7 },
  { path: "/lp/ai", changeFrequency: "monthly", priority: 0.7 },
]

/**
 * 同一コンテンツの全ロケール分のURLをペアにして alternates.languages に詰めたオブジェクトを作る。
 */
function languageAlternates(path: string) {
  const languages: Record<string, string> = {
    "x-default": `${BASE}/${routing.defaultLocale}${path}`,
  }
  for (const locale of routing.locales) {
    languages[locale] = `${BASE}/${locale}${path}`
  }
  return languages
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = STATIC_ROUTES.flatMap((route) =>
    routing.locales.map((locale) => ({
      url: `${BASE}/${locale}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: languageAlternates(route.path),
      },
    })),
  )

  /**
   * ブログ記事は PayloadCMS Posts collection から取得し、availableLocales で
   * 各 locale ごとに表示可否を判定する。Payload が空の場合は legacy BLOG_POSTS
   * (JP-only 4 件 seed) にフォールバックされる (lib/blog-cms.ts で吸収)。
   */
  const blogPagesPerLocale = await Promise.all(
    routing.locales.map(async (locale) => {
      const posts = await getAllBlogPosts(locale)
      return posts.map((post) => ({
        url: `${BASE}/${locale}/blog/${post.slug}`,
        lastModified: post.date ? new Date(post.date) : now,
        changeFrequency: "monthly" as const,
        priority: 0.6,
        alternates: {
          languages: {
            [locale]: `${BASE}/${locale}/blog/${post.slug}`,
            "x-default": `${BASE}/${routing.defaultLocale}/blog/${post.slug}`,
          },
        },
      }))
    }),
  )
  const blogPages: MetadataRoute.Sitemap = blogPagesPerLocale.flat()

  return [...staticPages, ...blogPages]
}
