import type { Metadata } from "next"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import { SERVICES, PRICING } from "@/lib/data"

/**
 * /[locale]/services/meo — MEO 対策 detail (Aesop voice).
 *
 * 5-band: Hero → Overview → 4-step process → Pricing → CTA.
 * AE-PHP-1: 130 lines.
 */

export const metadata: Metadata = {
  title: "MEO対策",
  description: "Googleビジネスプロフィールの最適化で地域検索上位表示。来店型ビジネスの集客を最大化するMEO対策サービス。",
}

const PROCESS = [
  { step: "01", title: "現状分析", desc: "Googleビジネスプロフィールの現状を診断し、競合状況と改善ポイントを洗い出します。" },
  { step: "02", title: "プロフィール最適化", desc: "カテゴリ・属性・説明文・写真をSEO観点で最適化。NAP情報の統一も実施します。" },
  { step: "03", title: "口コミ施策+投稿運用", desc: "口コミ獲得の仕組みを構築し、定期的な投稿で鮮度を維持します。" },
  { step: "04", title: "効果測定・改善", desc: "順位トラッキングと月次レポートで効果を可視化。データに基づく改善を継続します。" },
] as const

export default function MeoServicePage() {
  const service = SERVICES.find((s) => s.id === "meo")!
  const pricing = PRICING.meo

  return (
    <>
      <PageHero
        badge="MEO 対策"
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
        <div className="max-w-4xl mx-auto px-6 md:px-12">
          <div className="mb-16 max-w-2xl">
            <p className="paradigm-eyebrow mb-5">Process</p>
            <h2 className="font-display text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink">
              MEO 対策の流れ
            </h2>
          </div>
          <ol className="border-t border-paradigm-line">
            {PROCESS.map((s) => (
              <li
                key={s.step}
                className="border-b border-paradigm-line py-8 grid grid-cols-1 md:grid-cols-[80px_1fr] gap-4"
              >
                <span className="font-display text-[28px] text-paradigm-ink-soft">
                  {s.step}
                </span>
                <div>
                  <h3 className="font-display text-[22px] md:text-[24px] leading-[1.2] text-paradigm-ink mb-3">
                    {s.title}
                  </h3>
                  <p className="text-[14px] text-paradigm-ink-soft leading-[1.85]">
                    {s.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
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
          <p className="paradigm-eyebrow text-paradigm-paper/60 mb-6">Begin</p>
          <h2 className="font-display text-[32px] md:text-[52px] leading-[1.1] tracking-[-0.015em] text-paradigm-paper mb-6">
            MEO 対策を始めませんか？
          </h2>
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/65 max-w-xl mx-auto mb-10 leading-[1.85]">
            地域 No.1 を目指す無料診断を実施中。
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 border border-paradigm-paper text-paradigm-paper px-10 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-paper hover:text-paradigm-ink transition-colors"
          >
            無料診断を受ける
          </Link>
        </div>
      </section>
    </>
  )
}
