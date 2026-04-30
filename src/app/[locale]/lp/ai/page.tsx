import type { Metadata } from "next"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"

export const metadata: Metadata = {
  title: "【無料相談】AI導入支援 | Paradigm合同会社",
  description: "ChatGPT/Geminiを業務に導入。チャットボット構築、業務自動化、データ分析で業務時間を平均40%削減。198,000円〜。",
}

const STATS = [
  { num: "40%", label: "業務時間削減", desc: "繰り返し作業を AI が自動化。人間はクリエイティブな業務に集中。", gradient: "from-pink-400 via-paradigm-accent to-paradigm-tech" },
  { num: "80%", label: "問い合わせ自動化", desc: "AI チャットボットが 24 時間対応。人件費を大幅に削減。", gradient: "from-paradigm-tech via-paradigm-glow to-violet-400" },
  { num: "1/5", label: "レポート作成時間", desc: "データ収集 → 分析 → 作成を AI が自動化。意思決定を加速。", gradient: "from-paradigm-glow via-violet-400 to-paradigm-accent" },
] as const

const FAQS = [
  { q: "プログラミング知識がなくても大丈夫？", a: "はい。導入から運用まで全てサポートします。操作マニュアルと社内研修もセットです。" },
  { q: "どのくらいの期間で導入できる？", a: "チャットボットなら最短 2 週間。業務自動化は 1〜2 ヶ月が目安です。" },
  { q: "既存のシステムと連携できる？", a: "はい。Google Workspace、Slack、各種 CRM 等との連携が可能です。" },
] as const

export default function AiLP() {
  return (
    <>
      <PageHero
        badge="AI 導入支援 Landing"
        title="AI を、ビジネスの武器に。"
        highlight="ビジネスの武器"
        desc="チャットボット構築・業務自動化・データ分析。最新 AI で業務時間を平均 40% 削減。198,000 円〜・初回相談無料。"
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-10 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">Outcomes</p>
            <h2 className="font-display text-[26px] md:text-[40px] leading-[1.1] tracking-[-0.025em] text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-pink-400 bg-clip-text text-transparent">
                AI 導入で変わる 3 つの数字
              </span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {STATS.map((s, i) => (
              <FadeIn key={s.label} delay={i * 0.1}>
                <div className="paradigm-glass rounded-2xl p-6 paradigm-glow-sm hover:paradigm-glow-lg hover:-translate-y-1 transition-all duration-500 h-full">
                  <p className="font-display text-[40px] md:text-[56px] leading-[0.95] tracking-[-0.03em] mb-3">
                    <span className={`bg-gradient-to-br ${s.gradient} bg-clip-text text-transparent`}>{s.num}</span>
                  </p>
                  <p className="paradigm-eyebrow text-paradigm-accent mb-2">{s.label}</p>
                  <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft leading-[1.7]">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-50" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">FAQ</p>
            <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15] tracking-[-0.02em] text-paradigm-ink">専門知識は不要です</h2>
          </FadeIn>
          <ul className="space-y-3">
            {FAQS.map((f, i) => (
              <FadeIn key={f.q} delay={i * 0.08}>
                <li className="paradigm-glass rounded-2xl p-5 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500">
                  <p className="font-display text-[16px] md:text-[18px] leading-[1.3] text-paradigm-ink mb-2 tracking-[-0.01em]">{f.q}</p>
                  <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft leading-[1.75]">{f.a}</p>
                </li>
              </FadeIn>
            ))}
          </ul>
        </div>
      </section>

      <RichCtaBand
        eyebrow="Begin"
        title="AI 導入の第一歩を踏み出しませんか？"
        highlight="AI 導入"
        desc="無料相談で御社に最適な AI 活用プランをご提案します。"
        buttonLabel="無料相談を予約する"
      />
    </>
  )
}
