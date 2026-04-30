"use client"

/**
 * StatsHeroicSection — full-width ink band with massive gradient numbers.
 *
 * 既存 hero 内 stats とは別に、scroll の中盤で「数字でガツンと殴る」専用 band。
 * Meteors 背景 + 4 個の超大型 NumberTicker (display 100-140px) + gradient
 * mesh で「成果に対する説得」を視覚で先制する。
 */

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { NumberTicker } from "@/components/magicui/number-ticker"
import { Meteors } from "@/components/magicui/meteors"
import FadeIn from "@/components/aesop/FadeIn"

const STAT_DEFS = [
  { key: "support", to: 200 },
  { key: "retention", to: 98 },
  { key: "growth", to: 3 },
  { key: "consult", to: 15 },
] as const

const EASE = [0.22, 1, 0.36, 1] as const

export default function StatsHeroicSection() {
  const t = useTranslations("home")

  return (
    <section className="relative bg-paradigm-ink text-paradigm-paper paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-80" />
      <Meteors number={18} color="rgba(165, 180, 252, 0.45)" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        <FadeIn className="mb-20 text-center max-w-3xl mx-auto">
          <p className="paradigm-eyebrow text-paradigm-glow mb-5">By the numbers</p>
          <h2 className="font-display text-[32px] md:text-[56px] leading-[1.1] tracking-[-0.025em] text-paradigm-paper">
            実績で語る、Paradigm の支援力。
          </h2>
        </FadeIn>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-paradigm-paper/15">
          {STAT_DEFS.map((s, i) => (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: EASE }}
              className="bg-paradigm-ink/95 px-6 py-12 md:py-16 text-center group"
            >
              <div className="font-display text-[64px] md:text-[112px] leading-[0.95] tracking-[-0.04em] mb-4">
                <span className="bg-gradient-to-br from-paradigm-paper via-paradigm-glow to-paradigm-tech bg-clip-text text-transparent group-hover:from-paradigm-tech group-hover:to-paradigm-glow transition-all duration-700">
                  <NumberTicker value={s.to} />
                </span>
                <span className="text-[24px] md:text-[36px] text-paradigm-paper/65 ml-1 align-top">
                  {t(`stats.${s.key}.suffix`)}
                </span>
              </div>
              <p className="paradigm-eyebrow text-paradigm-paper/55">{t(`stats.${s.key}.label`)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
