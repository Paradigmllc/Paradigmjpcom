import type { Metadata } from "next"
import { Link } from "@/i18n/routing"
import { getTranslations } from "next-intl/server"
import { getBlogPostBySlug } from "@/lib/blog-cms"
import { getAllBlogPosts } from "@/lib/blog-cms"
import { notFound } from "next/navigation"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import { LOCALE_OG_LOCALE, LOCALE_ORG_NAME } from "@/lib/locale-map"
import { pageAlternates } from "@/lib/page-metadata"
import { MARKETING_LOCALES } from "@/i18n/locales"
import { ArrowRight, Calendar, Clock, Tag } from "lucide-react"
import Image from "next/image"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}): Promise<Metadata> {
  const { slug, locale } = await params
  const [t, localizedPosts] = await Promise.all([
    getTranslations({ locale, namespace: "blogPostPage" }),
    Promise.all(
      MARKETING_LOCALES.map(async (candidate) => ({
        locale: candidate,
        post: await getBlogPostBySlug(slug, candidate),
      })),
    ),
  ])
  const post = localizedPosts.find((entry) => entry.locale === locale)?.post ?? null
  if (!post) return { title: t("notFound") }
  const availableLocales = localizedPosts
    .filter((entry) => entry.post !== null)
    .map((entry) => entry.locale)
  return {
    title: post.title,
    description: post.excerpt,
    alternates: pageAlternates(locale, `/blog/${slug}`, availableLocales),
    openGraph: {
      title: post.title, description: post.excerpt, type: "article",
      publishedTime: post.date,
      locale: (LOCALE_OG_LOCALE as Record<string, string>)[locale] ?? "en_US",
    },
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function headingId(text: string): string {
  return text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
}

function formatInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-paradigm-ink font-medium">$1</strong>')
    .replace(/`(.+?)`/g, '<code class="font-mono text-[13px] bg-paradigm-paper-deep px-1.5 py-0.5 rounded border border-paradigm-line">$1</code>')
    .replace(/❌/g, '<span class="text-pink-500">❌</span>')
    .replace(/◎/g, '<span class="text-paradigm-tech font-medium">◎</span>')
    .replace(/○/g, '<span class="text-paradigm-glow">○</span>')
    .replace(/△/g, '<span class="text-paradigm-ink-mute">△</span>')
}

function renderMarkdown(md: string) {
  const lines = md.split("\n")
  const html: string[] = []
  let inTable = false
  let inList = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) { if (inList) { html.push("</ul>"); inList = false }; if (inTable) { html.push("</tbody></table></div>"); inTable = false }; html.push(""); continue }
    if (trimmed.startsWith("|")) {
      if (trimmed.replace(/[|\-\s]/g, "") === "") continue
      const cells = trimmed.split("|").filter(Boolean).map((c) => c.trim())
      if (!inTable) { html.push('<div class="overflow-x-auto my-8 paradigm-glass rounded-2xl paradigm-glow-sm"><table class="w-full text-[14px] border-collapse"><thead><tr>'); cells.forEach((c) => html.push(`<th scope="col" class="text-left py-3 px-4 border-b border-paradigm-line paradigm-eyebrow text-paradigm-accent">${formatInline(c)}</th>`)); html.push("</tr></thead><tbody>"); inTable = true }
      else { html.push("<tr>"); cells.forEach((c) => html.push(`<td class="py-3 px-4 border-b border-paradigm-line/60 text-paradigm-ink-soft">${formatInline(c)}</td>`)); html.push("</tr>") }
      continue
    }
    if (inTable) { html.push("</tbody></table></div>"); inTable = false }
    if (trimmed.startsWith("### ")) { const heading = trimmed.slice(4); html.push(`<h3 id="${headingId(heading)}" class="font-display text-[20px] md:text-[22px] leading-[1.25] text-paradigm-ink mt-10 mb-3 tracking-[-0.01em]">${formatInline(heading)}</h3>`); continue }
    if (trimmed.startsWith("## ")) { const heading = trimmed.slice(3); html.push(`<h2 id="${headingId(heading)}" class="font-display text-[24px] md:text-[28px] leading-[1.2] mt-12 mb-5 tracking-[-0.015em]"><span class="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-paradigm-tech bg-clip-text text-transparent">${formatInline(heading)}</span></h2>`); continue }
    if (/^[-*]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
      if (!inList) { html.push('<ul class="my-5 space-y-2">'); inList = true }
      html.push(`<li class="flex gap-2.5 items-start text-[13px] md:text-[14px] text-paradigm-ink-soft leading-[1.85]"><span class="inline-block w-1.5 h-1.5 rounded-full bg-gradient-to-br from-paradigm-accent to-paradigm-tech mt-2 flex-shrink-0"></span><span>${formatInline(trimmed.replace(/^[-*]\s|^\d+\.\s/, ""))}</span></li>`)
      continue
    }
    if (inList) { html.push("</ul>"); inList = false }
    html.push(`<p class="text-[13px] md:text-[14px] text-paradigm-ink-soft leading-[1.9] my-4">${formatInline(trimmed)}</p>`)
  }
  if (inList) html.push("</ul>")
  if (inTable) html.push("</tbody></table></div>")
  return html.join("\n")
}

