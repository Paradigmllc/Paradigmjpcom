import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "【無料診断】MEO対策 | Paradigm合同会社",
  description: "Googleマップで地域No.1へ。平均3ヶ月でTOP3表示を実現するMEO対策サービス。月額29,800円〜。初回無料診断実施中。",
}

export default function MeoLP() {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative py-24 px-6 bg-gradient-to-br from-emerald-600 via-emerald-700 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="text-emerald-200 text-sm font-semibold tracking-widest uppercase mb-4">MEO対策サービス</p>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">地域No.1を、<br />Googleマップで。</h1>
          <p className="text-lg text-emerald-100 max-w-2xl mx-auto mb-4">平均3ヶ月でGoogleマップ TOP3表示を実現。<br />来店型ビジネスの集客を最大化します。</p>
          <p className="text-3xl font-bold text-white mb-8">月額¥29,800<span className="text-base font-normal text-emerald-200">〜（税別）</span></p>
          <Link href="/contact" className="inline-flex bg-white text-emerald-600 px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all shadow-lg">
            無料診断を受ける
          </Link>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-primary mb-12">MEO対策で実現できること</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: "TOP3", label: "Google Maps表示", desc: "地域検索で上位3位以内に表示。クリック率が大幅に向上します。" },
              { num: "+30件", label: "月間来店増加", desc: "実績平均。MEO対策後3ヶ月で月間来店数が30件以上増加。" },
              { num: "3ヶ月", label: "効果が出る目安", desc: "早い場合は1ヶ月。平均3ヶ月でTOP3表示が見込めます。" },
            ].map(s => (
              <div key={s.label} className="p-8">
                <p className="text-4xl font-bold text-emerald-500 mb-2">{s.num}</p>
                <h3 className="text-lg font-bold text-primary mb-2">{s.label}</h3>
                <p className="text-sm text-text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-primary text-center mb-12">こんな業種に最適です</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["飲食店・カフェ", "美容室・サロン", "クリニック・歯科", "不動産", "整骨院・整体", "学習塾", "士業事務所", "ホテル・旅館"].map(i => (
              <div key={i} className="text-center p-4 rounded-xl bg-white border border-gray-100">
                <span className="text-sm font-medium text-primary">{i}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">まずは無料診断から</h2>
        <p className="text-emerald-100 mb-8 text-lg">御社のGoogleビジネスプロフィールを無料で診断します。</p>
        <Link href="/contact" className="inline-flex bg-white text-emerald-600 px-12 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all shadow-lg">
          無料診断を受ける
        </Link>
      </section>
    </div>
  )
}
