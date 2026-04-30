"use client"

/**
 * FeaturesSection — 4-up bento grid with gradient mesh + Ripple hover.
 *
 * 各カードに固有の gradient mesh + ripple 効果を hover で発火。
 * paper-deep 上のカードを border + shadow で立体化。
 */

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Zap, Shield, Users, Sparkles as SparkleIcon } from "lucide-react"
import { Ripple } from "@/components/magicui/ripple"
import FadeIn from "@/components/aesop/FadeIn"

const EASE = [0.22, 1, 0.36, 1] as const

const FEATURE_DEFS = [
  { key: "speed", icon: Zap, accentClass: "from-paradigm-accent to-paradigm-tech" },
  { key: "guarantee", icon: Shield, accentClass: "from-paradigm-tech to-paradigm-glow" },
  { key: "team", icon: Users, accentClass: "from-paradigm-glow to-paradigm-accent" },
  { key: "aiFusion", icon: SparkleIcon, accentClass: "from-paradigm-accent to-paradigm-glow" },
] as const

export default function FeaturesSection() {
  const t = useTranslations("home")

  return (
    <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-40" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        <FadeIn className="mb-16 max-w-3xl">
          <p className="paradigm-eyebrow text-paradigm-accent mb-5">{t("featuresEyebrow")}</p>
          <h2 className="font-display text-[36px] md:text-[64px] leading-[1.05] tracking-[-0.025em] text-paradigm-ink">
            {t("featuresHeading")}
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {FEATURE_DEFS.map((f, idx) => {
            const Icon = f.icon
            return (
              <motion.div
                key={f.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: idx * 0.08, ease: EASE }}
                className="group relative bg-paradigm-paper border border-paradigm-line p-8 md:p-10 overflow-hidden hover:-translate-y-1 hover:shadow-[0_24px_60px_-20px_rgba(79,70,229,0.20)] hover:border-paradigm-accent/40 transition-all duration-500"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                  <Ripple
                    mainCircleSize={140}
                    mainCircleOpacity={0.16}
                    numCircles={4}
                  />
                </div>

                <div className="relative z-10">
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 mb-6 bg-gradient-to-br ${f.accentClass} text-paradigm-paper`}
                  >
                    <Icon size={22} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display text-[24px] md:text-[28px] leading-[1.15] text-paradigm-ink mb-3 tracking-[-0.01em]">
                    {t(`features.${f.key}.title`)}
                  </h3>
                  <p className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.85]">
                    {t(`features.${f.key}.desc`)}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
