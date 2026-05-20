/**
 * /[locale]/blog/[slug] — ブログ記事詳細 (PayloadCMS Posts → fallback BLOG_POSTS)
 *
 * 役割:   ブログ記事詳細 (PayloadCMS Posts → fallback BLOG_POSTS)
 * 入力:   params.locale, params.slug
 * 出力:   BlogPosting 構造化データ + markdown render + RichCtaBand
 *
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { Link } from "@/i18n/routing"
import { getTranslations } from "next-intl/server"
import { getBlogPostBySlug } from "@/lib/blog-cms"
import { notFound } from "next/navigation"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import { LOCALE_OG_LOCALE, LOCALE_ORG_NAME } from "@/lib/locale-map"
import { pageAlternates } from "@/lib/page-metadata"

export async function generateStaticParams() {
  // P0 暫定緩和 (2026-05-20): payload.posts テーブル不在のため build 時の
  // slug 列挙 × 12 locale が共有 Supabase pooler の接続上限 (pool_size:15) を
  // 枯渇させ EMAXCONNSESSION で build 失敗 (deploy w5kv8lb...)。テーブル復旧 (P0)
  // までは空配列を返し on-demand 描画にして build 時 DB 接続ストームを回避する。
  // 復旧後は `return await getAllBlogSlugs()` に戻す。
  return [] as { locale: string; slug: string }[]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}): Promise<Metadata> {
  const { slug, locale } = await params
  const t = await getTranslations({ locale, namespace: "blogPostPage" })
  const post = await getBlogPostBySlug(slug, locale)
  if (!post) return { title: t("notFound") }
  return {
    title: post.title,
    description: post.excerpt,
    alternates: pageAlternates(locale, `/blog/${slug}`),
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      locale: (LOCALE_OG_LOCALE as Record<string, string>)[locale] ?? "en_US",
    },
  }
}

function formatInline(text: string): string {
  return text
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
    if (!trimmed) {
      if (inList) { html.push("</ul>"); inList = false }
      if (inTable) { html.push("</tbody></table></div>"); inTable = false }
      html.push("")
      continue
    }

    if (trimmed.startsWith("|")) {
      if (trimmed.replace(/[|\-\s]/g, "") === "") continue
      const cells = trimmed.split("|").filter(Boolean).map((c) => c.trim())
      if (!inTable) {
        html.push('<div class="overflow-x-auto my-8 paradigm-glass rounded-2xl paradigm-glow-sm"><table class="w-full text-[14px] border-collapse"><thead><tr>')
        cells.forEach((c) =>
          html.push(`<th class="text-left py-3 px-4 border-b border-paradigm-line paradigm-eyebrow text-paradigm-accent">${c}</th>`),
        )
        html.push("</tr></thead><tbody>")
        inTable = true
      } else {
        html.push("<tr>")
        cells.forEach((c) =>
          html.push(`<td class="py-3 px-4 border-b border-paradigm-line/60 text-paradigm-ink-soft">${c}</td>`),
        )
        html.push("</tr>")
      }
      continue
    }
    if (inTable) { html.push("</tbody></table></div>"); inTable = false }

    if (trimmed.startsWith("### ")) {
      html.push(`<h3 class="font-display text-[20px] md:text-[22px] leading-[1.25] text-paradigm-ink mt-10 mb-3 tracking-[-0.01em]">${trimmed.slice(4)}</h3>`)
      continue
    }
    if (trimmed.startsWith("## ")) {
      html.push(`<h2 class="font-display text-[24px] md:text-[28px] leading-[1.2] mt-12 mb-5 tracking-[-0.015em]"><span class="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-paradigm-tech bg-clip-text text-transparent">${trimmed.slice(3)}</span></h2>`)
      continue
    }

    if (/^[-*]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
      if (!inList) { html.push('<ul class="my-5 space-y-2">'); inList = true }
      const content = trimmed.replace(/^[-*]\s|^\d+\.\s/, "")
      html.push(`<li class="flex gap-2.5 items-start text-[13px] md:text-[14px] text-paradigm-ink-soft leading-[1.85]"><span class="inline-block w-1.5 h-1.5 rounded-full bg-gradient-to-br from-paradigm-accent to-paradigm-tech mt-2 flex-shrink-0"></span><span>${formatInline(content)}</span></li>`)
      continue
    }
    if (inList) { html.push("</ul>"); inList = false }

    html.push(`<p class="text-[13px] md:text-[14px] text-paradigm-ink-soft leading-[1.9] my-4">${formatInline(trimmed)}</p>`)
  }
  if (inList) html.push("</ul>")
  if (inTable) html.push("</tbody></table></div>")

  return html.join("\n")
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}) {
  const { slug, locale } = await params
  const t = await getTranslations({ locale, namespace: "blogPostPage" })
  const post = await getBlogPostBySlug(slug, locale)
  if (!post) notFound()
  const orgName = (LOCALE_ORG_NAME as Record<string, string>)[locale] ?? "Paradigm LLC"

  return (
    <>
      <PageHero badge={post.category} title={post.title} desc={t("readTimeFormat", { date: post.date, readTime: post.readTime })} />

      <article className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-20" />
        <FadeIn className="relative z-10 max-w-3xl mx-auto px-6 md:px-8">
          <div className="paradigm-glass rounded-2xl p-7 md:p-9 paradigm-glow-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
        </FadeIn>
      </article>

      <section className="relative bg-paradigm-paper-deep py-8 overflow-hidden">
        <FadeIn className="max-w-3xl mx-auto px-6 md:px-8">
          <Link href="/blog" className="paradigm-eyebrow text-paradigm-ink-soft hover:text-paradigm-accent transition-colors inline-flex items-center gap-2">
            {t("backLink")}
          </Link>
        </FadeIn>
      </section>

      <RichCtaBand
        eyebrow={t("ctaEyebrow")}
        title={t("ctaTitle")}
        highlight={t("ctaHighlight")}
        desc={t("ctaDesc")}
        buttonLabel={t("ctaButton")}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt,
            datePublished: post.date,
            author: { "@type": "Organization", name: orgName },
            publisher: { "@type": "Organization", name: orgName, url: "https://paradigmjp.com" },
            inLanguage: locale,
          }),
        }}
      />
    </>
  )
}
