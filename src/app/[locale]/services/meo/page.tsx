import type { Metadata } from "next"
import Link from "next/link"
import PageHero from "@/components/PageHero"
import { SERVICES, PRICING } from "@/lib/data"

export const metadata: Metadata = {
  title: "MEO対策",
  description: "Googleビジネスプロフィールの最適化で地域検索上位表示。来店型ビジネスの集客を最大化するMEO対策サービス。",
}

export default function MeoServicePage() {
  const service = SERVICES.find(s => s.id === "meo")!
  const pricing = PRICING.meo

  return (
    <>
      <PageHero badge="MEO対策" title={service.title} desc={service.tagline} icon={service.icon} accent="emerald" />

      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <p className="text-lg text-text-muted leading-relaxed mb-12 text-center">{service.desc}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {service.features.map(f => (
              <div key={f} className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-emerald-500 text-lg">&#10003;</span>
                <span className="text-sm font-medium text-primary">{f}</span>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-emerald-600 font-bold text-lg">{service.results}</p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">MEO対策の流れ</h2>
          <div className="space-y-6">
            {[
              { step: "01", title: "現状分析", desc: "Googleビジネスプロフィールの現状を診断し、競合状況と改善ポイントを洗い出します。" },
              { step: "02", title: "プロフィール最適化", desc: "カテゴリ・属性・説明文・写真をSEO観点で最適化。NAP情報の統一も実施します。" },
              { step: "03", title: "口コミ施策+投稿運用", desc: "口コミ獲得の仕組みを構築し、定期的な投稿で鮮度を維持します。" },
              { step: "04", title: "効果測定・改善", desc: "順位トラッキングと月次レポートで効果を可視化。データに基づく改善を継続します。" },
            ].map(s => (
              <div key={s.step} className="flex gap-6 items-start bg-white p-6 rounded-2xl border border-gray-100">
                <span className="text-3xl font-bold text-emerald-500/30">{s.step}</span>
                <div>
                  <h3 className="font-bold text-primary text-lg mb-1">{s.title}</h3>
                  <p className="text-sm text-text-muted">{s.desc}</p>
                </div>
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
              <div key={p.name} className={`rounded-2xl p-8 border ${p.popular ? "border-emerald-500 bg-white shadow-xl ring-2 ring-emerald-500" : "border-gray-200 bg-white"}`}>
                {p.popular && <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-2">人気No.1</p>}
                <h3 className="text-xl font-bold text-primary">{p.name}</h3>
                <p className="text-sm text-text-muted mt-1 mb-4">{p.desc}</p>
                <p className="text-3xl font-bold text-primary mb-1">&yen;{p.price}<span className="text-base font-normal text-text-muted">{p.period}</span></p>
                <ul className="mt-6 space-y-2">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-text-muted">
                      <span className="text-emerald-500 mt-0.5">&#10003;</span>{f}
                    </li>
                  ))}
                </ul>
                <Link href="/contact" className={`block mt-8 text-center py-3 rounded-xl font-semibold text-sm transition-colors ${p.popular ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-gray-100 text-primary hover:bg-gray-200"}`}>
                  相談する
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-text-muted">{pricing.monthly}</p>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">MEO対策を始めませんか？</h2>
        <p className="text-white/80 mb-8">地域No.1を目指す無料診断を実施中。</p>
        <Link href="/contact" className="inline-flex bg-white text-emerald-600 px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all shadow-lg">
          無料診断を受ける
        </Link>
      </section>
    </>
  )
}
