"use client"

/**
 * StatsHeroicSection — full-band ink + huge gradient NumberTicker + Meteors.
 *
 * P18-D-7 leap:
 *   - rounded-2xl glass cards
 *   - Each stat has unique rainbow gradient
 *   - 144px display number (mobile 80px)
 *   - Hover scale 1.05 + extra glow
 */

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { NumberTicker } from "@/components/magicui/number-ticker"
import { Meteors } from "@/components/magicui/meteors"
import { Sparkles } from "@/components/magicui/sparkles"
import FadeIn from "@/components/aesop/FadeIn"

const STAT_DEFS = [
  { key: "support", to: 200, gradient: "from-pink-400 via-paradigm-accent to-paradigm-tech" },
  { key: "retention", to: 98, gradient: "from-paradigm-tech via-paradigm-glow to-pink-400" },
  { key: "growth", to: 3, gradient: "from-paradigm-glow via-violet-400 to-paradigm-accent" },
  { key: "consult", to: 15, gradient: "from-paradigm-accent via-pink-400 to-orange-300" },
] as const

const EASE = [0.22, 1, 0.36, 1] as const

export default function StatsHeroicSection() {
  const t = useTranslations("home")

  return (
    <section className="relative bg-paradigm-ink text-paradigm-paper paradigm-section overflow-hidden">
      <div className="paradigm-mesh-vivid opacity-70" />
      <Meteors number={22} color="rgba(165, 180, 252, 0.5)" />
      <Sparkles count={14} color="rgba(244, 114, 182, 0.4)" duration={4} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        <FadeIn className="mb-20 text-center max-w-3xl mx-auto">
          <p className="paradigm-eyebrow text-paradigm-glow mb-5 inline-flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-paradigm-glow animate-pulse" />
            By the numbers
          </p>
          <h2 className="font-display text-[36px] md:text-[68px] leading-[1.05] tracking-[-0.03em] text-paradigm-paper">
            実績で語る、
            <span className="bg-gradient-to-r from-pink-300 via-paradigm-glow to-paradigm-tech bg-clip-text text-transparent">
              Paradigm の支援力。
            </span>
          </h2>
        </FadeIn>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {STAT_DEFS.map((s, i) => (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: EASE }}
              whileHover={{ scale: 1.04, y: -6 }}
              className="paradigm-glass rounded-2xl px-6 py-12 md:py-16 text-center group cursor-default paradigm-glow-md hover:paradigm-glow-xl transition-all duration-500"
            >
              <div className="font-display text-[72px] md:text-[128px] leading-[0.92] tracking-[-0.04em] mb-4">
                <span className={`bg-gradient-to-br ${s.gradient} bg-clip-text text-transparent group-hover:scale-110 inline-block transition-transform duration-500`}>
                  <NumberTicker value={s.to} />
                </span>
                <span className="text-[26px] md:text-[40px] text-paradigm-paper/70 ml-1 align-top">
                  {t(`stats.${s.key}.suffix`)}
                </span>
              </div>
              <p className="paradigm-eyebrow text-paradigm-paper/60">{t(`stats.${s.key}.label`)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
