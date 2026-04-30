import type { Metadata } from "next"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import { BorderBeam } from "@/components/magicui/border-beam"

export const metadata: Metadata = {
  title: "【無料診断】SEO/GEO対策 | Paradigm合同会社",
  description: "従来のSEO+AI検索対応(GEO)の二刀流。オーガニック流入を平均2.5倍に。月額49,800円〜。無料サイト診断実施中。",
}

export default function SeoLP() {
  return (
    <>
      <PageHero
        badge="SEO / GEO Landing"
        title="検索される仕組みを、つくる。"
        highlight="検索される仕組み"
        desc="Google 検索 + AI 検索（ChatGPT/Gemini）の二刀流対策。オーガニック流入を平均 2.5 倍に。月額 49,800 円〜・無料サイト診断実施中。"
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">Comparison</p>
            <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15] tracking-[-0.02em] text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
                SEO だけでは、もう足りない
              </span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <FadeIn>
              <div className="paradigm-glass rounded-2xl p-6 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500 h-full">
                <p className="paradigm-eyebrow text-paradigm-ink-mute mb-3">Conventional</p>
                <h3 className="font-display text-[20px] md:text-[24px] leading-[1.15] text-paradigm-ink mb-3 tracking-[-0.015em]">従来の SEO</h3>
                <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft mb-4 leading-[1.7]">Google / Yahoo 検索での上位表示</p>
                <p className="font-display text-[28px] text-paradigm-ink mb-1 tracking-[-0.02em]">平均 2.5 倍</p>
                <p className="paradigm-eyebrow text-paradigm-ink-mute text-[10px]">オーガニック流入増加</p>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="relative paradigm-glass rounded-2xl p-6 paradigm-glow-md hover:paradigm-glow-lg transition-all duration-500 h-full border border-paradigm-accent/30">
                <BorderBeam size={200} duration={9} colorFrom="rgb(165 180 252)" colorTo="rgb(14 165 233)" borderWidth={1.5} />
                <p className="paradigm-eyebrow text-paradigm-accent mb-3 relative z-10">New</p>
                <h3 className="font-display text-[20px] md:text-[24px] leading-[1.15] text-paradigm-ink mb-3 tracking-[-0.015em] relative z-10">
                  <span className="bg-gradient-to-br from-paradigm-tech via-paradigm-glow to-paradigm-accent bg-clip-text text-transparent">
                    GEO（AI 検索対応）
                  </span>
                </h3>
                <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft mb-4 leading-[1.7] relative z-10">
                  ChatGPT / Gemini / Perplexity での推薦
                </p>
                <p className="font-display text-[28px] mb-1 tracking-[-0.02em] relative z-10">
                  <span className="bg-gradient-to-br from-paradigm-accent to-paradigm-tech bg-clip-text text-transparent">業界初</span>
                </p>
                <p className="paradigm-eyebrow text-paradigm-accent text-[10px] relative z-10">AI 検索最適化サービス</p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <RichCtaBand
        eyebrow="Future"
        title="AI 時代の検索対策、始めませんか？"
        highlight="AI 時代の検索対策"
        desc="無料の SEO / GEO 診断レポートをお送りします。"
        buttonLabel="無料診断を受ける"
      />
    </>
  )
}
