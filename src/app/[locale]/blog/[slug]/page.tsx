import type { Metadata } from "next"
import { Link } from "@/i18n/routing"
import { BLOG_POSTS, getPost } from "@/lib/blog"
import { notFound } from "next/navigation"
import PageHero from "@/components/PageHero"

/**
 * /[locale]/blog/[slug] — article detail (Aesop voice).
 *
 * P18-D-3 followup rewrite. Hero now uses shared PageHero (paper bg +
 * serif). Markdown→HTML renderer outputs paradigm-* tokens. CTA closing
 * band switches from gradient pill to ink reverse.
 *
 * AE-PHP-1: 130 lines.
 */

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }))
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return params.then(({ slug }) => {
    const post = getPost(slug)
    if (!post) return { title: "記事が見つかりません" }
    return {
      title: post.title,
      description: post.excerpt,
      openGraph: { title: post.title, description: post.excerpt, type: "article", publishedTime: post.date },
    }
  })
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-paradigm-ink font-medium">$1</strong>')
    .replace(/`(.+?)`/g, '<code class="font-mono text-[13px] bg-paradigm-paper-deep px-1.5 py-0.5 border border-paradigm-line">$1</code>')
    .replace(/❌/g, '<span class="text-paradigm-accent">❌</span>')
    .replace(/◎/g, '<span class="text-paradigm-ink font-medium">◎</span>')
    .replace(/○/g, '<span class="text-paradigm-ink-soft">○</span>')
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
        html.push('<div class="overflow-x-auto my-8"><table class="w-full text-[14px] border-collapse"><thead><tr>')
        cells.forEach((c) =>
          html.push(`<th class="text-left py-3 px-4 bg-paradigm-paper-deep border border-paradigm-line paradigm-eyebrow">${c}</th>`),
        )
        html.push("</tr></thead><tbody>")
        inTable = true
      } else {
        html.push("<tr>")
        cells.forEach((c) =>
          html.push(`<td class="py-3 px-4 border border-paradigm-line text-paradigm-ink-soft">${c}</td>`),
        )
        html.push("</tr>")
      }
      continue
    }
    if (inTable) { html.push("</tbody></table></div>"); inTable = false }

    if (trimmed.startsWith("### ")) {
      html.push(`<h3 class="font-display text-[22px] md:text-[24px] leading-[1.25] text-paradigm-ink mt-12 mb-4">${trimmed.slice(4)}</h3>`)
      continue
    }
    if (trimmed.startsWith("## ")) {
      html.push(`<h2 class="font-display text-[26px] md:text-[32px] leading-[1.2] text-paradigm-ink mt-16 mb-6">${trimmed.slice(3)}</h2>`)
      continue
    }

    if (/^[-*]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
      if (!inList) { html.push('<ul class="border-t border-paradigm-line my-6">'); inList = true }
      const content = trimmed.replace(/^[-*]\s|^\d+\.\s/, "")
      html.push(`<li class="border-b border-paradigm-line py-3 text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.85]">${formatInline(content)}</li>`)
      continue
    }
    if (inList) { html.push("</ul>"); inList = false }

    html.push(`<p class="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.9] my-5">${formatInline(trimmed)}</p>`)
  }
  if (inList) html.push("</ul>")
  if (inTable) html.push("</tbody></table></div>")

  return html.join("\n")
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  return (
    <>
      <PageHero badge={post.category} title={post.title} desc={`${post.date} · ${post.readTime}で読める`} />

      <article className="bg-paradigm-paper paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-12" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
      </article>

      <section className="bg-paradigm-paper-deep paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
          <p className="paradigm-eyebrow mb-5">Talk</p>
          <h2 className="font-display text-[28px] md:text-[40px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink mb-6">
            無料相談を受け付けています
          </h2>
          <p className="text-[15px] text-paradigm-ink-soft mb-10 leading-[1.85] max-w-xl mx-auto">
            この記事のテーマについて、御社に合った具体的な提案をいたします。
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper px-10 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-accent transition-colors"
          >
            無料相談を予約する
          </Link>
        </div>
      </section>

      <section className="bg-paradigm-paper border-t border-paradigm-line py-8">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <Link href="/blog" className="paradigm-eyebrow text-paradigm-ink-soft hover:text-paradigm-ink transition-colors">
            ← ブログ一覧に戻る
          </Link>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt,
            datePublished: post.date,
            author: { "@type": "Organization", name: "Paradigm合同会社" },
            publisher: { "@type": "Organization", name: "Paradigm合同会社", url: "https://paradigmjp.com" },
          }),
        }}
      />
    </>
  )
}
