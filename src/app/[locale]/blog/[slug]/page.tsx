import type { Metadata } from "next"
import Link from "next/link"
import { BLOG_POSTS, getPost } from "@/lib/blog"
import { notFound } from "next/navigation"

export function generateStaticParams() {
  return BLOG_POSTS.map(p => ({ slug: p.slug }))
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

function renderMarkdown(md: string) {
  // Simple markdown→HTML (headings, bold, lists, tables, links)
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

    // Table
    if (trimmed.startsWith("|")) {
      if (trimmed.replace(/[|\-\s]/g, "") === "") continue // separator
      const cells = trimmed.split("|").filter(Boolean).map(c => c.trim())
      if (!inTable) {
        html.push('<div class="overflow-x-auto my-6"><table class="w-full text-sm border-collapse"><thead><tr>')
        cells.forEach(c => html.push(`<th class="text-left py-2 px-3 bg-gray-50 border border-gray-200 font-semibold">${c}</th>`))
        html.push("</tr></thead><tbody>")
        inTable = true
      } else {
        html.push("<tr>")
        cells.forEach(c => html.push(`<td class="py-2 px-3 border border-gray-200">${c}</td>`))
        html.push("</tr>")
      }
      continue
    }
    if (inTable) { html.push("</tbody></table></div>"); inTable = false }

    // Headings
    if (trimmed.startsWith("### ")) { html.push(`<h3 class="text-lg font-bold text-primary mt-8 mb-3">${trimmed.slice(4)}</h3>`); continue }
    if (trimmed.startsWith("## ")) { html.push(`<h2 class="text-xl font-bold text-primary mt-10 mb-4">${trimmed.slice(3)}</h2>`); continue }

    // List
    if (/^[-*]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
      if (!inList) { html.push('<ul class="space-y-2 my-4">'); inList = true }
      const content = trimmed.replace(/^[-*]\s|^\d+\.\s/, "")
      html.push(`<li class="flex gap-2 text-text-muted"><span class="text-accent shrink-0">•</span><span>${formatInline(content)}</span></li>`)
      continue
    }
    if (inList) { html.push("</ul>"); inList = false }

    // Paragraph
    html.push(`<p class="text-text-muted leading-relaxed my-4">${formatInline(trimmed)}</p>`)
  }
  if (inList) html.push("</ul>")
  if (inTable) html.push("</tbody></table></div>")

  return html.join("\n")
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-primary font-semibold">$1</strong>')
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    .replace(/❌/g, '<span class="text-red-500">❌</span>')
    .replace(/◎/g, '<span class="text-green-500 font-bold">◎</span>')
    .replace(/○/g, '<span class="text-blue-500 font-bold">○</span>')
    .replace(/△/g, '<span class="text-amber-500 font-bold">△</span>')
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  return (
    <>
      <section className="py-20 px-6 bg-gradient-to-br from-primary to-slate-900 text-white">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10">{post.category}</span>
            <span className="text-sm text-gray-400">{post.date}</span>
            <span className="text-sm text-gray-400">・{post.readTime}で読める</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">{post.title}</h1>
        </div>
      </section>

      <article className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
      </article>

      {/* CTA */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-primary mb-4">無料相談を受け付けています</h2>
          <p className="text-text-muted mb-6">この記事のテーマについて、御社に合った具体的な提案をいたします。</p>
          <Link href="/contact" className="inline-flex bg-accent text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-accent/90 transition-colors shadow-lg shadow-accent/25">
            無料相談を予約する
          </Link>
        </div>
      </section>

      {/* Back to blog */}
      <section className="py-8 px-6 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <Link href="/blog" className="text-accent font-medium hover:underline">&larr; ブログ一覧に戻る</Link>
        </div>
      </section>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.excerpt,
        datePublished: post.date,
        author: { "@type": "Organization", name: "Paradigm合同会社" },
        publisher: { "@type": "Organization", name: "Paradigm合同会社", url: "https://paradigmjp.com" },
      })}} />
    </>
  )
}
