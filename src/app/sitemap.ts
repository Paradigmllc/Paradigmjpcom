import type { MetadataRoute } from "next"
import { getAllBlogPosts } from "@/lib/blog-cms"
import {
  MARKETING_DEFAULT_LOCALE,
  MARKETING_LOCALES,
} from "@/i18n/locales"
import type { MarketingLocale } from "@/lib/marketing-routing"

const BASE = "https://paradigmjp.com"

type StaticRoute = {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
  priority: number
  locales?: readonly MarketingLocale[]
}

const JAPANESE_ONLY = ["ja"] as const
const DUAL_SERVICE = ["ja", "en"] as const
const INTERNATIONAL_ONLY = [
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

const STATIC_ROUTES: StaticRoute[] = [
  { path: "", changeFrequency: "weekly", priority: 1.0 },
  { path: "/about", changeFrequency: "monthly", priority: 0.8 },
  { path: "/services", changeFrequency: "monthly", priority: 0.9 },
  {
    path: "/japan-market-partner",
    changeFrequency: "weekly",
    priority: 0.95,
    locales: DUAL_SERVICE,
  },
  {
    path: "/video-as-a-service",
    changeFrequency: "weekly",
    priority: 0.95,
    locales: DUAL_SERVICE,
  },
  {
    path: "/video-as-a-service/terms",
    changeFrequency: "yearly",
    priority: 0.4,
    locales: DUAL_SERVICE,
  },
  {
    path: "/services/web",
    changeFrequency: "monthly",
    priority: 0.8,
    locales: JAPANESE_ONLY,
  },
  {
    path: "/services/meo",
    changeFrequency: "monthly",
    priority: 0.8,
    locales: JAPANESE_ONLY,
  },
  {
    path: "/services/seo",
    changeFrequency: "monthly",
    priority: 0.8,
    locales: JAPANESE_ONLY,
  },
  {
    path: "/services/ai",
    changeFrequency: "monthly",
    priority: 0.8,
    locales: JAPANESE_ONLY,
  },
  { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.8 },
  {
    path: "/package",
    changeFrequency: "weekly",
    priority: 0.9,
    locales: INTERNATIONAL_ONLY,
  },
  { path: "/works", changeFrequency: "monthly", priority: 0.7 },
  {
    path: "/video",
    changeFrequency: "monthly",
    priority: 0.8,
    locales: JAPANESE_ONLY,
  },
  {
    path: "/agency",
    changeFrequency: "monthly",
    priority: 0.7,
    locales: JAPANESE_ONLY,
  },
  { path: "/japan-opportunities", changeFrequency: "weekly", priority: 0.9 },
  { path: "/japan-opportunities/capital-in-japan", changeFrequency: "weekly", priority: 0.8 },
  { path: "/japan-opportunities/enter-and-operate-japan", changeFrequency: "weekly", priority: 0.9 },
  { path: "/japan-opportunities/source-from-japan", changeFrequency: "weekly", priority: 0.9 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.9 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/refund", changeFrequency: "yearly", priority: 0.3 },
  {
    path: "/tools/japan-entry-score",
    changeFrequency: "weekly",
    priority: 0.95,
    locales: INTERNATIONAL_ONLY,
  },
  {
    path: "/lp/web",
    changeFrequency: "monthly",
    priority: 0.7,
    locales: JAPANESE_ONLY,
  },
  {
    path: "/lp/meo",
    changeFrequency: "monthly",
    priority: 0.7,
    locales: JAPANESE_ONLY,
  },
  {
    path: "/lp/seo",
    changeFrequency: "monthly",
    priority: 0.7,
    locales: JAPANESE_ONLY,
  },
  {
    path: "/lp/ai",
    changeFrequency: "monthly",
    priority: 0.7,
    locales: JAPANESE_ONLY,
  },
]

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
