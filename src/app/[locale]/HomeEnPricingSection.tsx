"use client"

import { Link } from "@/i18n/routing"
import FadeIn from "@/components/aesop/FadeIn"
import { useTranslations } from "next-intl"
import { ArrowRight, Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SectionHeader } from "@/components/paradigm-ui"

const CALL_HREF = "/contact?intent=call"
const PRICING_TIERS = ["essential", "growth", "scale"] as const
const PRICING_FEATURES = ["feature1", "feature2", "feature3"] as const

export default function HomeEnPricingSection() {
  const t = useTranslations("homeEn")

  return (
    <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-35" />
      <div className="section-dots absolute inset-0 opacity-50" />
      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
        <SectionHeader
          eyebrow={t("pricing.eyebrow")}
          heading={t("pricing.heading")}
          description={t("pricing.sub")}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {PRICING_TIERS.map((tier, i) => {
            const isPopular = tier === "growth"
            return (
              <FadeIn key={tier} delay={i * 0.07}>
                <Card
                  className={`relative h-full flex flex-col rounded-2xl paradigm-glow-sm transition-all duration-500 ${
                    isPopular
                      ? "border-paradigm-accent/40 paradigm-glow-lg md:-translate-y-3 bg-paradigm-paper-card"
                      : "border-paradigm-line bg-paradigm-paper-card hover:paradigm-glow-md hover:-translate-y-1"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-paradigm-accent text-paradigm-paper hover:bg-paradigm-accent text-[10px] px-4 py-1 rounded-full font-medium">
                        {t("pricing.popular")}
                      </Badge>
                    </div>
                  )}
                  <CardContent className="flex flex-col h-full p-7 pt-8">
                    <h3 className="font-display text-[24px] md:text-[28px] leading-[1.1] tracking-[-0.02em] text-paradigm-ink mb-4">
                      {t(`pricing.tiers.${tier}.name`)}
                    </h3>
                    <div className="mb-6 flex items-end gap-2">
                      <span className="font-display text-[44px] md:text-[50px] leading-none bg-gradient-to-br from-paradigm-accent via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
                        {t(`pricing.tiers.${tier}.price`)}
                      </span>
                      <span className="text-[12px] text-paradigm-ink-mute pb-1.5">{t("pricing.cycle")}</span>
                    </div>
                    <p className="text-[13px] text-paradigm-ink-soft leading-[1.7] mb-7">
                      {t(`pricing.tiers.${tier}.desc`)}
                    </p>
                    <ul className="border-t border-paradigm-line/60 mb-8 flex-1">
                      {PRICING_FEATURES.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2.5 border-b border-paradigm-line/60 py-3 text-[12px] leading-[1.7] text-paradigm-ink-soft"
                        >
                          <Check size={14} className="mt-0.5 flex-shrink-0 text-paradigm-accent" strokeWidth={2.5} />
                          <span>{t(`pricing.tiers.${tier}.${feature}`)}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href={CALL_HREF} legacyBehavior passHref>
                      <a
                        className={`mt-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[11px] tracking-[0.14em] uppercase font-semibold transition-all duration-300 ${
                          isPopular
                            ? "bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent shadow-lg shadow-paradigm-accent/20"
                            : "bg-paradigm-paper-card border border-paradigm-line text-paradigm-ink-soft hover:text-paradigm-ink hover:border-paradigm-accent/30"
                        }`}
                      >
                        {t("pricing.cta")}
                        <ArrowRight size={13} />
                      </a>
                    </Link>
                  </CardContent>
                </Card>
              </FadeIn>
            )
          })}
        </div>
        <p className="mt-7 paradigm-eyebrow text-paradigm-ink-mute text-center text-[10px]">
          {t("pricing.note")}
        </p>
      </div>
    </section>
  )
}
