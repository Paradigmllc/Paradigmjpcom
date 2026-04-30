/**
 * /[locale]/lp/meo — MEO 対策専用 LP
 *
 * 役割:   MEO 対策専用 LP
 * 入力:   params.locale
 * 出力:   Pain → Solution → Plans → FAQ → CTA Band
 *
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isJa = locale === "ja"
  return {
    title: isJa ? "【無料診断】MEO対策 | Paradigm合同会社" : "MEO free audit | Paradigm",
    description: isJa
      ? "Googleマップで地域No.1へ。平均3ヶ月でTOP3表示を実現するMEO対策サービス。月額29,800円〜。初回無料診断実施中。"
      : "Win local on Google Maps. TOP3 listing in ~3 months. From ¥29,800/mo. Free audit available.",
  }
}

const STATS_JA = [
  { num: "TOP 3", label: "Google Maps 表示", desc: "地域検索で上位 3 位以内に表示。クリック率が大幅に向上します。", gradient: "from-pink-400 via-paradigm-accent to-paradigm-tech" },
  { num: "+30 件", label: "月間来店増加", desc: "実績平均。MEO 対策後 3 ヶ月で月間来店数が 30 件以上増加。", gradient: "from-paradigm-tech via-paradigm-glow to-violet-400" },
  { num: "3 ヶ月", label: "効果が出る目安", desc: "早い場合は 1 ヶ月。平均 3 ヶ月で TOP3 表示が見込めます。", gradient: "from-paradigm-glow via-violet-400 to-pink-400" },
] as const
const STATS_EN = [
  { num: "TOP 3", label: "Google Maps rank", desc: "Top 3 in local search. Click-through rates spike noticeably.", gradient: "from-pink-400 via-paradigm-accent to-paradigm-tech" },
  { num: "+30/mo", label: "More visits / month", desc: "Average client outcome: 30+ extra visits/month within 3 months.", gradient: "from-paradigm-tech via-paradigm-glow to-violet-400" },
  { num: "3 mo", label: "Time to results", desc: "Sometimes 1 month. Typically 3 months to TOP3 visibility.", gradient: "from-paradigm-glow via-violet-400 to-pink-400" },
] as const

const TARGETS_JA = ["飲食店・カフェ", "美容室・サロン", "クリニック・歯科", "不動産", "整骨院・整体", "学習塾", "士業事務所", "ホテル・旅館"] as const
const TARGETS_EN = ["Restaurants / cafés", "Hair salons / spas", "Clinics / dental", "Real estate", "Chiropractic / wellness", "Schools / tutors", "Professional services", "Hotels / inns"] as const

export default async function MeoLP({ params }: Props) {
  const { locale } = await params
  const isJa = locale === "ja"
  const STATS = isJa ? STATS_JA : STATS_EN
  const TARGETS = isJa ? TARGETS_JA : TARGETS_EN

  return (
    <>
      <PageHero
        badge={isJa ? "MEO 対策 Landing" : "MEO Landing"}
        title={isJa ? "地域 No.1 を、Google マップで。" : "Win local on Google Maps."}
        highlight={isJa ? "地域 No.1" : "Win local"}
        desc={isJa ? "平均 3 ヶ月で Google マップ TOP3 表示を実現。来店型ビジネスの集客を最大化。月額 29,800 円〜・初回無料診断実施中。" : "TOP3 Google Maps listing in ~3 months. Maximise foot-traffic conversions. From ¥29,800/mo, free audit included."}
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-10 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">Outcomes</p>
            <h2 className="font-display text-[26px] md:text-[40px] leading-[1.1] tracking-[-0.025em] text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
                {isJa ? "MEO 対策で実現できること" : "What MEO unlocks"}
              </span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {STATS.map((s, i) => (
              <FadeIn key={s.label} delay={i * 0.1}>
                <div className="paradigm-glass rounded-2xl p-6 paradigm-glow-sm hover:paradigm-glow-lg hover:-translate-y-1 transition-all duration-500 h-full">
                  <p className="font-display text-[28px] md:text-[36px] leading-[1.05] mb-3">
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
              {isJa ? "こんな業種に最適です" : "Industries that fit best"}
            </h2>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
            {TARGETS.map((i, idx) => (
              <FadeIn key={i} delay={idx * 0.04}>
                <div className="paradigm-glass rounded-xl px-4 py-5 text-center text-[13px] md:text-[14px] text-paradigm-ink leading-[1.5] paradigm-glow-sm hover:paradigm-glow-md hover:-translate-y-0.5 transition-all duration-500">{i}</div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <RichCtaBand
        eyebrow="Begin"
        title={isJa ? "まずは無料診断から" : "Start with a free audit"}
        highlight={isJa ? "無料診断" : "free audit"}
        desc={isJa ? "御社の Google ビジネスプロフィールを無料で診断します。" : "We'll audit your Google Business Profile on us."}
        buttonLabel={isJa ? "無料診断を受ける" : "Get a free audit"}
      />
    </>
  )
}
