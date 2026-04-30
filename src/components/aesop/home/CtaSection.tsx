"use client"

/**
 * CtaSection — closing band (P18-D-8 right-sized).
 * 112px → 40-60px / paragraph 20px → 14-16px / button px-12 → px-8.
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
      <div className="paradigm-mesh-vivid opacity-80" />
      <Meteors number={18} color="rgba(255, 255, 255, 0.55)" />
      <Sparkles count={14} color="rgba(244, 114, 182, 0.5)" duration={3.5} />

      <FadeIn className="relative z-10 max-w-3xl mx-auto px-6 md:px-8 text-center">
        <div className="inline-flex items-center gap-2 paradigm-glass rounded-full px-4 py-2 mb-5 paradigm-glow-sm">
          <SparkleIcon size={12} className="text-paradigm-glow" strokeWidth={2} />
          <span className="paradigm-eyebrow text-paradigm-paper">{t("ctaEyebrow")}</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-paradigm-glow animate-pulse" />
        </div>

        <h2 className="font-display text-[34px] md:text-[56px] leading-[1.05] tracking-[-0.03em] text-paradigm-paper mb-6">
          {t("ctaHeading")}
          <span className="block bg-gradient-to-r from-pink-300 via-paradigm-glow via-paradigm-tech to-paradigm-glow bg-[length:300%_100%] bg-clip-text text-transparent animate-[gradientShift_6s_ease_infinite]">
            {t("ctaHeadingHighlight")}
          </span>
          <span className="text-paradigm-paper/95">{t("ctaHeadingSuffix")}</span>
        </h2>

        <p className="text-[14px] md:text-[16px] text-paradigm-paper/80 max-w-lg mx-auto mb-9 leading-[1.8]">
          {t("ctaSubheading")}
        </p>

        <Link
          href="/contact"
          className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-paradigm-paper text-paradigm-ink text-[12px] tracking-[0.14em] uppercase font-semibold paradigm-glow-lg overflow-hidden hover:scale-[1.03] transition-transform"
        >
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-pink-300/0 via-paradigm-glow/40 via-paradigm-tech/0 to-pink-300/0 bg-[length:200%_100%] animate-[gradientShift_2.5s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity"
          />
          <span className="relative z-10">{t("ctaButton")}</span>
          <ArrowRight size={14} className="relative z-10 group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {CTA_BULLET_KEYS.map((k) => (
            <span key={k} className="paradigm-eyebrow text-paradigm-paper/60 inline-flex items-center gap-2 text-[10px]">
              <span className="inline-block w-1 h-1 rounded-full bg-gradient-to-br from-paradigm-glow to-paradigm-tech" />
              {t(`ctaBullets.${k}`)}
            </span>
          ))}
        </div>
      </FadeIn>
    </section>
  )
}
