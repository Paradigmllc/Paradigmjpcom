"use client"

import { Link } from "@/i18n/routing"
import FadeIn from "@/components/aesop/FadeIn"
import { useTranslations } from "next-intl"
import { ArrowRight, Check } from "lucide-react"

const CALL_HREF = "/contact?intent=call"
const PRICING_TIERS = ["essential", "growth", "scale"] as const
const PRICING_FEATURES = ["feature1", "feature2", "feature3"] as const

export default function HomeEnPricingSection() {
  const t = useTranslations("homeEn")

  return (
    <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-35" />
      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
        <FadeIn className="mb-10 max-w-2xl">
          <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("pricing.eyebrow")}</p>
          <h2 className="font-display text-[26px] md:text-[40px] leading-[1.12] tracking-[-0.025em] text-paradigm-ink">
            {t("pricing.heading")}
          </h2>
          <p className="text-[14px] text-paradigm-ink-soft leading-[1.8] mt-4">{t("pricing.sub")}</p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {PRICING_TIERS.map((tier, i) => {
            const isPopular = tier === "growth"
            return (
              <FadeIn key={tier} delay={i * 0.07}>
                <div
                  className={`relative h-full flex flex-col bg-paradigm-paper-card border rounded-2xl p-6 paradigm-glow-sm transition-all duration-500 ${
                    isPopular
                      ? "border-paradigm-accent/45 paradigm-glow-lg md:-translate-y-2"
                      : "border-paradigm-line hover:paradigm-glow-md hover:-translate-y-1"
                  }`}
                >
                  {isPopular && (
                    <span className="self-start mb-4 paradigm-eyebrow rounded-full bg-paradigm-accent text-paradigm-paper px-3 py-1 text-[10px]">
                      {t("pricing.popular")}
                    </span>
                  )}
                  <h3 className="font-display text-[22px] md:text-[26px] leading-[1.1] tracking-[-0.02em] text-paradigm-ink mb-3">
                    {t(`pricing.tiers.${tier}.name`)}
                  </h3>
                  <div className="mb-5 flex items-end gap-2">
                    <span className="font-display text-[40px] md:text-[46px] leading-none bg-gradient-to-br from-paradigm-accent via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
                      {t(`pricing.tiers.${tier}.price`)}
                    </span>
                    <span className="text-[12px] text-paradigm-ink-mute pb-1">{t("pricing.cycle")}</span>
                  </div>
                  <p className="text-[13px] text-paradigm-ink-soft leading-[1.7] mb-6">
                    {t(`pricing.tiers.${tier}.desc`)}
                  </p>
                  <ul className="border-t border-paradigm-line/60 mb-6 flex-1">
                    {PRICING_FEATURES.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 border-b border-paradigm-line/60 py-3 text-[12px] leading-[1.65] text-paradigm-ink-soft"
                      >
                        <Check size={14} className="mt-0.5 flex-shrink-0 text-paradigm-accent" strokeWidth={2.5} />
                        <span>{t(`pricing.tiers.${tier}.${feature}`)}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={CALL_HREF}
                    className={`mt-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[11px] tracking-[0.14em] uppercase font-semibold transition-colors ${
                      isPopular
                        ? "bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent"
                        : "paradigm-glass text-paradigm-ink-soft hover:text-paradigm-ink"
                    }`}
                  >
                    {t("pricing.cta")}
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </FadeIn>
            )
          })}
        </div>
        <p className="mt-6 paradigm-eyebrow text-paradigm-ink-mute text-center text-[10px]">
          {t("pricing.note")}
        </p>
      </div>
    </section>
  )
}
