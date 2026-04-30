/**
 * /[locale]/services/ai — AI 導入支援サービス詳細
 *
 * 役割:   AI 導入支援サービス詳細
 * 入力:   params.locale
 * 出力:   ServiceDetailLayout + middleBand sections
 *
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import PageHero from "@/components/PageHero"
import ServiceDetailLayout from "@/components/aesop/ServiceDetailLayout"
import FadeIn from "@/components/aesop/FadeIn"
import { getServiceByKey, getPricingFor } from "@/lib/data"

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const isJa = locale === "ja"
  return {
    title: isJa ? "AI導入支援" : "AI Integration",
    description: isJa
      ? "ChatGPT/Gemini等の最新AIを業務に導入。チャットボット、業務自動化、データ分析で生産性を劇的に向上。"
      : "Bring ChatGPT / Gemini-class AI into your operations. Chatbots, automation, analytics.",
  }
}

const USE_CASES_JA = [
  { tag: "Chatbot", gradient: "from-pink-400 to-paradigm-accent", title: "カスタマー対応の80%自動化", desc: "AIチャットボットにFAQを学習させ、問い合わせの8割を自動応答。人件費を大幅に削減。" },
  { tag: "Automation", gradient: "from-paradigm-accent to-paradigm-tech", title: "レポート作成時間を1/5に", desc: "月次レポートの作成をAIが自動化。データ収集から分析、グラフ作成まで一気通貫。" },
  { tag: "Content", gradient: "from-paradigm-tech to-paradigm-glow", title: "コンテンツ制作コスト60%減", desc: "ブログ記事のドラフトをAIが作成。人間が監修・仕上げるハイブリッド体制で品質を維持。" },
  { tag: "Analytics", gradient: "from-paradigm-glow to-pink-400", title: "売上予測精度が2倍に", desc: "過去の販売データをAIが分析し、需要予測の精度を大幅に向上。在庫ロスを最小化。" },
] as const

const USE_CASES_EN = [
  { tag: "Chatbot", gradient: "from-pink-400 to-paradigm-accent", title: "80% of CS auto-answered", desc: "Train AI chatbot on FAQs. Eight out of ten inquiries answered automatically — major labour cost reduction." },
  { tag: "Automation", gradient: "from-paradigm-accent to-paradigm-tech", title: "5x faster reports", desc: "Monthly reports automated. Collection → analysis → charts, end-to-end." },
  { tag: "Content", gradient: "from-paradigm-tech to-paradigm-glow", title: "60% lower content cost", desc: "AI drafts blog articles. Humans review / polish — quality maintained at 40% the price." },
  { tag: "Analytics", gradient: "from-paradigm-glow to-pink-400", title: "2x sales forecast accuracy", desc: "AI analyses historical sales data. Demand forecasting accuracy doubles. Inventory waste minimised." },
] as const

function UseCasesBand({ isJa }: { isJa: boolean }) {
  const CASES = isJa ? USE_CASES_JA : USE_CASES_EN
  return (
    <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-40" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
        <FadeIn className="mb-8 max-w-2xl">
          <p className="paradigm-eyebrow text-paradigm-accent mb-3">Use Cases</p>
          <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15] tracking-[-0.02em] text-paradigm-ink">
            <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-pink-400 bg-clip-text text-transparent">
              {isJa ? "AI 導入事例" : "AI integration cases"}
            </span>
          </h2>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {CASES.map((c, i) => (
            <FadeIn key={c.title} delay={i * 0.08}>
              <article className="paradigm-glass rounded-2xl p-5 md:p-6 paradigm-glow-sm hover:paradigm-glow-md hover:-translate-y-1 transition-all duration-500 h-full">
                <span className={`inline-block paradigm-eyebrow rounded-full px-2.5 py-1 text-[10px] bg-gradient-to-br ${c.gradient} text-paradigm-paper paradigm-glow-sm mb-3`}>{c.tag}</span>
                <h3 className="font-display text-[16px] md:text-[20px] leading-[1.2] text-paradigm-ink mb-2 tracking-[-0.015em]">{c.title}</h3>
                <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft leading-[1.7]">{c.desc}</p>
              </article>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

export default async function AiServicePage({ params }: Props) {
  const { locale } = await params
  const isJa = locale === "ja"
  const service = getServiceByKey(locale, "ai")
  const pricing = getPricingFor(locale, "ai")
  return (
    <>
      <PageHero badge={isJa ? "AI 導入支援" : "AI Integration"} title={service.title} desc={service.tagline} />
      <ServiceDetailLayout
        badge={isJa ? "AI 導入支援" : "AI Integration"}
        title={service.title}
        desc={service.desc}
        features={service.features}
        results={service.results}
        plans={pricing.plans}
        pricingFootnote={pricing.monthly}
        locale={locale}
        iconBg="from-paradigm-accent via-pink-400 to-orange-300"
        beamFrom="rgb(79 70 229)"
        beamTo="rgb(251 146 60)"
        middleBand={<UseCasesBand isJa={isJa} />}
        ctaTitle={isJa ? "AI 導入で業務を変えませんか？" : "Transform your operations with AI"}
        ctaHighlight={isJa ? "AI 導入" : "AI"}
        ctaDesc={isJa ? "無料相談で AI 活用の可能性を診断します。" : "Free consultation to scope your AI roadmap."}
        ctaLabel={isJa ? "無料相談を予約する" : "Book a free consultation"}
      />
    </>
  )
}
