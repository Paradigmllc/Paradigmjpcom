import type { Metadata } from "next"
import Link from "next/link"
import PageHero from "@/components/PageHero"
import { SERVICES, PRICING } from "@/lib/data"

export const metadata: Metadata = {
  title: "AI導入支援",
  description: "ChatGPT/Gemini等の最新AIを業務に導入。チャットボット構築、業務自動化、データ分析で生産性を劇的に向上させます。",
}

export default function AiServicePage() {
  const service = SERVICES.find(s => s.id === "ai")!
  const pricing = PRICING.ai

  return (
    <>
      <PageHero badge="AI導入支援" title={service.title} desc={service.tagline} icon={service.icon} accent="violet" />

      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <p className="text-lg text-text-muted leading-relaxed mb-12 text-center">{service.desc}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {service.features.map(f => (
              <div key={f} className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-purple-500 text-lg">&#10003;</span>
                <span className="text-sm font-medium text-primary">{f}</span>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-purple-600 font-bold text-lg">{service.results}</p>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">AI導入事例</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: "カスタマー対応の80%自動化", desc: "AIチャットボットにFAQを学習させ、問い合わせの8割を自動応答。人件費を大幅に削減。", tag: "チャットボット" },
              { title: "レポート作成時間を1/5に", desc: "月次レポートの作成をAIが自動化。データ収集から分析、グラフ作成まで一気通貫。", tag: "業務自動化" },
              { title: "コンテンツ制作コスト60%減", desc: "ブログ記事のドラフトをAIが作成。人間が監修・仕上げるハイブリッド体制で品質を維持。", tag: "コンテンツ生成" },
              { title: "売上予測精度が2倍に", desc: "過去の販売データをAIが分析し、需要予測の精度を大幅に向上。在庫ロスを最小化。", tag: "データ分析" },
            ].map(c => (
              <div key={c.title} className="rounded-2xl bg-white border border-gray-100 p-8 hover:shadow-lg transition-all">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-600 mb-3 inline-block">{c.tag}</span>
                <h3 className="font-bold text-primary text-lg mb-2">{c.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">料金プラン</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricing.plans.map(p => (
              <div key={p.name} className={`rounded-2xl p-8 border ${p.popular ? "border-purple-500 bg-white shadow-xl ring-2 ring-purple-500" : "border-gray-200 bg-white"}`}>
                {p.popular && <p className="text-purple-600 text-xs font-bold uppercase tracking-wider mb-2">人気No.1</p>}
                <h3 className="text-xl font-bold text-primary">{p.name}</h3>
                <p className="text-sm text-text-muted mt-1 mb-4">{p.desc}</p>
                <p className="text-3xl font-bold text-primary mb-1">&yen;{p.price}<span className="text-base font-normal text-text-muted">{p.period}</span></p>
                <ul className="mt-6 space-y-2">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-text-muted">
                      <span className="text-purple-500 mt-0.5">&#10003;</span>{f}
                    </li>
                  ))}
                </ul>
                <Link href="/contact" className={`block mt-8 text-center py-3 rounded-xl font-semibold text-sm transition-colors ${p.popular ? "bg-purple-500 text-white hover:bg-purple-600" : "bg-gray-100 text-primary hover:bg-gray-200"}`}>
                  相談する
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-text-muted">{pricing.monthly}</p>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-r from-purple-600 to-purple-800 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">AI導入で業務を変えませんか？</h2>
        <p className="text-white/80 mb-8">無料相談でAI活用の可能性を診断します。</p>
        <Link href="/contact" className="inline-flex bg-white text-purple-600 px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all shadow-lg">
          無料相談を予約する
        </Link>
      </section>
    </>
  )
}
