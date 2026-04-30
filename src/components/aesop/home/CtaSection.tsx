"use client"

/**
 * CtaSection — closing cinematic with rainbow mesh + Meteors + ShimmerLink.
 *
 * P18-D-7 leap: rounded-2xl glass + paradigm-mesh-vivid + bigger headline +
 * gradient-border CTA + Sparkles overlay.
 */

import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { ArrowRight, Sparkles as SparkleIcon } from "lucide-react"
import { Meteors } from "@/components/magicui/meteors"
import { Sparkles } from "@/components/magicui/sparkles"
import FadeIn from "@/components/aesop/FadeIn"

const CTA_BULLET_KEYS = ["1", "2", "3"] as const

export default function CtaSection() {
  const t = useTranslations("home")

  return (
    <section className="relative bg-paradigm-ink text-paradigm-paper paradigm-section overflow-hidden">
      <div className="paradigm-mesh-vivid opacity-90" />
      <Meteors number={26} color="rgba(255, 255, 255, 0.65)" />
      <Sparkles count={20} color="rgba(244, 114, 182, 0.55)" duration={3.5} />

      <FadeIn className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 text-center">
        <div className="inline-flex items-center gap-2.5 paradigm-glass rounded-full px-5 py-2.5 mb-8 paradigm-glow-md">
          <SparkleIcon size={14} className="text-paradigm-glow" strokeWidth={2} />
          <span className="paradigm-eyebrow text-paradigm-paper">{t("ctaEyebrow")}</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-paradigm-glow animate-pulse" />
        </div>

        <h2 className="font-display text-[48px] md:text-[112px] leading-[0.95] tracking-[-0.04em] text-paradigm-paper mb-10 paradigm-glow-text">
          {t("ctaHeading")}
          <span className="block bg-gradient-to-r from-pink-300 via-paradigm-glow via-paradigm-tech to-paradigm-glow bg-[length:300%_100%] bg-clip-text text-transparent animate-[gradientShift_6s_ease_infinite]">
            {t("ctaHeadingHighlight")}
          </span>
          <span className="text-paradigm-paper/95">{t("ctaHeadingSuffix")}</span>
        </h2>

        <p className="text-[16px] md:text-[20px] text-paradigm-paper/80 max-w-xl mx-auto mb-14 leading-[1.85]">
          {t("ctaSubheading")}
        </p>

        <Link
          href="/contact"
          className="group relative inline-flex items-center gap-2.5 px-12 py-5 rounded-2xl bg-paradigm-paper text-paradigm-ink text-[13px] tracking-[0.16em] uppercase font-semibold paradigm-glow-xl overflow-hidden hover:scale-[1.04] transition-transform"
        >
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-pink-300/0 via-paradigm-glow/50 via-paradigm-tech/0 to-pink-300/0 bg-[length:200%_100%] animate-[gradientShift_2.5s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity"
          />
          <span className="relative z-10">{t("ctaButton")}</span>
          <ArrowRight size={16} className="relative z-10 group-hover:translate-x-1 transition-transform" />
        </Link>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {CTA_BULLET_KEYS.map((k) => (
            <span key={k} className="paradigm-eyebrow text-paradigm-paper/65 inline-flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-gradient-to-br from-paradigm-glow to-paradigm-tech" />
              {t(`ctaBullets.${k}`)}
            </span>
          ))}
        </div>
      </FadeIn>
    </section>
  )
}
