import type { Metadata } from "next"
import { getPayload } from "payload"
import config from "@payload-config"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import { filterByLocale, coerceLocale, localeFindOptions } from "@/lib/cms/filters"

/**
 * /[locale]/blog — index of published posts (Aesop voice).
 *
 * P18-D-3 rewrite. Posts render as horizontal-rule separated rows
 * rather than card chrome. Category becomes a paradigm-eyebrow caps
 * tag. Tags become subtle inline links.
 *
 * AE-PHP-1: 145 lines.
 */

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
        badge="Journal"
        title={isJa ? "ブログ" : "Journal"}
        desc={
          isJa
            ? "デジタルマーケティングの最新情報とノウハウ。"
            : "Insights on Japan market entry, productized services, and AI-native operations."
        }
      />

      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[15px] text-paradigm-ink-soft leading-[1.85] mb-10 max-w-md mx-auto">
                {isJa
                  ? "現在、公開中の記事はありません。新しい記事をお待ちください。"
                  : "No posts are published yet. Check back soon."}
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 border border-paradigm-ink text-paradigm-ink px-8 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-ink hover:text-paradigm-paper transition-colors"
              >
                {isJa ? "お問い合わせ" : "Contact us"}
              </Link>
            </div>
          ) : (
            <ul className="border-t border-paradigm-line">
              {posts.map((post) => {
                const tags = (post.tags ?? [])
                  .map((t) => t.tag)
                  .filter(Boolean) as string[]
                return (
                  <li key={String(post.id)} className="border-b border-paradigm-line">
                    <Link
                      href={post.slug ? `/blog/${post.slug}` : "#"}
                      className="group block py-10 md:py-12"
                    >
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5">
                        {post.category && (
                          <span className="paradigm-eyebrow text-paradigm-accent">
                            {post.category}
                          </span>
                        )}
                        <span className="paradigm-eyebrow text-paradigm-ink-mute">
                          {formatDate(post.publishedAt, locale)}
                        </span>
                        {post.readTime && (
                          <span className="paradigm-eyebrow text-paradigm-ink-mute">
                            {isJa ? `${post.readTime}で読める` : `${post.readTime} read`}
                          </span>
                        )}
                      </div>
                      <h2 className="font-display text-[26px] md:text-[34px] leading-[1.2] tracking-[-0.005em] text-paradigm-ink group-hover:text-paradigm-accent transition-colors mb-4">
                        {post.title ?? "—"}
                      </h2>
                      {post.excerpt && (
                        <p className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.85] max-w-2xl">
                          {post.excerpt}
                        </p>
                      )}
                      {tags.length > 0 && (
                        <div className="flex gap-x-4 gap-y-2 mt-5 flex-wrap">
                          {tags.map((t) => (
                            <span
                              key={t}
                              className="paradigm-eyebrow text-paradigm-ink-mute"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}
