"use client"

/**
 * StatsHeroicSection — full-band ink stats (P18-D-8 right-sized).
 * 128px → 56-72px / py-16 → py-10 / suffix 40px → 18-22px.
 */

import { useTranslations, useLocale } from "next-intl"
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
  const locale = useLocale()
  const isJa = locale === "ja"

  return (
    <section className="relative bg-paradigm-ink text-paradigm-paper paradigm-section overflow-hidden">
      <div className="paradigm-mesh-vivid opacity-60" />
      <Meteors number={16} color="rgba(165, 180, 252, 0.5)" />
      <Sparkles count={10} color="rgba(244, 114, 182, 0.4)" duration={4} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
        <FadeIn className="mb-10 text-center max-w-2xl mx-auto">
          <p className="paradigm-eyebrow text-paradigm-glow mb-3 inline-flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-paradigm-glow animate-pulse" />
            By the numbers
          </p>
          <h2 className="font-display text-[26px] md:text-[40px] leading-[1.1] tracking-[-0.025em] text-paradigm-paper">
            {isJa ? (
              <>
                実績で語る、
                <span className="bg-gradient-to-r from-pink-300 via-paradigm-glow to-paradigm-tech bg-clip-text text-transparent">
                  Paradigm の支援力。
                </span>
              </>
            ) : (
              <>
                Numbers that prove{" "}
                <span className="bg-gradient-to-r from-pink-300 via-paradigm-glow to-paradigm-tech bg-clip-text text-transparent">
                  Paradigm delivers.
                </span>
              </>
            )}
          </h2>
        </FadeIn>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {STAT_DEFS.map((s, i) => (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="paradigm-glass rounded-2xl px-5 py-7 md:py-9 text-center cursor-default paradigm-glow-md hover:paradigm-glow-lg transition-all duration-500"
            >
              <div className="font-display text-[40px] md:text-[64px] leading-[0.95] tracking-[-0.03em] mb-2">
                <span className={`bg-gradient-to-br ${s.gradient} bg-clip-text text-transparent inline-block`}>
                  <NumberTicker value={s.to} />
                </span>
                <span className="text-[16px] md:text-[20px] text-paradigm-paper/65 ml-0.5 align-top">
                  {t(`stats.${s.key}.suffix`)}
                </span>
              </div>
              <p className="paradigm-eyebrow text-paradigm-paper/55 text-[10px]">{t(`stats.${s.key}.label`)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
