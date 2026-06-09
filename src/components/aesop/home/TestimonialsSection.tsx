"use client"

import { useTranslations } from "next-intl"
import { ShieldCheck, Star } from "lucide-react"
import FadeIn from "@/components/aesop/FadeIn"
import { Marquee } from "@/components/magicui/marquee"
import { GlowCard, SectionHeader } from "@/components/paradigm-ui"

const TRUST_BADGE_KEYS = ["1", "2", "3", "4"] as const

export default function TestimonialsSection() {
  const t = useTranslations("home")

  return (
    <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-35" />
      <div className="section-dots absolute inset-0 opacity-40" />
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        <SectionHeader
          eyebrow={t("testimonialsEyebrow")}
          heading={t("testimonialsHeading")}
          align="center"
          headingClassName="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-paradigm-glow bg-clip-text text-transparent"
        />

        <div className="max-w-3xl mx-auto">
          <FadeIn>
            <div className="paradigm-glass rounded-2xl p-8 md:p-10 paradigm-glow-md text-center border border-paradigm-line/50">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-paradigm-accent to-paradigm-glow text-white mb-6 paradigm-glow-md">
                <ShieldCheck size={26} strokeWidth={1.5} />
              </div>
              <p className="text-[15px] md:text-[17px] leading-[1.9] text-paradigm-ink-soft max-w-xl mx-auto mb-6">
                {t("testimonialsBody")}
              </p>
              <div className="flex items-center justify-center gap-1.5 text-amber-500">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
              </div>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.2} className="mt-10 max-w-4xl mx-auto">
          <div className="paradigm-glass rounded-2xl py-4 border border-paradigm-line/50">
            <Marquee duration={45} pauseOnHover className="text-paradigm-ink-soft">
              {TRUST_BADGE_KEYS.map((k) => (
                <span key={k} className="text-[12px] md:text-[14px] font-medium whitespace-nowrap inline-flex items-center gap-3 px-4">
                  <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-br from-paradigm-accent to-paradigm-glow" />
                  {t(`trustBadges.${k}`)}
                  <span className="text-paradigm-line">/</span>
                </span>
              ))}
            </Marquee>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
