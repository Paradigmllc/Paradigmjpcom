"use client"

/**
 * CtaSection — closing cinematic band with Meteors + Sparkles + ShimmerButton.
 *
 * Last impression = max emotion. Full-viewport ink + animated mesh + meteors
 * 22 streaks + sparkles 16 + giant gradient headline + ShimmerButton primary.
 */

import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"
import { Meteors } from "@/components/magicui/meteors"
import { Sparkles } from "@/components/magicui/sparkles"
import FadeIn from "@/components/aesop/FadeIn"

const CTA_BULLET_KEYS = ["1", "2", "3"] as const

export default function CtaSection() {
  const t = useTranslations("home")

  return (
    <section className="relative bg-paradigm-ink text-paradigm-paper paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-90" />
      <Meteors number={22} color="rgba(255, 255, 255, 0.6)" />
      <Sparkles count={16} color="rgba(129, 140, 248, 0.55)" duration={3.5} />

      <FadeIn className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 text-center">
        <p className="paradigm-eyebrow text-paradigm-glow mb-6 inline-flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-paradigm-glow animate-pulse" />
          {t("ctaEyebrow")}
        </p>
        <h2 className="font-display text-[44px] md:text-[88px] leading-[1.02] tracking-[-0.03em] text-paradigm-paper mb-8">
          {t("ctaHeading")}
          <span className="bg-gradient-to-r from-paradigm-glow via-paradigm-tech to-paradigm-glow bg-[length:200%_100%] bg-clip-text text-transparent animate-[gradientShift_5s_linear_infinite]">
            {t("ctaHeadingHighlight")}
          </span>
          {t("ctaHeadingSuffix")}
        </h2>
        <p className="text-[16px] md:text-[18px] text-paradigm-paper/75 max-w-xl mx-auto mb-12 leading-[1.85]">
          {t("ctaSubheading")}
        </p>

        {/* Shimmer-style Link CTA: bg-paper foreground + animated highlight overlay */}
        <Link
          href="/contact"
          className="group relative inline-flex items-center gap-2 bg-paradigm-paper text-paradigm-ink px-12 py-5 text-[12px] tracking-[0.18em] uppercase font-medium overflow-hidden hover:shadow-[0_0_60px_rgba(129,140,248,0.5)] transition-shadow"
        >
          {/* Animated gradient sweep on hover */}
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-transparent via-paradigm-glow/40 to-transparent bg-[length:200%_100%] animate-[gradientShift_2.5s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity"
          />
          <span className="relative z-10">{t("ctaButton")}</span>
          <ArrowRight size={14} className="relative z-10 group-hover:translate-x-1 transition-transform" />
        </Link>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {CTA_BULLET_KEYS.map((k) => (
            <span key={k} className="paradigm-eyebrow text-paradigm-paper/55 inline-flex items-center gap-2">
              <span className="inline-block w-1 h-1 rounded-full bg-paradigm-glow" />
              {t(`ctaBullets.${k}`)}
            </span>
          ))}
        </div>
      </FadeIn>
    </section>
  )
}
