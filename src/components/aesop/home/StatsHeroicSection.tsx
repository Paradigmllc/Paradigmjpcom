"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { NumberTicker } from "@/components/magicui/number-ticker"
import { Meteors } from "@/components/magicui/meteors"
import { Sparkles } from "@/components/magicui/sparkles"
import FadeIn from "@/components/aesop/FadeIn"
import { SectionHeader } from "@/components/paradigm-ui"

const STAT_DEFS = [
  { key: "support", to: 4, gradient: "from-fuchsia-400 via-paradigm-accent to-paradigm-tech" },
  { key: "retention", to: 4, gradient: "from-paradigm-tech via-paradigm-glow to-fuchsia-400" },
  { key: "growth", to: 1, gradient: "from-paradigm-glow via-violet-400 to-paradigm-accent" },
  { key: "consult", to: 0, gradient: "from-paradigm-accent via-fuchsia-400 to-amber-400" },
] as const

const EASE = [0.22, 1, 0.36, 1] as const

export default function StatsHeroicSection() {
  const t = useTranslations("home")

  return (
    <section className="relative bg-paradigm-ink paradigm-section overflow-hidden">
      <div className="paradigm-mesh-vivid opacity-55" />
      <div className="section-dots absolute inset-0 opacity-[0.05]" />
      <Meteors number={14} color="rgba(167, 139, 250, 0.4)" />
      <Sparkles count={10} color="rgba(244, 114, 182, 0.35)" duration={4} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        <SectionHeader
          eyebrow={t("statsEyebrow")}
          heading={t("statsHeading") + t("statsHeadingHighlight")}
          align="center"
          eyebrowClassName="text-paradigm-glow"
          headingClassName="text-paradigm-paper"
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
          {STAT_DEFS.map((s, i) => (
            <motion.div key={s.key}
              initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
              whileHover={{ scale: 1.04, y: -6 }}
              className="paradigm-glass rounded-2xl px-5 py-8 text-center cursor-default paradigm-glow-md hover:paradigm-glow-lg transition-all duration-500">
              <div className="font-display text-[44px] md:text-[68px] leading-[0.9] tracking-[-0.04em] mb-2">
                <span className={`bg-gradient-to-br ${s.gradient} bg-clip-text text-transparent inline-block`}>
                  <NumberTicker value={s.to} />
                </span>
                <span className="text-[14px] md:text-[18px] text-paradigm-paper/55 ml-1 align-top">
                  {t(`stats.${s.key}.suffix`)}
                </span>
              </div>
              <p className="text-[11px] md:text-[12px] text-paradigm-paper/50 font-medium tracking-[0.12em] uppercase">
                {t(`stats.${s.key}.label`)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
