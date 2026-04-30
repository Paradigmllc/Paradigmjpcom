import type { Metadata } from "next"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import { SERVICES, PRICING } from "@/lib/data"

/**
 * /[locale]/services/web — Web 制作 detail (Aesop voice).
 *
 * P18-D-3 rewrite. 4-band: Hero → Overview features → Pricing 3-up
 * → CTA closing ink reverse. AE-PHP-1: 95 lines.
 */

export const metadata: Metadata = {
  title: "Web制作",
  description: "Next.js/WordPressによる高速・SEO最適化されたWebサイト制作。デザインからコーディング、公開後の運用まで一貫してサポートします。",
}

export default function WebServicePage() {
  const service = SERVICES.find((s) => s.id === "web")!
  const pricing = PRICING.web

  return (
    <>
      <PageHero
        badge="Web 制作"
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
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="mb-16 max-w-2xl">
            <p className="paradigm-eyebrow mb-5">Pricing</p>
            <h2 className="font-display text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink">
              料金プラン
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-paradigm-line">
            {pricing.plans.map((p) => (
              <div
                key={p.name}
                className="bg-paradigm-paper-deep p-8 md:p-10 flex flex-col"
              >
                {p.popular && (
                  <p className="paradigm-eyebrow text-paradigm-accent mb-4">
                    人気No.1
                  </p>
                )}
                <h3 className="font-display text-[24px] md:text-[28px] leading-[1.2] text-paradigm-ink mb-2">
                  {p.name}
                </h3>
                <p className="text-[13px] text-paradigm-ink-soft mb-6 leading-[1.7]">
                  {p.desc}
                </p>
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
          <p className="mt-10 paradigm-eyebrow text-paradigm-ink-soft">
            {pricing.monthly}
          </p>
        </div>
      </section>

      <section className="bg-paradigm-ink text-paradigm-paper paradigm-section">
        <div className="max-w-3xl mx-auto px-6 md:px-12 text-center">
          <p className="paradigm-eyebrow text-paradigm-paper/60 mb-6">Talk</p>
          <h2 className="font-display text-[32px] md:text-[52px] leading-[1.1] tracking-[-0.015em] text-paradigm-paper mb-6">
            Web 制作のご相談はこちら
          </h2>
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/65 max-w-xl mx-auto mb-10 leading-[1.85]">
            初回30分の無料オンライン相談を受け付けています。
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
