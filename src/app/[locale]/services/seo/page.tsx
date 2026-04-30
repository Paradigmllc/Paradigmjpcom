import type { Metadata } from "next"
import PageHero from "@/components/PageHero"
import ServiceDetailLayout from "@/components/aesop/ServiceDetailLayout"
import FadeIn from "@/components/aesop/FadeIn"
import { BorderBeam } from "@/components/magicui/border-beam"
import { getServiceByKey, getPricingFor } from "@/lib/data"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isJa = locale === "ja"
  return {
    title: isJa ? "SEO/GEO対策" : "SEO / GEO",
    description: isJa
      ? "従来のSEOに加え、ChatGPT/Gemini等のAI検索での表示最適化（GEO）にも対応。"
      : "Conventional SEO plus AI-search optimisation (GEO) for ChatGPT / Gemini.",
  }
}

const SEO_FEATURES_JA = ["キーワード調査+戦略設計", "コンテンツSEO（記事作成）", "内部・テクニカルSEO", "構造化データ実装"] as const
const GEO_FEATURES_JA = ["AI検索での引用・推薦最適化", "エンティティSEO", "FAQ構造化", "信頼性シグナル強化"] as const
const SEO_FEATURES_EN = ["Keyword strategy + research", "Content SEO (articles)", "Technical / on-page SEO", "Structured data"] as const
const GEO_FEATURES_EN = ["AI-search citation optimisation", "Entity SEO", "FAQ structuring", "Trust signal reinforcement"] as const

function ComparisonBand({ isJa }: { isJa: boolean }) {
  const SEO_FEATURES = isJa ? SEO_FEATURES_JA : SEO_FEATURES_EN
  const GEO_FEATURES = isJa ? GEO_FEATURES_JA : GEO_FEATURES_EN
  return (
    <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-40" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
        <FadeIn className="mb-8 max-w-2xl">
          <p className="paradigm-eyebrow text-paradigm-accent mb-3">Comparison</p>
          <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15] tracking-[-0.02em] text-paradigm-ink">
            <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
              {isJa ? "SEO と GEO の違い" : "SEO vs. GEO"}
            </span>
          </h2>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <FadeIn>
            <div className="paradigm-glass rounded-2xl p-6 md:p-7 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500 h-full">
              <p className="paradigm-eyebrow text-paradigm-ink-mute mb-3">Conventional</p>
              <h3 className="font-display text-[18px] md:text-[22px] leading-[1.2] text-paradigm-ink mb-3 tracking-[-0.015em]">
                {isJa ? "SEO（従来型）" : "SEO (Conventional)"}
              </h3>
              <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft mb-4 leading-[1.7]">
                {isJa ? "Google/Yahoo 検索で上位表示を目指す施策。" : "Rank top on Google / Yahoo search."}
              </p>
              <ul className="space-y-1.5">
                {SEO_FEATURES.map((f) => (
                  <li key={f} className="text-[12px] text-paradigm-ink-soft leading-[1.6] flex gap-2 items-start">
                    <span className="inline-block w-1 h-1 rounded-full bg-paradigm-ink-mute mt-1.5 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="relative paradigm-glass rounded-2xl p-6 md:p-7 paradigm-glow-md hover:paradigm-glow-lg transition-all duration-500 h-full border border-paradigm-accent/30">
              <BorderBeam size={200} duration={9} colorFrom="rgb(165 180 252)" colorTo="rgb(14 165 233)" borderWidth={1.5} />
              <p className="paradigm-eyebrow text-paradigm-accent mb-3 relative z-10">New</p>
              <h3 className="font-display text-[18px] md:text-[22px] leading-[1.2] text-paradigm-ink mb-3 tracking-[-0.015em] relative z-10">
                <span className="bg-gradient-to-br from-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
                  {isJa ? "GEO（AI 検索対応）" : "GEO (AI-search ready)"}
                </span>
              </h3>
              <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft mb-4 leading-[1.7] relative z-10">
                {isJa ? "ChatGPT/Gemini 等の AI 検索で推薦される施策。" : "Get recommended in ChatGPT / Gemini search."}
              </p>
              <ul className="space-y-1.5 relative z-10">
                {GEO_FEATURES.map((f) => (
                  <li key={f} className="text-[12px] text-paradigm-ink-soft leading-[1.6] flex gap-2 items-start">
                    <span className="inline-block w-1 h-1 rounded-full bg-gradient-to-br from-paradigm-accent to-paradigm-tech mt-1.5 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <p className="mt-5 paradigm-eyebrow text-paradigm-accent relative z-10">{isJa ? "Paradigm 独自サービス" : "Paradigm exclusive"}</p>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

export default async function SeoServicePage({ params }: Props) {
  const { locale } = await params
  const isJa = locale === "ja"
  const service = getServiceByKey(locale, "seo")
  const pricing = getPricingFor(locale, "seo")
  return (
    <>
      <PageHero badge={isJa ? "SEO / GEO 対策" : "SEO / GEO"} title={service.title} desc={service.tagline} />
      <ServiceDetailLayout
        badge={isJa ? "SEO / GEO 対策" : "SEO / GEO"}
        title={service.title}
        desc={service.desc}
        features={service.features}
        results={service.results}
        plans={pricing.plans}
        pricingFootnote={pricing.monthly}
        locale={locale}
        iconBg="from-paradigm-glow via-violet-400 to-paradigm-accent"
        beamFrom="rgb(165 180 252)"
        beamTo="rgb(79 70 229)"
        middleBand={<ComparisonBand isJa={isJa} />}
        ctaTitle={isJa ? "AI 時代の検索対策、始めませんか？" : "Start your AI-era search strategy"}
        ctaHighlight={isJa ? "AI 時代の検索対策" : "AI-era search"}
        ctaDesc={isJa ? "SEO + GEO の無料サイト診断を実施中。" : "Free SEO + GEO site audit available."}
        ctaLabel={isJa ? "無料診断を受ける" : "Get a free audit"}
      />
    </>
  )
}
