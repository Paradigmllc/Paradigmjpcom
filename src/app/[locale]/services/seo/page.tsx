import type { Metadata } from "next"
import Link from "next/link"
import PageHero from "@/components/PageHero"
import { SERVICES, PRICING } from "@/lib/data"

export const metadata: Metadata = {
  title: "SEO/GEO対策",
  description: "従来のSEOに加え、ChatGPT/Gemini等のAI検索での表示最適化（GEO）にも対応。未来の検索に備えるSEO/GEO対策サービス。",
}

export default function SeoServicePage() {
  const service = SERVICES.find(s => s.id === "seo")!
  const pricing = PRICING.seo

  return (
    <>
      <PageHero badge="SEO/GEO対策" title={service.title} desc={service.tagline} icon={service.icon} accent="amber" />

      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <p className="text-lg text-text-muted leading-relaxed mb-12 text-center">{service.desc}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {service.features.map(f => (
              <div key={f} className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-amber-500 text-lg">&#10003;</span>
                <span className="text-sm font-medium text-primary">{f}</span>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-amber-600 font-bold text-lg">{service.results}</p>
        </div>
      </section>

      {/* SEO vs GEO */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">SEOとGEOの違い</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-2xl bg-white border border-gray-200 p-8">
              <h3 className="text-xl font-bold text-primary mb-4">🔍 SEO（従来型）</h3>
              <p className="text-sm text-text-muted leading-relaxed mb-4">Google/Yahoo検索で上位表示を目指す施策。キーワード最適化、コンテンツ戦略、テクニカルSEOが柱。</p>
              <ul className="space-y-2">
                {["キーワード調査+戦略設計", "コンテンツSEO（記事作成）", "内部・テクニカルSEO", "構造化データ実装"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-text-muted">
                    <span className="text-amber-500">&#10003;</span>{f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white border border-amber-200 p-8 shadow-lg">
              <h3 className="text-xl font-bold text-primary mb-4">🤖 GEO（AI検索対応）</h3>
              <p className="text-sm text-text-muted leading-relaxed mb-4">ChatGPT/Gemini/Perplexity等のAI検索で推薦される施策。今後の検索の主流になると言われています。</p>
              <ul className="space-y-2">
                {["AI検索での引用・推薦最適化", "エンティティSEO", "FAQ構造化", "信頼性シグナル強化"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-text-muted">
                    <span className="text-amber-500">&#10003;</span>{f}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full inline-block">NEW: Paradigmだけの独自サービス</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">料金プラン</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricing.plans.map(p => (
              <div key={p.name} className={`rounded-2xl p-8 border ${p.popular ? "border-amber-500 bg-white shadow-xl ring-2 ring-amber-500" : "border-gray-200 bg-white"}`}>
                {p.popular && <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">おすすめ</p>}
                <h3 className="text-xl font-bold text-primary">{p.name}</h3>
                <p className="text-sm text-text-muted mt-1 mb-4">{p.desc}</p>
                <p className="text-3xl font-bold text-primary mb-1">&yen;{p.price}<span className="text-base font-normal text-text-muted">{p.period}</span></p>
                <ul className="mt-6 space-y-2">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-text-muted">
                      <span className="text-amber-500 mt-0.5">&#10003;</span>{f}
                    </li>
                  ))}
                </ul>
                <Link href="/contact" className={`block mt-8 text-center py-3 rounded-xl font-semibold text-sm transition-colors ${p.popular ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-gray-100 text-primary hover:bg-gray-200"}`}>
                  相談する
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-text-muted">{pricing.monthly}</p>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-r from-amber-500 to-amber-700 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">AI時代の検索対策、始めませんか？</h2>
        <p className="text-white/80 mb-8">SEO+GEOの無料サイト診断を実施中。</p>
        <Link href="/contact" className="inline-flex bg-white text-amber-600 px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all shadow-lg">
          無料診断を受ける
        </Link>
      </section>
    </>
  )
}
