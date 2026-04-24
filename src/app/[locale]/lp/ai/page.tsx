import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "【無料相談】AI導入支援 | Paradigm合同会社",
  description: "ChatGPT/Geminiを業務に導入。チャットボット構築、業務自動化、データ分析で業務時間を平均40%削減。198,000円〜。",
}

export default function AiLP() {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative py-24 px-6 bg-gradient-to-br from-purple-600 via-purple-700 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <p className="text-purple-200 text-sm font-semibold tracking-widest uppercase mb-4">AI導入支援サービス</p>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">AIを、<br />ビジネスの武器に。</h1>
          <p className="text-lg text-purple-100 max-w-2xl mx-auto mb-4">チャットボット構築・業務自動化・データ分析。<br />最新AIで業務時間を平均40%削減。</p>
          <p className="text-3xl font-bold text-white mb-8">¥198,000<span className="text-base font-normal text-purple-200">〜（税別）</span></p>
          <Link href="/contact" className="inline-flex bg-white text-purple-600 px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all shadow-lg">
            無料相談を予約する
          </Link>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-primary text-center mb-12">AI導入で変わる3つの数字</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { num: "40%", label: "業務時間削減", desc: "繰り返し作業をAIが自動化。人間はクリエイティブな業務に集中。" },
              { num: "80%", label: "問い合わせ自動化", desc: "AIチャットボットが24時間対応。人件費を大幅に削減。" },
              { num: "1/5", label: "レポート作成時間", desc: "データ収集→分析→作成をAIが自動化。意思決定を加速。" },
            ].map(s => (
              <div key={s.label}>
                <p className="text-5xl font-bold text-purple-500 mb-2">{s.num}</p>
                <h3 className="text-lg font-bold text-primary mb-2">{s.label}</h3>
                <p className="text-sm text-text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-primary text-center mb-12">専門知識は不要です</h2>
          <div className="space-y-4">
            {[
              { q: "プログラミング知識がなくても大丈夫？", a: "はい。導入から運用まで全てサポートします。操作マニュアルと社内研修もセットです。" },
              { q: "どのくらいの期間で導入できる？", a: "チャットボットなら最短2週間。業務自動化は1〜2ヶ月が目安です。" },
              { q: "既存のシステムと連携できる？", a: "はい。Google Workspace、Slack、各種CRM等との連携が可能です。" },
            ].map(f => (
              <div key={f.q} className="p-6 rounded-2xl bg-white border border-gray-100">
                <p className="font-semibold text-primary mb-2">{f.q}</p>
                <p className="text-sm text-text-muted">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-r from-purple-600 to-purple-800 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">AI導入の第一歩を踏み出しませんか？</h2>
        <p className="text-purple-100 mb-8 text-lg">無料相談で御社に最適なAI活用プランをご提案します。</p>
        <Link href="/contact" className="inline-flex bg-white text-purple-600 px-12 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all shadow-lg">
          無料相談を予約する（30分）
        </Link>
      </section>
    </div>
  )
}
