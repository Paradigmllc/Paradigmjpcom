import type { Metadata } from "next"
import { Link } from "@/i18n/routing"
import { BLOG_POSTS, getPost } from "@/lib/blog"
import { notFound } from "next/navigation"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"

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

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  return (
    <>
      <PageHero badge={post.category} title={post.title} desc={`${post.date} · ${post.readTime}で読める`} />

      <article className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-20" />
        <FadeIn className="relative z-10 max-w-3xl mx-auto px-6 md:px-8">
          <div className="paradigm-glass rounded-2xl p-7 md:p-9 paradigm-glow-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
        </FadeIn>
      </article>

      <section className="relative bg-paradigm-paper-deep py-8 overflow-hidden">
        <FadeIn className="max-w-3xl mx-auto px-6 md:px-8">
          <Link href="/blog" className="paradigm-eyebrow text-paradigm-ink-soft hover:text-paradigm-accent transition-colors inline-flex items-center gap-2">
            ← ブログ一覧に戻る
          </Link>
        </FadeIn>
      </section>

      <RichCtaBand
        eyebrow="Talk"
        title="無料相談を受け付けています"
        highlight="無料相談"
        desc="この記事のテーマについて、御社に合った具体的な提案をいたします。"
        buttonLabel="無料相談を予約する"
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
            author: { "@type": "Organization", name: "Paradigm合同会社" },
            publisher: { "@type": "Organization", name: "Paradigm合同会社", url: "https://paradigmjp.com" },
          }),
        }}
      />
    </>
  )
}
