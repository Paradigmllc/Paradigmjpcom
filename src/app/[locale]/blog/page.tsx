import type { Metadata } from "next"
import { getPayload } from "payload"
import config from "@payload-config"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import { filterByLocale, coerceLocale, localeFindOptions } from "@/lib/cms/filters"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isJa = locale === "ja"
  return {
    title: isJa ? "ブログ" : "Blog",
    description: isJa
      ? "Web制作・MEO対策・SEO/GEO対策・AI導入に関する最新情報やノウハウをお届けします。"
      : "Insights from Paradigm LLC on Japan market entry, SEO/GEO, productized services, and AI integration.",
  }
}

type PostDoc = {
  id: string | number
  title?: string
  slug?: string
  excerpt?: string
  category?: string
  readTime?: string
  tags?: Array<{ tag?: string }>
  publishedAt?: string
}

const CAT_COLORS: Record<string, string> = {
  "SEO/GEO": "bg-amber-100 text-amber-700",
  MEO: "bg-emerald-100 text-emerald-700",
  AI: "bg-purple-100 text-purple-700",
  "Web制作": "bg-indigo-100 text-indigo-700",
  "Web Development": "bg-indigo-100 text-indigo-700",
  Strategy: "bg-rose-100 text-rose-700",
}

function formatDate(iso: string | undefined, locale: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default async function BlogPage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = coerceLocale(rawLocale)
  const isJa = locale === "ja"

  let posts: PostDoc[] = []
  try {
    const payload = await getPayload({ config })
    const res = await payload.find({
      collection: "posts",
      where: filterByLocale(locale, { status: { equals: "published" } }),
      sort: "-publishedAt",
      limit: 100,
      depth: 0,
      ...localeFindOptions(locale),
    })
    posts = (res.docs as unknown as PostDoc[]) ?? []
  } catch (e) {
    console.error("[blog] payload.find failed:", e)
  }

  return (
    <>
      <PageHero
        badge="Blog"
        title={isJa ? "ブログ" : "Blog"}
        desc={
          isJa
            ? "デジタルマーケティングの最新情報とノウハウ"
            : "Insights on Japan market entry, productized services, and AI-native operations."
        }
        accent="rose"
      />

      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          {posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg text-text-muted mb-6">
                {isJa
                  ? "現在、公開中の記事はありません。新しい記事をお待ちください。"
                  : "No posts are published yet. Check back soon."}
              </p>
              <Link
                href="/contact"
                className="inline-flex bg-accent text-white px-8 py-3 rounded-xl font-semibold hover:bg-accent/90 transition-colors"
              >
                {isJa ? "お問い合わせ" : "Contact Us"}
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {posts.map((post) => {
                const catClass = post.category ? CAT_COLORS[post.category] : undefined
                const tags = (post.tags ?? []).map((t) => t.tag).filter(Boolean) as string[]
                return (
                  <Link
                    key={String(post.id)}
                    href={post.slug ? `/blog/${post.slug}` : "#"}
                    className="group block rounded-2xl border border-gray-100 p-8 hover:border-accent/20 hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      {post.category && (
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            catClass ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {post.category}
                        </span>
                      )}
                      <span className="text-xs text-text-muted">{formatDate(post.publishedAt, locale)}</span>
                      {post.readTime && (
                        <span className="text-xs text-text-muted">
                          ・{isJa ? `${post.readTime}で読める` : `${post.readTime} read`}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-primary group-hover:text-accent transition-colors mb-3">
                      {post.title ?? "—"}
                    </h2>
                    {post.excerpt && (
                      <p className="text-sm text-text-muted leading-relaxed">{post.excerpt}</p>
                    )}
                    {tags.length > 0 && (
                      <div className="flex gap-2 mt-4 flex-wrap">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-text-muted"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
