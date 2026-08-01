/**
 * /[locale]/blog — ブログ一覧 (lib/blog-cms.ts 経由 PayloadCMS posts collection から取得)
 *
 * 役割:   ブログ一覧 (lib/blog-cms.ts 経由 PayloadCMS posts collection から取得)
 * 入力:   params.locale
 * 出力:   ブログ記事一覧グリッド
 *
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import { buildPageSchema } from "@/lib/seo/schemas"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import FadeIn from "@/components/aesop/FadeIn"
import { assertLocale } from "@/lib/cms/filters"
import { LOCALE_HREFLANG } from "@/lib/locale-map"
import { getAllBlogPosts } from "@/lib/blog-cms"
import type { BlogPost } from "@/lib/blog"
import Image from "next/image"
import BlogCoverFallback from "@/components/BlogCoverFallback"

export const dynamic = "force-dynamic"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "blogPage" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: pageAlternates(locale, "/blog"),
  }
}

const CATEGORY_GRADIENTS = [
  "from-zinc-950 via-zinc-800 to-blue-700",
  "from-zinc-900 via-blue-800 to-emerald-700",
  "from-zinc-900 via-emerald-800 to-blue-700",
  "from-zinc-950 via-blue-800 to-amber-600",
]

function formatDate(iso: string | undefined, locale: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const fmtLocale = (LOCALE_HREFLANG as Record<string, string>)[locale] ?? "en-US"
  return d.toLocaleDateString(fmtLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default async function BlogPage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = assertLocale(rawLocale)            // 実 locale（UI + CMS 12-locale 配信）
  const t = await getTranslations({ locale, namespace: "blogPage" })

  const posts: BlogPost[] = await getAllBlogPosts(locale === "ja" ? "ja" : "en")

  return (
    <>
      <PageHero
        badge={t("heroBadge")}
        title={t("heroTitle")}
        highlight={t("heroHighlight")}
        desc={t("heroDesc")}
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          {posts.length === 0 ? (
            <FadeIn className="text-center max-w-xl mx-auto paradigm-glass rounded-lg p-8 paradigm-glow-md">
              <p className="text-[14px] text-paradigm-ink-soft leading-[1.85] mb-7">
                {t("emptyMessage")}
              </p>
              <Link href={locale !== "ja" ? "/contact?intent=japan-entry" : "/contact"} className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper px-7 py-3.5 rounded-lg text-[12px] tracking-[0.14em] uppercase font-semibold hover:bg-paradigm-accent transition-colors">
                {t("emptyCta")}
              </Link>
            </FadeIn>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {posts.map((post, i) => {
                const tags = (post.tags ?? []).filter((tag) => !/public-reviewed|japan-entry-public/i.test(tag))
                const gradient = CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length]
                return (
                  <FadeIn key={post.slug} delay={i * 0.05}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group block paradigm-glass rounded-lg p-6 paradigm-glow-sm hover:paradigm-glow-lg  transition-all duration-500 h-full"
                    >
                      {post.heroImage ? (
                        <Image
                          src={post.heroImage.src}
                          alt={post.heroImage.alt}
                          width={900}
                          height={560}
                          sizes="(min-width: 768px) 50vw, 100vw"
                          className="mb-5 aspect-[16/10] w-full rounded-xl object-cover"
                        />
                      ) : (
                        <div className="mb-5">
                          <BlogCoverFallback category={post.category} title={post.title} index={i} />
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        {post.category && (
                          <span className={`paradigm-eyebrow inline-block rounded-full px-2.5 py-1 text-[10px] bg-gradient-to-br ${gradient} text-paradigm-paper paradigm-glow-sm`}>
                            {post.category}
                          </span>
                        )}
                        <span className="paradigm-eyebrow text-paradigm-ink-mute text-[10px]">{formatDate(post.date, locale)}</span>
                        {post.readTime && (
                          <span className="paradigm-eyebrow text-paradigm-ink-mute text-[10px]">
                            {t("readTimeFormat", { readTime: post.readTime })}
                          </span>
                        )}
                      </div>
                      <h2 className="font-display text-[18px] md:text-[22px] leading-[1.2]  text-paradigm-ink group-hover:text-paradigm-accent transition-colors mb-3">
                        {post.title ?? "—"}
                      </h2>
                      {post.excerpt && (
                        <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft leading-[1.75] line-clamp-3">{post.excerpt}</p>
                      )}
                      {tags.length > 0 && (
                        <div className="flex gap-x-3 gap-y-1 mt-4 flex-wrap">
                          {tags.slice(0, 3).map((t) => (
                            <span key={t} className="paradigm-eyebrow text-paradigm-ink-mute text-[10px]">#{t}</span>
                          ))}
                        </div>
                      )}
                    </Link>
                  </FadeIn>
                )
              })}
            </div>
          )}
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildPageSchema({
              type: "CollectionPage",
              title: t("heroTitle"),
              description: t("heroDesc"),
              url: `https://paradigmjp.com/${locale}/blog`,
              locale,
            })
          ),
        }}
      />
    </>
  )
}
