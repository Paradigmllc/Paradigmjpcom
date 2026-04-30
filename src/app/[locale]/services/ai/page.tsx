import type { Metadata } from "next"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import { SERVICES, PRICING } from "@/lib/data"

/**
 * /[locale]/services/ai — AI 導入支援 detail (Aesop voice).
 *
 * 5-band: Hero → Overview → 4 use-cases → Pricing → CTA.
 * AE-PHP-1: 140 lines.
 */

export const metadata: Metadata = {
  title: "AI導入支援",
  description: "ChatGPT/Gemini等の最新AIを業務に導入。チャットボット構築、業務自動化、データ分析で生産性を劇的に向上させます。",
}

const USE_CASES = [
  { tag: "Chatbot", title: "カスタマー対応の80%自動化", desc: "AIチャットボットにFAQを学習させ、問い合わせの8割を自動応答。人件費を大幅に削減。" },
  { tag: "Automation", title: "レポート作成時間を1/5に", desc: "月次レポートの作成をAIが自動化。データ収集から分析、グラフ作成まで一気通貫。" },
  { tag: "Content", title: "コンテンツ制作コスト60%減", desc: "ブログ記事のドラフトをAIが作成。人間が監修・仕上げるハイブリッド体制で品質を維持。" },
  { tag: "Analytics", title: "売上予測精度が2倍に", desc: "過去の販売データをAIが分析し、需要予測の精度を大幅に向上。在庫ロスを最小化。" },
] as const

export default function AiServicePage() {
  const service = SERVICES.find((s) => s.id === "ai")!
  const pricing = PRICING.ai

  return (
    <>
      <PageHero
        badge="AI 導入支援"
        title={service.title}
        desc={service.tagline}
      />

      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-4xl mx-auto px-6 md:px-12">
          <p className="text-[15px] md:text-[17px] text-paradigm-ink-soft leading-[1.9] mb-12">
            {service.desc}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-paradigm-line">
            {service.features.map((f) => (
              <div
                key={f}
                className="bg-paradigm-paper px-5 py-6 text-[14px] text-paradigm-ink leading-[1.6]"
              >
                {f}
              </div>
            ))}
          </div>
          <p className="mt-12 paradigm-eyebrow text-paradigm-ink">
            {service.results}
          </p>
        </div>
      </section>

      <section className="bg-paradigm-paper-deep paradigm-section">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <div className="mb-16 max-w-2xl">
            <p className="paradigm-eyebrow mb-5">Use Cases</p>
            <h2 className="font-display text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink">
              AI 導入事例
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-paradigm-line">
            {USE_CASES.map((c) => (
              <article
                key={c.title}
                className="bg-paradigm-paper-deep p-9 md:p-10"
              >
                <p className="paradigm-eyebrow mb-4">{c.tag}</p>
                <h3 className="font-display text-[22px] md:text-[26px] leading-[1.25] text-paradigm-ink mb-3">
                  {c.title}
                </h3>
                <p className="text-[14px] text-paradigm-ink-soft leading-[1.85]">
                  {c.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="mb-16 max-w-2xl">
            <p className="paradigm-eyebrow mb-5">Pricing</p>
            <h2 className="font-display text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink">
              料金プラン
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-paradigm-line">
            {pricing.plans.map((p) => (
              <div key={p.name} className="bg-paradigm-paper p-8 md:p-10 flex flex-col">
                {p.popular && (
                  <p className="paradigm-eyebrow text-paradigm-accent mb-4">人気No.1</p>
                )}
                <h3 className="font-display text-[24px] md:text-[28px] leading-[1.2] text-paradigm-ink mb-2">
                  {p.name}
                </h3>
                <p className="text-[13px] text-paradigm-ink-soft mb-6 leading-[1.7]">{p.desc}</p>
                <p className="font-display text-[36px] text-paradigm-ink mb-1">
                  &yen;{p.price}
                  <span className="text-[14px] font-sans text-paradigm-ink-soft ml-1">
                    {p.period}
                  </span>
                </p>
                <ul className="border-t border-paradigm-line mt-6 mb-8 flex-1">
                  {p.features.map((f) => (
                    <li
                      key={f}
                      className="border-b border-paradigm-line py-3 text-[13px] text-paradigm-ink-soft leading-[1.7]"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/contact"
                  className={`mt-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-[12px] tracking-[0.18em] uppercase transition-colors ${
                    p.popular
                      ? "bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent"
                      : "border border-paradigm-line text-paradigm-ink-soft hover:border-paradigm-ink hover:text-paradigm-ink"
                  }`}
                >
                  相談する
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-10 paradigm-eyebrow text-paradigm-ink-soft">{pricing.monthly}</p>
        </div>
      </section>

      <section className="bg-paradigm-ink text-paradigm-paper paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
          <p className="paradigm-eyebrow text-paradigm-paper/60 mb-6">Transform</p>
          <h2 className="font-display text-[32px] md:text-[52px] leading-[1.1] tracking-[-0.015em] text-paradigm-paper mb-6">
            AI 導入で業務を変えませんか？
          </h2>
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/65 max-w-xl mx-auto mb-10 leading-[1.85]">
            無料相談で AI 活用の可能性を診断します。
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 border border-paradigm-paper text-paradigm-paper px-10 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-paper hover:text-paradigm-ink transition-colors"
          >
            無料相談を予約する
          </Link>
        </div>
      </section>
    </>
  )
}
