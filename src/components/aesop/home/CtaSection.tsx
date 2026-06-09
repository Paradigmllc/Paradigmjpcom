"use client"

import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { Meteors } from "@/components/magicui/meteors"
import { Sparkles } from "@/components/magicui/sparkles"
import { ParadigmButton } from "@/components/paradigm-ui"

const CTA_BULLET_KEYS = ["1", "2", "3"] as const
const EASE = [0.22, 1, 0.36, 1] as const

export default function CtaSection() {
  const t = useTranslations("home")

  return (
    <section className="relative bg-paradigm-ink paradigm-section overflow-hidden">
      <div className="paradigm-mesh-vivid opacity-80" />
      <div className="section-dots absolute inset-0 opacity-[0.06]" />
      <Meteors number={20} color="rgba(255, 255, 255, 0.45)" />
      <Sparkles count={16} color="rgba(244, 114, 182, 0.45)" duration={4} />

      <motion.div
        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }}
        className="relative z-10 max-w-3xl mx-auto px-6 md:px-8 text-center">

        <div className="inline-flex items-center gap-2.5 bg-paradigm-surface/10 backdrop-blur-sm border border-paradigm-line/20 rounded-full px-5 py-2.5 mb-8">
          <span className="w-2 h-2 rounded-full bg-gradient-to-r from-paradigm-accent to-paradigm-glow animate-pulse" />
          <span className="paradigm-eyebrow text-paradigm-paper/80 text-[10px]">{t("ctaEyebrow")}</span>
        </div>

        <h2 className="font-display text-[clamp(2rem,6vw,3.8rem)] leading-[1.04] tracking-[-0.04em] text-paradigm-paper mb-8">
          {t("ctaHeading")}{" "}
          <span className="block bg-gradient-to-r from-fuchsia-400 via-paradigm-glow via-paradigm-tech to-paradigm-glow bg-[length:300%_100%] bg-clip-text text-transparent animate-[gradientShift_6s_ease_infinite]">
            {t("ctaHeadingHighlight")}
          </span>
          <span className="text-paradigm-paper/90">{t("ctaHeadingSuffix")}</span>
        </h2>

        <p className="text-[16px] md:text-[18px] text-paradigm-paper/65 max-w-lg mx-auto mb-10 leading-[1.9] font-light">
          {t("ctaSubheading")}
        </p>

        <Link href="/contact" legacyBehavior passHref>
          <ParadigmButton variant="glow-dark" size="xl" asChild>
            <a>{t("ctaButton")}<ArrowRight size={16} /></a>
          </ParadigmButton>
        </Link>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {CTA_BULLET_KEYS.map((k) => (
            <span key={k} className="text-[11px] text-paradigm-paper/50 inline-flex items-center gap-2 font-medium tracking-[0.08em] uppercase">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-gradient-to-br from-paradigm-glow to-paradigm-tech" />
              {t(`ctaBullets.${k}`)}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
