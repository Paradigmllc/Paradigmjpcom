import type { Metadata } from "next"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import { SERVICES, PRICING } from "@/lib/data"

/**
 * /[locale]/services/seo — SEO/GEO 対策 detail (Aesop voice).
 *
 * 5-band: Hero → Overview → SEO vs GEO 2-up comparison → Pricing → CTA.
 * AE-PHP-1: 145 lines.
 */

export const metadata: Metadata = {
  title: "SEO/GEO対策",
  description: "従来のSEOに加え、ChatGPT/Gemini等のAI検索での表示最適化（GEO）にも対応。未来の検索に備えるSEO/GEO対策サービス。",
}

const SEO_FEATURES = [
  "キーワード調査+戦略設計",
  "コンテンツSEO（記事作成）",
  "内部・テクニカルSEO",
  "構造化データ実装",
] as const

const GEO_FEATURES = [
  "AI検索での引用・推薦最適化",
  "エンティティSEO",
  "FAQ構造化",
  "信頼性シグナル強化",
] as const

export default function SeoServicePage() {
  const service = SERVICES.find((s) => s.id === "seo")!
  const pricing = PRICING.seo

  return (
    <>
      <PageHero
        badge="SEO / GEO 対策"
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
            <p className="paradigm-eyebrow mb-5">Comparison</p>
            <h2 className="font-display text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink">
              SEO と GEO の違い
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-paradigm-line">
            <div className="bg-paradigm-paper-deep p-9 md:p-10">
              <p className="paradigm-eyebrow mb-4">Conventional</p>
              <h3 className="font-display text-[24px] md:text-[28px] leading-[1.2] text-paradigm-ink mb-4">
                SEO（従来型）
              </h3>
              <p className="text-[14px] text-paradigm-ink-soft leading-[1.85] mb-6">
                Google/Yahoo 検索で上位表示を目指す施策。キーワード最適化、コンテンツ戦略、テクニカル SEO が柱。
              </p>
              <ul className="border-t border-paradigm-line">
                {SEO_FEATURES.map((f) => (
                  <li
                    key={f}
                    className="border-b border-paradigm-line py-3 text-[14px] text-paradigm-ink leading-[1.6]"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-paradigm-paper-deep p-9 md:p-10">
              <p className="paradigm-eyebrow text-paradigm-accent mb-4">New</p>
              <h3 className="font-display text-[24px] md:text-[28px] leading-[1.2] text-paradigm-ink mb-4">
                GEO（AI 検索対応）
              </h3>
              <p className="text-[14px] text-paradigm-ink-soft leading-[1.85] mb-6">
                ChatGPT/Gemini/Perplexity 等の AI 検索で推薦される施策。今後の検索の主流になると言われています。
              </p>
              <ul className="border-t border-paradigm-line">
                {GEO_FEATURES.map((f) => (
                  <li
                    key={f}
                    className="border-b border-paradigm-line py-3 text-[14px] text-paradigm-ink leading-[1.6]"
                  >
                    {f}
                  </li>
                ))}
              </ul>
              <p className="mt-6 paradigm-eyebrow text-paradigm-accent">
                Paradigm 独自サービス
              </p>
            </div>
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
                  <p className="paradigm-eyebrow text-paradigm-accent mb-4">おすすめ</p>
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
          <p className="paradigm-eyebrow text-paradigm-paper/60 mb-6">Future</p>
          <h2 className="font-display text-[32px] md:text-[52px] leading-[1.1] tracking-[-0.015em] text-paradigm-paper mb-6">
            AI 時代の検索対策、始めませんか？
          </h2>
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/65 max-w-xl mx-auto mb-10 leading-[1.85]">
            SEO + GEO の無料サイト診断を実施中。
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
