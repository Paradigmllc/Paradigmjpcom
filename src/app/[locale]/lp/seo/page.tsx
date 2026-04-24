import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "【無料診断】SEO/GEO対策 | Paradigm合同会社",
  description: "従来のSEO+AI検索対応(GEO)の二刀流。オーガニック流入を平均2.5倍に。月額49,800円〜。無料サイト診断実施中。",
}

export default function SeoLP() {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative py-24 px-6 bg-gradient-to-br from-amber-500 via-amber-600 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_60%)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="text-amber-100 text-sm font-semibold tracking-widest uppercase mb-4">SEO/GEO対策サービス</p>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">検索される仕組みを、<br />つくる。</h1>
          <p className="text-lg text-amber-100 max-w-2xl mx-auto mb-4">Google検索 + AI検索（ChatGPT/Gemini）の二刀流対策。<br />オーガニック流入を平均2.5倍に。</p>
          <p className="text-3xl font-bold text-white mb-8">月額¥49,800<span className="text-base font-normal text-amber-200">〜（税別）</span></p>
          <Link href="/contact" className="inline-flex bg-white text-amber-600 px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all shadow-lg">
            無料サイト診断を受ける
          </Link>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-primary text-center mb-12">SEOだけでは、もう足りない</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-2xl bg-gray-50 p-8 border border-gray-200">
              <h3 className="text-lg font-bold text-primary mb-4">🔍 従来のSEO</h3>
              <p className="text-sm text-text-muted mb-4">Google/Yahoo検索での上位表示</p>
              <p className="text-2xl font-bold text-primary">平均2.5倍</p>
              <p className="text-xs text-text-muted">オーガニック流入増加</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-8 border border-amber-200 shadow-lg">
              <h3 className="text-lg font-bold text-primary mb-4">🤖 GEO（AI検索対策）<span className="ml-2 text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">NEW</span></h3>
              <p className="text-sm text-text-muted mb-4">ChatGPT/Gemini/Perplexityでの推薦</p>
              <p className="text-2xl font-bold text-primary">業界初</p>
              <p className="text-xs text-text-muted">AI検索最適化サービス</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-r from-amber-500 to-amber-700 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">AI時代の検索対策、始めませんか？</h2>
        <p className="text-amber-100 mb-8 text-lg">無料のSEO/GEO診断レポートをお送りします。</p>
        <Link href="/contact" className="inline-flex bg-white text-amber-600 px-12 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all shadow-lg">
          無料診断を受ける
        </Link>
      </section>
    </div>
  )
}
