import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "【無料相談】Web制作 | Paradigm合同会社",
  description: "Next.js/WordPressによる高速・SEO最適化サイトを298,000円〜。Lighthouse 95+の高品質サイトを制作します。初回相談無料。",
}

export default function WebLP() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative py-24 px-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="text-indigo-200 text-sm font-semibold tracking-widest uppercase mb-4">Web制作サービス</p>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            売れるサイトを、<br />最新技術で。
          </h1>
          <p className="text-lg text-indigo-100 max-w-2xl mx-auto mb-4">
            Lighthouse 95+の高速サイトを制作。<br />デザイン → コーディング → SEO → 公開後運用まで一貫対応。
          </p>
          <p className="text-3xl font-bold text-white mb-8">¥298,000<span className="text-base font-normal text-indigo-200">〜（税別）</span></p>
          <Link href="/contact" className="inline-flex bg-white text-indigo-600 px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all shadow-lg">
            無料相談を予約する
          </Link>
          <p className="text-sm text-indigo-200 mt-3">※ 初回30分のオンライン相談は完全無料です</p>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-primary text-center mb-12">こんなお悩みありませんか？</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {["サイトの表示が遅くてユーザーが離脱している", "スマホで見ると崩れる・読みにくい", "作ったまま放置で問い合わせが来ない", "制作会社に頼んだが修正対応が遅い", "SEOが弱くて検索から見つけてもらえない", "自分で更新できない（CMS未導入）"].map(p => (
              <div key={p} className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
                <span className="text-red-400 text-lg shrink-0">&#10007;</span>
                <span className="text-sm text-primary">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-primary mb-12">Paradigmが全て解決します</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: "⚡", title: "表示速度 95+", desc: "Next.js/WordPressで高速化。Core Web Vitalsを最適化し、SEOにも好影響。" },
              { icon: "📱", title: "モバイルファースト", desc: "スマホでの操作性を最優先にデザイン。全デバイスで美しく表示。" },
              { icon: "🔍", title: "SEO標準装備", desc: "構造化データ・メタタグ・サイトマップ等、SEO内部対策を標準で実施。" },
            ].map(s => (
              <div key={s.title} className="rounded-2xl bg-white p-8 border border-gray-100 shadow-sm">
                <span className="text-4xl block mb-4">{s.icon}</span>
                <h3 className="text-lg font-bold text-primary mb-2">{s.title}</h3>
                <p className="text-sm text-text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-primary text-center mb-12">明確な料金体系</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "ライト", price: "298,000", desc: "5ページ以内", features: ["トップ+4ページ", "レスポンシブ", "SEO基本", "1ヶ月サポート"] },
              { name: "スタンダード", price: "598,000", desc: "10ページ以内", features: ["トップ+9ページ", "CMS導入", "SEO内部対策", "アニメーション", "3ヶ月サポート"], popular: true },
              { name: "プレミアム", price: "980,000", desc: "ページ数無制限", features: ["Next.jsカスタム", "多言語対応", "デザイン3案", "6ヶ月サポート"] },
            ].map(p => (
              <div key={p.name} className={`rounded-2xl p-8 border ${p.popular ? "border-indigo-500 ring-2 ring-indigo-500 shadow-xl" : "border-gray-200"} bg-white`}>
                {p.popular && <p className="text-indigo-600 text-xs font-bold uppercase mb-2">人気No.1</p>}
                <h3 className="text-xl font-bold text-primary">{p.name}</h3>
                <p className="text-sm text-text-muted mt-1 mb-3">{p.desc}</p>
                <p className="text-2xl font-bold text-primary">¥{p.price}<span className="text-sm font-normal text-text-muted">〜</span></p>
                <ul className="mt-4 space-y-2">
                  {p.features.map(f => <li key={f} className="flex items-center gap-2 text-sm text-text-muted"><span className="text-indigo-500">✓</span>{f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">まずは無料相談から</h2>
        <p className="text-indigo-100 mb-8 text-lg">御社のWebサイトを最短2週間で刷新します。</p>
        <Link href="/contact" className="inline-flex bg-white text-indigo-600 px-12 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all shadow-lg">
          無料相談を予約する（30分）
        </Link>
      </section>
    </div>
  )
}
