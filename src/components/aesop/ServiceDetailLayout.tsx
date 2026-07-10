"use client"

/**
 * ServiceDetailLayout — 4 service detail pages 共通テンプレート (P18-D-9).
 *
 * 構造: PageHero → Features grid → Pricing → CTA. 各 service は
 * service pages share the same editorial grid, pricing, and CTA rhythm.
 */

import { Link } from "@/i18n/routing"
import { motion } from "framer-motion"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { useTranslations } from "next-intl"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"

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
  /** Optional stats/metrics band */
  stats?: readonly { value: string; label: string }[]
  statsEyebrow?: string
  statsTitle?: string
  /** Optional FAQ items */
  faqs?: readonly { question: string; answer: string }[]
  faqTitle?: string
}

export default function ServiceDetailLayout({
  badge,
  features,
  results,
  plans,
  pricingFootnote,
  ctaTitle,
  ctaHighlight,
  ctaDesc,
  ctaLabel,
  middleBand,
  stats,
  statsEyebrow,
  statsTitle,
  faqs,
  faqTitle,
}: ServiceDetailLayoutProps) {
  const t = useTranslations("serviceDetailLayout")
  return (
    <>
      {/* Features */}
      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8">
          <FadeIn className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-8">
            {features.map((f, i) => (
              <motion.div
                key={f}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.05, ease: EASE }}
                className="paradigm-glass rounded-lg p-4 transition-colors duration-300 hover:border-paradigm-ink/30"
              >
                <CheckCircle2 size={16} className="mb-3 text-paradigm-accent" aria-hidden />
                <p className="text-[13px] md:text-[14px] text-paradigm-ink leading-[1.65]">{f}</p>
              </motion.div>
            ))}
          </FadeIn>
          <FadeIn className="text-center mt-8">
            <p className="paradigm-eyebrow inline-block text-paradigm-accent text-[13px] font-semibold">
              {results}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Optional stats band */}
      {stats && stats.length > 0 && (
        <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
          <div className="absolute inset-0 paradigm-mesh opacity-35" />
          <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-8 text-center">
            {statsEyebrow && <p className="paradigm-eyebrow text-paradigm-accent mb-4">{statsEyebrow}</p>}
            {statsTitle && <h2 className="font-display text-[26px] md:text-[40px] leading-[1.15] text-paradigm-ink mb-10">{statsTitle}</h2>}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
              {stats.map((s, i) => (
                <motion.div key={`${s.value}-${s.label}`} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1, ease: EASE }}>
                  <div className="font-display text-[40px] md:text-[56px] leading-[1] mb-2 bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-paradigm-glow bg-clip-text text-transparent">{s.value}</div>
                  <div className="paradigm-eyebrow text-paradigm-ink-soft">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Optional middle band */}
      {middleBand}

      {/* Pricing */}
      <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("pricingEyebrow")}</p>
            <h2 className="font-display text-[26px] md:text-[40px] leading-[1.1] text-paradigm-ink">
              {t("pricingHeading")}
            </h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {plans.map((p, idx) => (
              <FadeIn key={p.name} delay={idx * 0.08}>
                <div
                  className={`relative paradigm-glass rounded-lg p-6 md:p-7 transition-colors duration-300 flex flex-col h-full ${
                    p.popular ? "border border-paradigm-accent/40" : ""
                  }`}
                >
                  {p.popular && (
                    <p className="absolute top-4 right-4 paradigm-eyebrow text-paradigm-accent border border-paradigm-accent/30 bg-paradigm-paper px-2.5 py-1 text-[10px]">
                      {t("popularBadge")}
                    </p>
                  )}
                  <h3 className="font-display text-[20px] md:text-[24px] leading-[1.15] text-paradigm-ink mb-1 relative z-10">
                    {p.name}
                  </h3>
                  <p className="text-[12px] text-paradigm-ink-soft mb-5 leading-[1.65] relative z-10">{p.desc}</p>
                  <p className="font-display text-[28px] md:text-[34px] leading-none text-paradigm-ink mb-1 relative z-10">
                    <span>¥{p.price}</span>
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
                        : "border border-paradigm-line text-paradigm-ink-soft hover:border-paradigm-ink hover:text-paradigm-ink"
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

      {/* Optional FAQ section */}
      {faqs && faqs.length > 0 && (
        <section className="bg-paradigm-paper paradigm-section relative overflow-hidden">
          <div className="max-w-3xl mx-auto px-6 md:px-12 relative z-10">
            {faqTitle && <h2 className="font-display text-[26px] md:text-[40px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink text-center mb-10">{faqTitle}</h2>}
            <ul className="border-t border-paradigm-line">
              {faqs.map((item, i) => (
                <li key={i} className="border-b border-paradigm-line">
                  <details className="group">
                    <summary className="cursor-pointer flex items-start gap-5 py-5 list-none [&::-webkit-details-marker]:hidden">
                      <span className="font-display text-[16px] md:text-[18px] leading-[1.4] text-paradigm-ink flex-1 pr-8">{item.question}</span>
                      <span aria-hidden className="shrink-0 text-paradigm-ink-mute mt-1.5 group-open:rotate-45 transition-transform text-[16px] leading-none">+</span>
                    </summary>
                    <div className="pl-1 pr-8 pb-5 -mt-1 text-[14px] text-paradigm-ink-soft leading-[1.85]">{item.answer}</div>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <RichCtaBand
        eyebrow={badge}
        title={ctaTitle}
        highlight={ctaHighlight}
        desc={ctaDesc}
        buttonLabel={ctaLabel}
      />
    </>
  )
}
