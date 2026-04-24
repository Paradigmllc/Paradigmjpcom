import type { Metadata } from "next"
import Link from "next/link"
import PageHero from "@/components/PageHero"
import { BLOG_POSTS } from "@/lib/blog"

export const metadata: Metadata = {
  title: "ブログ",
  description: "Web制作・MEO対策・SEO/GEO対策・AI導入に関する最新情報やノウハウをお届けします。",
}

const CAT_COLORS: Record<string, string> = {
  "SEO/GEO": "bg-amber-100 text-amber-700",
  "MEO": "bg-emerald-100 text-emerald-700",
  "AI": "bg-purple-100 text-purple-700",
  "Web制作": "bg-indigo-100 text-indigo-700",
}

export default function BlogPage() {
  return (
    <>
      <PageHero badge="Blog" title="ブログ" desc="デジタルマーケティングの最新情報とノウハウ" accent="rose" />

      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            {BLOG_POSTS.map(post => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group block rounded-2xl border border-gray-100 p-8 hover:border-accent/20 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CAT_COLORS[post.category] || "bg-gray-100 text-gray-600"}`}>{post.category}</span>
                  <span className="text-xs text-text-muted">{post.date}</span>
                  <span className="text-xs text-text-muted">・{post.readTime}で読める</span>
                </div>
                <h2 className="text-xl font-bold text-primary group-hover:text-accent transition-colors mb-3">{post.title}</h2>
                <p className="text-sm text-text-muted leading-relaxed">{post.excerpt}</p>
                <div className="flex gap-2 mt-4">
                  {post.tags.map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-text-muted">#{t}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
