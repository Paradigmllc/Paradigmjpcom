import type { Metadata } from "next"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"

export const metadata: Metadata = {
  title: "【無料診断】MEO対策 | Paradigm合同会社",
  description: "Googleマップで地域No.1へ。平均3ヶ月でTOP3表示を実現するMEO対策サービス。月額29,800円〜。初回無料診断実施中。",
}

const STATS = [
  { num: "TOP 3", label: "Google Maps 表示", desc: "地域検索で上位 3 位以内に表示。クリック率が大幅に向上します。", gradient: "from-pink-400 via-paradigm-accent to-paradigm-tech" },
  { num: "+30 件", label: "月間来店増加", desc: "実績平均。MEO 対策後 3 ヶ月で月間来店数が 30 件以上増加。", gradient: "from-paradigm-tech via-paradigm-glow to-violet-400" },
  { num: "3 ヶ月", label: "効果が出る目安", desc: "早い場合は 1 ヶ月。平均 3 ヶ月で TOP3 表示が見込めます。", gradient: "from-paradigm-glow via-violet-400 to-pink-400" },
] as const

const TARGETS = ["飲食店・カフェ", "美容室・サロン", "クリニック・歯科", "不動産", "整骨院・整体", "学習塾", "士業事務所", "ホテル・旅館"] as const

export default function MeoLP() {
  return (
    <>
      <PageHero
        badge="MEO 対策 Landing"
        title="地域 No.1 を、Google マップで。"
        highlight="地域 No.1"
        desc="平均 3 ヶ月で Google マップ TOP3 表示を実現。来店型ビジネスの集客を最大化。月額 29,800 円〜・初回無料診断実施中。"
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-10 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">Outcomes</p>
            <h2 className="font-display text-[26px] md:text-[40px] leading-[1.1] tracking-[-0.025em] text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
                MEO 対策で実現できること
              </span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {STATS.map((s, i) => (
              <FadeIn key={s.label} delay={i * 0.1}>
                <div className="paradigm-glass rounded-2xl p-6 paradigm-glow-sm hover:paradigm-glow-lg hover:-translate-y-1 transition-all duration-500 h-full">
                  <p className={`font-display text-[28px] md:text-[36px] leading-[1.05] mb-3`}>
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
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">Best Fit</p>
            <h2 className="font-display text-[26px] md:text-[36px] leading-[1.15] tracking-[-0.025em] text-paradigm-ink">
              こんな業種に最適です
            </h2>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
            {TARGETS.map((i, idx) => (
              <FadeIn key={i} delay={idx * 0.04}>
                <div className="paradigm-glass rounded-xl px-4 py-5 text-center text-[13px] md:text-[14px] text-paradigm-ink leading-[1.5] paradigm-glow-sm hover:paradigm-glow-md hover:-translate-y-0.5 transition-all duration-500">
                  {i}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <RichCtaBand
        eyebrow="Begin"
        title="まずは無料診断から"
        highlight="無料診断"
        desc="御社の Google ビジネスプロフィールを無料で診断します。"
        buttonLabel="無料診断を受ける"
      />
    </>
  )
}
