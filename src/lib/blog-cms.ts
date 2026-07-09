/**
 * lib/blog-cms.ts — PayloadCMS-backed blog fetcher (with legacy fallback)
 *
 * 役割: blog/[slug]/page.tsx と sitemap.ts が共有する単一の
 *       「BlogPost を取りたい」入口。先に Payload Posts collection を見て、
 *       0 件 / エラー時のみ legacy BLOG_POSTS にフォールバック。
 *
 * 永久ルール (CLAUDE.md AE-PHP-7): 全 visible content は DB 化 + admin UI 編集可能。
 *   → 新規記事は /admin (PayloadCMS) で作成する。
 *   → BLOG_POSTS の 4 件は seed 用途として残し、admin で同 slug の Post を
 *     作成すれば自動的にそちらが採用される (slug 一致で Payload 優先)。
 *
 * 設計判断:
 *   - Payload `posts.content` は Lexical richText。markdown 文字列が必要な
 *     consumer には plain-text 化して返す (極めて単純化). 詳細フォーマットを
 *     維持したい場合は admin で `contentMarkdown` を別途保存する設計を P19 で。
 *   - locale 判定: Posts.availableLocales (multi-select) で当該 locale が
 *     含まれていれば返す。なければスキップ (= JP-only 記事は EN /blog に出ない)。
 */

import type { BlogPost } from "./blog"
import { BLOG_POSTS } from "./blog"
import { filterByLocale, coerceLocale, localeFindOptions, type AppLocale } from "./cms/filters"
import { withPayloadReadFallback } from "./payload-availability"

type PayloadPost = {
  id: string | number
  slug?: string
  title?: string
  excerpt?: string
  content?: unknown
  category?: string
  /** depth>=1 で populate される Categories relationship (name は locale 解決済) */
  categoryRef?: { name?: string } | string | number | null
  readTime?: string
  publishedAt?: string
  status?: string
  availableLocales?: string[]
  tags?: Array<{ tag?: string }>
}

/** Lexical (Payload v3 richText) tree → plain text (best-effort, depth-first). */
function lexicalToText(node: unknown): string {
  if (!node || typeof node !== "object") return ""
  const n = node as { type?: string; text?: string; children?: unknown[]; root?: unknown }
  if (n.root) return lexicalToText(n.root)
  if (typeof n.text === "string") return n.text
  if (Array.isArray(n.children)) {
    const inner = n.children.map(lexicalToText).join("")
    // crude block-level newline handling
    if (n.type === "paragraph" || n.type === "heading") return inner + "\n\n"
    if (n.type === "listitem") return "- " + inner + "\n"
    return inner
  }
  return ""
}

function mapPayloadToBlogPost(p: PayloadPost, fallbackBySlug?: BlogPost): BlogPost {
  const contentText = lexicalToText(p.content).trim()
  const tags = (p.tags ?? []).map((t) => t.tag).filter((t): t is string => Boolean(t))
  // Categories relationship (categoryRef) を優先・無ければ自由テキスト category
  const refName =
    p.categoryRef && typeof p.categoryRef === "object" ? p.categoryRef.name : undefined
  return {
    slug: p.slug ?? fallbackBySlug?.slug ?? String(p.id),
    title: p.title ?? fallbackBySlug?.title ?? "",
    excerpt: p.excerpt ?? fallbackBySlug?.excerpt ?? "",
    content: contentText || fallbackBySlug?.content || "",
    date: p.publishedAt
      ? new Date(p.publishedAt).toISOString().split("T")[0]
      : fallbackBySlug?.date ?? "",
    category: refName || p.category || fallbackBySlug?.category || "",
    tags: tags.length > 0 ? tags : fallbackBySlug?.tags ?? [],
    readTime: p.readTime ?? fallbackBySlug?.readTime ?? "5分",
  }
}

async function fetchAllPayloadPosts(locale: string): Promise<BlogPost[]> {
  const cl = coerceLocale(locale) as AppLocale
  return withPayloadReadFallback<BlogPost[]>("blog-cms.payload.find", async () => {
    const { getPayload } = await import("payload")
    const config = (await import("@payload-config")).default
    const payload = await getPayload({ config: config as Parameters<typeof getPayload>[0]["config"] })

    const res = await payload.find({
      collection: "posts",
      where: {
        and: [
          { status: { equals: "published" } },
          { availableLocales: { contains: cl } },
        ],
      },
      limit: 200,
      depth: 1,
      ...localeFindOptions(cl),
    } as Parameters<typeof payload.find>[0])

    const docs = (res?.docs ?? []) as unknown as PayloadPost[]
    const useFallback = cl === "ja"
    return docs
      .filter((p) => !!p.title)
      .map((p) => mapPayloadToBlogPost(p, useFallback ? BLOG_POSTS.find((b) => b.slug === p.slug) : undefined))
  }, [])
}

/**
 * Public API: get all blog posts for a given locale.
 * Order of precedence:
 *   1. Payload posts (status=published, availableLocales contains locale)
 *   2. Legacy BLOG_POSTS (only when locale === "ja", since seed is JP-only)
 *
 * Slug is the merge key — if a Payload post and a BLOG_POSTS seed share a slug,
 * the Payload version wins (admin overrides seed).
 */
export async function getAllBlogPosts(locale: string = "ja"): Promise<BlogPost[]> {
  const cmsPosts = await fetchAllPayloadPosts(locale)
  const cmsSlugs = new Set(cmsPosts.map((p) => p.slug))
  const legacyPosts = locale === "ja" ? BLOG_POSTS.filter((p) => !cmsSlugs.has(p.slug)) : []
  return [...cmsPosts, ...legacyPosts].sort((a, b) => (a.date < b.date ? 1 : -1))
}

/** Public API: get a single blog post by slug for a given locale. */
export async function getBlogPostBySlug(
  slug: string,
  locale: string = "ja"
): Promise<BlogPost | null> {
  const all = await getAllBlogPosts(locale)
  return all.find((p) => p.slug === slug) ?? null
}

/** Public API: get all slugs (for generateStaticParams). Includes both CMS and legacy. */
export async function getAllBlogSlugs(): Promise<Array<{ slug: string }>> {
  // Static params runs at build time; pull seed + CMS together for full coverage.
  const slugSet = new Set<string>()
  for (const locale of ["ja", "en"]) {
    const posts = await fetchAllPayloadPosts(locale)
    for (const p of posts) slugSet.add(p.slug)
  }
  for (const p of BLOG_POSTS) slugSet.add(p.slug)
  return Array.from(slugSet).map((slug) => ({ slug }))
}
