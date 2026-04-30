import type { Metadata } from "next"
import { motion } from "framer-motion"
import PageHero from "@/components/PageHero"
import ServiceDetailLayout from "@/components/aesop/ServiceDetailLayout"
import FadeIn from "@/components/aesop/FadeIn"
import { SERVICES, PRICING } from "@/lib/data"

export const metadata: Metadata = {
  title: "MEO対策",
  description: "Googleビジネスプロフィールの最適化で地域検索上位表示。来店型ビジネスの集客を最大化するMEO対策サービス。",
}

const PROCESS = [
  { step: "01", title: "現状分析", desc: "Googleビジネスプロフィールの現状を診断し、競合状況と改善ポイントを洗い出します。" },
  { step: "02", title: "プロフィール最適化", desc: "カテゴリ・属性・説明文・写真を SEO 観点で最適化。NAP 情報の統一も実施します。" },
  { step: "03", title: "口コミ施策+投稿運用", desc: "口コミ獲得の仕組みを構築し、定期的な投稿で鮮度を維持します。" },
  { step: "04", title: "効果測定・改善", desc: "順位トラッキングと月次レポートで効果を可視化。データに基づく改善を継続します。" },
] as const

function ProcessBand() {
  return (
    <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-40" />
      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-8">
        <FadeIn className="mb-8 max-w-2xl">
          <p className="paradigm-eyebrow text-paradigm-accent mb-3">Process</p>
          <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15] tracking-[-0.02em] text-paradigm-ink">
            <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
              MEO 対策の流れ
            </span>
          </h2>
        </FadeIn>
        <ol className="space-y-3">
          {PROCESS.map((s, i) => (
            <FadeIn key={s.step} delay={i * 0.08}>
              <li className="paradigm-glass rounded-xl p-5 grid grid-cols-1 md:grid-cols-[60px_1fr] gap-3 paradigm-glow-sm hover:paradigm-glow-md hover:-translate-y-0.5 transition-all duration-500">
                <span className="font-display text-[24px] md:text-[28px] leading-none bg-gradient-to-br from-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
                  {s.step}
                </span>
                <div>
                  <h3 className="font-display text-[16px] md:text-[18px] leading-[1.2] text-paradigm-ink mb-1 tracking-[-0.01em]">
                    {s.title}
                  </h3>
                  <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft leading-[1.7]">{s.desc}</p>
                </div>
              </li>
            </FadeIn>
          ))}
        </ol>
      </div>
    </section>
  )
}

export default function MeoServicePage() {
  const service = SERVICES.find((s) => s.id === "meo")!
  const pricing = PRICING.meo

  return (
    <>
      <PageHero
        badge="MEO 対策"
        title={service.title}
        highlight={service.title.includes("対策") ? "対策" : undefined}
        desc={service.tagline}
      />
      <ServiceDetailLayout
        badge="MEO 対策"
        title={service.title}
        desc={service.desc}
        features={service.features}
        results={service.results}
        plans={pricing.plans}
        pricingFootnote={pricing.monthly}
        iconBg="from-paradigm-tech via-paradigm-glow to-violet-400"
        beamFrom="rgb(14 165 233)"
        beamTo="rgb(165 180 252)"
        middleBand={<ProcessBand />}
        ctaTitle="MEO 対策を始めませんか？"
        ctaHighlight="MEO 対策"
        ctaDesc="地域 No.1 を目指す無料診断を実施中。"
        ctaLabel="無料診断を受ける"
      />
    </>
  )
}
