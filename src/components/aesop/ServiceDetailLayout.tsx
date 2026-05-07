"use client"

/**
 * ServiceDetailLayout — 4 service detail pages 共通テンプレート (P18-D-9).
 *
 * 構造: PageHero → Features grid → Pricing → CTA. 各 service は
 * gradient palette + middle band を props で差し替え。AE-PHP-1: 200 lines.
 */

import { Link } from "@/i18n/routing"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { useTranslations } from "next-intl"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import { BorderBeam } from "@/components/magicui/border-beam"

const EASE = [0.22, 1, 0.36, 1] as const

type Plan = {
  name: string
  desc: string
  price: string
  period: string
  features: readonly string[]
  popular?: boolean
}

interface ServiceDetailLayoutProps {
  badge: string
  title: string
  highlight?: string
  desc: string
  features: readonly string[]
  results: string
  plans: readonly Plan[]
  pricingFootnote: string
  iconBg: string
  beamFrom: string
  beamTo: string
  ctaTitle: string
  ctaHighlight?: string
  ctaDesc: string
  ctaLabel: string
  /** Optional middle band (e.g. process / use cases / comparison) */
  middleBand?: React.ReactNode
}

export default function ServiceDetailLayout({
  features,
  results,
  plans,
  pricingFootnote,
  iconBg,
  beamFrom,
  beamTo,
  ctaTitle,
  ctaHighlight,
  ctaDesc,
  ctaLabel,
  middleBand,
}: ServiceDetailLayoutProps) {
  const t = useTranslations("serviceDetailLayout")
  return (
    <>
      {/* Features */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-8">
            {features.map((f, i) => (
              <motion.div
                key={f}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.05, ease: EASE }}
                className="paradigm-glass rounded-xl p-4 paradigm-glow-sm hover:paradigm-glow-md hover:-translate-y-0.5 transition-all duration-500"
              >
                <span className={`inline-block w-2 h-2 rounded-full bg-gradient-to-br ${iconBg} mb-3`} />
                <p className="text-[13px] md:text-[14px] text-paradigm-ink leading-[1.65]">{f}</p>
              </motion.div>
            ))}
          </FadeIn>
          <FadeIn className="text-center mt-8">
            <p className="paradigm-eyebrow inline-block bg-gradient-to-r from-paradigm-accent via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent text-[14px] font-semibold">
              {results}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Optional middle band */}
      {middleBand}

      {/* Pricing */}
      <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-50" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("pricingEyebrow")}</p>
            <h2 className="font-display text-[26px] md:text-[40px] leading-[1.1] tracking-[-0.025em] text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-paradigm-tech bg-clip-text text-transparent">
                {t("pricingHeading")}
              </span>
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {plans.map((p, idx) => (
              <FadeIn key={p.name} delay={idx * 0.08}>
                <div
                  className={`relative paradigm-glass rounded-2xl p-6 md:p-7 paradigm-glow-sm hover:paradigm-glow-lg hover:-translate-y-1 transition-all duration-500 flex flex-col h-full ${
                    p.popular ? "border border-paradigm-accent/40" : ""
                  }`}
                >
                  {p.popular && (
                    <BorderBeam size={180} duration={9} colorFrom={beamFrom} colorTo={beamTo} borderWidth={1.5} />
                  )}
                  {p.popular && (
                    <p className="absolute top-4 right-4 paradigm-eyebrow text-paradigm-accent paradigm-glass rounded-full px-2.5 py-1 paradigm-glow-sm text-[10px]">
                      {t("popularBadge")}
                    </p>
                  )}
                  <h3 className="font-display text-[20px] md:text-[24px] leading-[1.15] text-paradigm-ink mb-1 tracking-[-0.015em] relative z-10">
                    {p.name}
                  </h3>
                  <p className="text-[12px] text-paradigm-ink-soft mb-5 leading-[1.65] relative z-10">{p.desc}</p>
                  <p className="font-display text-[28px] md:text-[34px] leading-none text-paradigm-ink mb-1 relative z-10">
                    <span className={`bg-gradient-to-br ${iconBg} bg-clip-text text-transparent`}>¥{p.price}</span>
                    <span className="text-[12px] font-sans text-paradigm-ink-soft ml-1">{p.period}</span>
                  </p>
                  <ul className="border-t border-paradigm-line/60 mt-5 mb-6 flex-1 relative z-10">
                    {p.features.map((f) => (
                      <li key={f} className="border-b border-paradigm-line/60 py-2.5 text-[12px] text-paradigm-ink-soft leading-[1.65]">
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/contact"
                    className={`relative z-10 mt-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[11px] tracking-[0.14em] uppercase font-semibold transition-colors ${
                      p.popular
                        ? "bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent"
                        : "paradigm-glass text-paradigm-ink-soft hover:text-paradigm-ink"
                    }`}
                  >
                    {t("consultButton")}
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
          <p className="mt-6 paradigm-eyebrow text-paradigm-ink-mute text-center text-[10px]">
            {pricingFootnote}
          </p>
        </div>
      </section>

      <RichCtaBand
        eyebrow="Begin"
        title={ctaTitle}
        highlight={ctaHighlight}
        desc={ctaDesc}
        buttonLabel={ctaLabel}
      />
    </>
  )
}
