import type { Metadata } from "next"
import PageHero from "@/components/PageHero"
import ServiceDetailLayout from "@/components/aesop/ServiceDetailLayout"
import FadeIn from "@/components/aesop/FadeIn"
import { SERVICES, PRICING } from "@/lib/data"

export const metadata: Metadata = {
  title: "SEO/GEO対策",
  description: "従来のSEOに加え、ChatGPT/Gemini等のAI検索での表示最適化（GEO）にも対応。未来の検索に備えるSEO/GEO対策サービス。",
}

const SEO_FEATURES = ["キーワード調査+戦略設計", "コンテンツSEO（記事作成）", "内部・テクニカルSEO", "構造化データ実装"] as const
const GEO_FEATURES = ["AI検索での引用・推薦最適化", "エンティティSEO", "FAQ構造化", "信頼性シグナル強化"] as const

function ComparisonBand() {
  return (
    <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-40" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
        <FadeIn className="mb-8 max-w-2xl">
          <p className="paradigm-eyebrow text-paradigm-accent mb-3">Comparison</p>
          <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15] tracking-[-0.02em] text-paradigm-ink">
            <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
              SEO と GEO の違い
            </span>
          </h2>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <FadeIn>
            <div className="paradigm-glass rounded-2xl p-6 md:p-7 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500 h-full">
              <p className="paradigm-eyebrow text-paradigm-ink-mute mb-3">Conventional</p>
              <h3 className="font-display text-[18px] md:text-[22px] leading-[1.2] text-paradigm-ink mb-3 tracking-[-0.015em]">
                SEO（従来型）
              </h3>
              <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft mb-4 leading-[1.7]">
                Google/Yahoo 検索で上位表示を目指す施策。
              </p>
              <ul className="space-y-1.5">
                {SEO_FEATURES.map((f) => (
                  <li key={f} className="text-[12px] text-paradigm-ink-soft leading-[1.6] flex gap-2 items-start">
                    <span className="inline-block w-1 h-1 rounded-full bg-paradigm-ink-mute mt-1.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="relative paradigm-glass rounded-2xl p-6 md:p-7 paradigm-glow-md hover:paradigm-glow-lg transition-all duration-500 h-full border border-paradigm-accent/30">
              <p className="paradigm-eyebrow text-paradigm-accent mb-3">New</p>
              <h3 className="font-display text-[18px] md:text-[22px] leading-[1.2] text-paradigm-ink mb-3 tracking-[-0.015em]">
                <span className="bg-gradient-to-br from-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
                  GEO（AI 検索対応）
                </span>
              </h3>
              <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft mb-4 leading-[1.7]">
                ChatGPT/Gemini 等の AI 検索で推薦される施策。
              </p>
              <ul className="space-y-1.5">
                {GEO_FEATURES.map((f) => (
                  <li key={f} className="text-[12px] text-paradigm-ink-soft leading-[1.6] flex gap-2 items-start">
                    <span className="inline-block w-1 h-1 rounded-full bg-gradient-to-br from-paradigm-accent to-paradigm-tech mt-1.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="mt-5 paradigm-eyebrow text-paradigm-accent">Paradigm 独自サービス</p>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

export default function SeoServicePage() {
  const service = SERVICES.find((s) => s.id === "seo")!
  const pricing = PRICING.seo

  return (
    <>
      <PageHero
        badge="SEO / GEO 対策"
        title={service.title}
        highlight={service.title.includes("対策") ? "対策" : undefined}
        desc={service.tagline}
      />
      <ServiceDetailLayout
        badge="SEO / GEO 対策"
        title={service.title}
        desc={service.desc}
        features={service.features}
        results={service.results}
        plans={pricing.plans}
        pricingFootnote={pricing.monthly}
        iconBg="from-paradigm-glow via-violet-400 to-paradigm-accent"
        beamFrom="rgb(165 180 252)"
        beamTo="rgb(79 70 229)"
        middleBand={<ComparisonBand />}
        ctaTitle="AI 時代の検索対策、始めませんか？"
        ctaHighlight="AI 時代の検索対策"
        ctaDesc="SEO + GEO の無料サイト診断を実施中。"
        ctaLabel="無料診断を受ける"
      />
    </>
  )
}