function extractToc(md: string): Array<{ id: string; text: string; level: number }> {
  const items: Array<{ id: string; text: string; level: number }> = []
  for (const line of md.split("\n")) {
    if (line.startsWith("## ")) {
      const text = line.slice(3)
      items.push({ id: headingId(text), text, level: 2 })
    } else if (line.startsWith("### ")) {
      const text = line.slice(4)
      items.push({ id: headingId(text), text, level: 3 })
    }
  }
  return items
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}) {
  const { slug, locale } = await params
  const t = await getTranslations({ locale, namespace: "blogPostPage" })
  const post = await getBlogPostBySlug(slug, locale)
  if (!post) {
    // A slug can exist in only one maintained marketing locale. The locale
    // switcher preserves the pathname, so fall back to the available article
    // instead of showing a false 404 for an otherwise valid public post.
    const fallbackLocale = locale === "en" ? "ja" : "en"
    const fallbackPost = await getBlogPostBySlug(slug, fallbackLocale)
    if (fallbackPost) redirect(`/${fallbackLocale}/blog/${slug}`)
    notFound()
  }
  const orgName = (LOCALE_ORG_NAME as Record<string, string>)[locale] ?? "Paradigm LLC"
  const toc = extractToc(post.content)
  const isJa = locale === "ja"
  const contactHref = "/contact?intent=japan-entry"
  const visibleTags = (post.tags ?? []).filter((tag) => !/public-reviewed|japan-entry-public/i.test(tag))

  return (
    <>
      <PageHero badge={post.category} title={post.title} desc={t("readTimeFormat", { date: post.date, readTime: post.readTime })} />

      <article className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-20" />
        <FadeIn className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 lg:gap-12">
            {/* Main content */}
            <div className="min-w-0">
              {post.heroImage && (
                <figure className="mb-8 overflow-hidden rounded-2xl border border-paradigm-line/70 bg-white paradigm-glass paradigm-glow-sm">
                  <Image
                    src={post.heroImage.src}
                    alt={post.heroImage.alt}
                    width={900}
                    height={560}
                    sizes="(min-width: 1024px) 680px, 100vw"
                    className="h-auto w-full"
                    priority
                  />
                  <figcaption className="px-5 py-3 text-[11px] leading-[1.7] text-paradigm-ink-mute">
                    {post.heroImage.caption}
                  </figcaption>
                </figure>
              )}

              {/* Mobile navigation keeps the article usable without a desktop sidebar. */}
              <aside className="mb-8 space-y-4 lg:hidden">
                {toc.length > 0 && (
                  <nav className="paradigm-glass rounded-2xl p-5 paradigm-glow-sm" aria-label={isJa ? "記事の目次" : "Article contents"}>
                    <h4 className="font-display text-[14px] text-paradigm-ink mb-4 tracking-[-0.01em]">{isJa ? "目次" : "Contents"}</h4>
                    <ul className="space-y-1.5">
                      {toc.map((item) => (
                        <li key={item.id}>
                          <a href={`#${item.id}`} className={`block text-[12px] text-paradigm-ink-soft hover:text-paradigm-accent transition-colors leading-[1.6] ${item.level === 3 ? "pl-3" : "font-medium text-paradigm-ink"}`}>
                            {item.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
                <div className="paradigm-glass rounded-2xl p-5 paradigm-glow-sm bg-gradient-to-br from-paradigm-accent/5 to-paradigm-glow/5">
                  <h4 className="font-display text-[14px] text-paradigm-ink mb-2">{isJa ? "Japan Entry 適合審査 — $12K" : "Japan Entry — $12K fixed"}</h4>
                  <p className="text-[11px] text-paradigm-ink-soft leading-[1.7] mb-4">{isJa ? "セットアップ費用固定。月額運用は最初の6か月無料。" : "A fixed-scope starting system for fast-decision SMBs."}</p>
                  <Link href={contactHref} className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.12em] uppercase font-semibold bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent transition-colors px-4 py-2 rounded-xl paradigm-glow-sm">
                    Apply — $12K <ArrowRight size={12} />
                  </Link>
                </div>
              </aside>

              {post.content ? (
                <div className="paradigm-glass rounded-2xl p-7 md:p-9 paradigm-glow-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
              ) : (
                <div className="paradigm-glass rounded-2xl p-7 md:p-9 paradigm-glow-md text-center">
                  <p className="text-[14px] text-paradigm-ink-soft leading-[1.85]">{t("emptyContent")}</p>
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                {visibleTags.map((tag) => (
                  <span key={tag} className="paradigm-eyebrow text-[10px] px-3 py-1.5 paradigm-glass rounded-full text-paradigm-ink-soft flex items-center gap-1.5">
                    <Tag size={10} />{tag}
                  </span>
                ))}
              </div>

              <div className="mt-8">
                <Link href="/blog" className="paradigm-eyebrow text-paradigm-ink-soft hover:text-paradigm-accent transition-colors inline-flex items-center gap-2">
                  {t("backLink")}
                </Link>
              </div>
            </div>

            {/* Sticky Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                {/* Table of Contents */}
                {toc.length > 0 && (
                  <nav className="paradigm-glass rounded-2xl p-5 paradigm-glow-sm">
                    <h4 className="font-display text-[14px] text-paradigm-ink mb-4 tracking-[-0.01em]">{isJa ? "目次" : "Contents"}</h4>
                    <ul className="space-y-1.5">
                      {toc.map((item) => (
                        <li key={item.id}>
                          <a href={`#${item.id}`}
                            className={`block text-[12px] text-paradigm-ink-soft hover:text-paradigm-accent transition-colors leading-[1.6] ${item.level === 3 ? "pl-3" : "font-medium text-paradigm-ink"}`}>
                            {item.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}

                {/* Post meta */}
                <div className="paradigm-glass rounded-2xl p-5 paradigm-glow-sm space-y-3">
                  <div className="flex items-center gap-2 text-[12px] text-paradigm-ink-soft">
                    <Calendar size={14} className="text-paradigm-accent" />
                    <span>{post.date}</span>
                  </div>
                  {post.readTime && (
                    <div className="flex items-center gap-2 text-[12px] text-paradigm-ink-soft">
                      <Clock size={14} className="text-paradigm-accent" />
                      <span>{post.readTime}</span>
                    </div>
                  )}
                  {post.category && (
                    <div className="flex items-center gap-2 text-[12px] text-paradigm-ink-soft">
                      <Tag size={14} className="text-paradigm-accent" />
                      <span>{post.category}</span>
                    </div>
                  )}
                  {visibleTags.length > 0 && (
                    <div className="border-t border-paradigm-line/70 pt-3">
                      <p className="paradigm-eyebrow text-[10px] text-paradigm-ink-mute mb-2">{isJa ? "タグ" : "Topics"}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {visibleTags.map((tag) => <span key={tag} className="rounded-full border border-paradigm-line px-2 py-1 text-[10px] text-paradigm-ink-soft">{tag}</span>)}
                      </div>
                    </div>
                  )}
                </div>

                {/* CTA Card */}
                <div className="paradigm-glass rounded-2xl p-5 paradigm-glow-sm bg-gradient-to-br from-paradigm-accent/5 to-paradigm-glow/5">
                  <h4 className="font-display text-[14px] text-paradigm-ink mb-2 tracking-[-0.01em]">{isJa ? "Japan Entry 適合審査 — $12K" : "Japan Entry — $12K fixed"}</h4>
                  <p className="text-[11px] text-paradigm-ink-soft leading-[1.7] mb-4">{isJa ? "セットアップ費用固定。月額運用は最初の6か月無料。" : "Apply if your team can approve this week and launch this month."}</p>
                  <Link href={contactHref} className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.12em] uppercase font-semibold bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent transition-colors px-4 py-2 rounded-xl paradigm-glow-sm">
                    {isJa ? "Apply — $12K" : "Apply — $12K"} <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </FadeIn>
      </article>

      <RichCtaBand
        eyebrow={t("ctaEyebrow")}
        title={t("ctaTitle")}
        highlight={t("ctaHighlight")}
        desc={t("ctaDesc")}
        buttonLabel={t("ctaButton")}
        buttonHref={contactHref}
      />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "BlogPosting",
        headline: post.title, description: post.excerpt,
        datePublished: post.date,
        author: { "@type": "Organization", name: orgName },
        publisher: { "@type": "Organization", name: orgName, url: "https://paradigmjp.com" },
        inLanguage: locale,
      })}} />
    </>
  )
}
