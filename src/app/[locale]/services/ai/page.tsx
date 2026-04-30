import type { Metadata } from "next"
import PageHero from "@/components/PageHero"
import ServiceDetailLayout from "@/components/aesop/ServiceDetailLayout"
import FadeIn from "@/components/aesop/FadeIn"
import { SERVICES, PRICING } from "@/lib/data"

export const metadata: Metadata = {
  title: "AI導入支援",
  description: "ChatGPT/Gemini等の最新AIを業務に導入。チャットボット構築、業務自動化、データ分析で生産性を劇的に向上させます。",
}

const USE_CASES = [
  { tag: "Chatbot", gradient: "from-pink-400 to-paradigm-accent", title: "カスタマー対応の80%自動化", desc: "AIチャットボットにFAQを学習させ、問い合わせの8割を自動応答。人件費を大幅に削減。" },
  { tag: "Automation", gradient: "from-paradigm-accent to-paradigm-tech", title: "レポート作成時間を1/5に", desc: "月次レポートの作成をAIが自動化。データ収集から分析、グラフ作成まで一気通貫。" },
  { tag: "Content", gradient: "from-paradigm-tech to-paradigm-glow", title: "コンテンツ制作コスト60%減", desc: "ブログ記事のドラフトをAIが作成。人間が監修・仕上げるハイブリッド体制で品質を維持。" },
  { tag: "Analytics", gradient: "from-paradigm-glow to-pink-400", title: "売上予測精度が2倍に", desc: "過去の販売データをAIが分析し、需要予測の精度を大幅に向上。在庫ロスを最小化。" },
] as const

function UseCasesBand() {
  return (
    <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-40" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
        <FadeIn className="mb-8 max-w-2xl">
          <p className="paradigm-eyebrow text-paradigm-accent mb-3">Use Cases</p>
          <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15] tracking-[-0.02em] text-paradigm-ink">
            <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-pink-400 bg-clip-text text-transparent">
              AI 導入事例
            </span>
          </h2>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {USE_CASES.map((c, i) => (
            <FadeIn key={c.title} delay={i * 0.08}>
              <article className="paradigm-glass rounded-2xl p-5 md:p-6 paradigm-glow-sm hover:paradigm-glow-md hover:-translate-y-1 transition-all duration-500 h-full">
                <span className={`inline-block paradigm-eyebrow rounded-full px-2.5 py-1 text-[10px] bg-gradient-to-br ${c.gradient} text-paradigm-paper paradigm-glow-sm mb-3`}>
                  {c.tag}
                </span>
                <h3 className="font-display text-[16px] md:text-[20px] leading-[1.2] text-paradigm-ink mb-2 tracking-[-0.015em]">
                  {c.title}
                </h3>
                <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft leading-[1.7]">{c.desc}</p>
              </article>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function AiServicePage() {
  const service = SERVICES.find((s) => s.id === "ai")!
  const pricing = PRICING.ai

  return (
    <>
      <PageHero
        badge="AI 導入支援"
        title={service.title}
        highlight={service.title.includes("AI") ? "AI" : undefined}
        desc={service.tagline}
      />
      <ServiceDetailLayout
        badge="AI 導入支援"
        title={service.title}
        desc={service.desc}
        features={service.features}
        results={service.results}
        plans={pricing.plans}
        pricingFootnote={pricing.monthly}
        iconBg="from-paradigm-accent via-pink-400 to-orange-300"
        beamFrom="rgb(79 70 229)"
        beamTo="rgb(251 146 60)"
        middleBand={<UseCasesBand />}
        ctaTitle="AI 導入で業務を変えませんか？"
        ctaHighlight="AI 導入"
        ctaDesc="無料相談で AI 活用の可能性を診断します。"
        ctaLabel="無料相談を予約する"
      />
    </>
  )
}
