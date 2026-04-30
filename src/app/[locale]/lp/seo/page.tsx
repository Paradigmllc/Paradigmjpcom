import type { Metadata } from "next"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import { BorderBeam } from "@/components/magicui/border-beam"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isJa = locale === "ja"
  return {
    title: isJa ? "【無料診断】SEO/GEO対策 | Paradigm合同会社" : "SEO / GEO free audit | Paradigm",
    description: isJa
      ? "従来のSEO+AI検索対応(GEO)の二刀流。オーガニック流入を平均2.5倍に。月額49,800円〜。"
      : "Conventional SEO + AI-search (GEO). Organic traffic 2.5x on average. From ¥49,800/mo.",
  }
}

export default async function SeoLP({ params }: Props) {
  const { locale } = await params
  const isJa = locale === "ja"
  return (
    <>
      <PageHero
        badge={isJa ? "SEO / GEO Landing" : "SEO / GEO Landing"}
        title={isJa ? "検索される仕組みを、つくる。" : "Build a discovery engine."}
        highlight={isJa ? "検索される仕組み" : "discovery engine"}
        desc={isJa ? "Google 検索 + AI 検索（ChatGPT/Gemini）の二刀流対策。オーガニック流入を平均 2.5 倍に。月額 49,800 円〜・無料サイト診断実施中。" : "Google + AI-search (ChatGPT / Gemini) dual strategy. Organic traffic 2.5x on average. From ¥49,800/mo, free audit included."}
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">Comparison</p>
            <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15] tracking-[-0.02em] text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
                {isJa ? "SEO だけでは、もう足りない" : "SEO alone isn't enough anymore."}
              </span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <FadeIn>
              <div className="paradigm-glass rounded-2xl p-6 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500 h-full">
                <p className="paradigm-eyebrow text-paradigm-ink-mute mb-3">Conventional</p>
                <h3 className="font-display text-[20px] md:text-[24px] leading-[1.15] text-paradigm-ink mb-3 tracking-[-0.015em]">
                  {isJa ? "従来の SEO" : "Conventional SEO"}
                </h3>
                <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft mb-4 leading-[1.7]">
                  {isJa ? "Google / Yahoo 検索での上位表示" : "Top rankings on Google / Yahoo"}
                </p>
                <p className="font-display text-[28px] text-paradigm-ink mb-1 tracking-[-0.02em]">
                  {isJa ? "平均 2.5 倍" : "2.5x average"}
                </p>
                <p className="paradigm-eyebrow text-paradigm-ink-mute text-[10px]">
                  {isJa ? "オーガニック流入増加" : "organic traffic uplift"}
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="relative paradigm-glass rounded-2xl p-6 paradigm-glow-md hover:paradigm-glow-lg transition-all duration-500 h-full border border-paradigm-accent/30">
                <BorderBeam size={200} duration={9} colorFrom="rgb(165 180 252)" colorTo="rgb(14 165 233)" borderWidth={1.5} />
                <p className="paradigm-eyebrow text-paradigm-accent mb-3 relative z-10">New</p>
                <h3 className="font-display text-[20px] md:text-[24px] leading-[1.15] text-paradigm-ink mb-3 tracking-[-0.015em] relative z-10">
                  <span className="bg-gradient-to-br from-paradigm-tech via-paradigm-glow to-paradigm-accent bg-clip-text text-transparent">
                    {isJa ? "GEO（AI 検索対応）" : "GEO (AI-search ready)"}
                  </span>
                </h3>
                <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft mb-4 leading-[1.7] relative z-10">
                  {isJa ? "ChatGPT / Gemini / Perplexity での推薦" : "Get recommended in ChatGPT / Gemini / Perplexity"}
                </p>
                <p className="font-display text-[28px] mb-1 tracking-[-0.02em] relative z-10">
                  <span className="bg-gradient-to-br from-paradigm-accent to-paradigm-tech bg-clip-text text-transparent">
                    {isJa ? "業界初" : "Industry first"}
                  </span>
                </p>
                <p className="paradigm-eyebrow text-paradigm-accent text-[10px] relative z-10">
                  {isJa ? "AI 検索最適化サービス" : "AI-search optimisation"}
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <RichCtaBand
        eyebrow="Future"
        title={isJa ? "AI 時代の検索対策、始めませんか？" : "Start your AI-era search strategy"}
        highlight={isJa ? "AI 時代の検索対策" : "AI-era search"}
        desc={isJa ? "無料の SEO / GEO 診断レポートをお送りします。" : "Free SEO / GEO audit report on request."}
        buttonLabel={isJa ? "無料診断を受ける" : "Get a free audit"}
      />
    </>
  )
}
