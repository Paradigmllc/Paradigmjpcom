"use client"

/**
 * FeaturesSection — Bento grid w/ rounded-2xl glass cards + Ripple hover.
 *
 * P18-D-7 leap: rounded-2xl, gradient icon bg, glass surfaces, deeper glow.
 */

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Zap, Shield, Users, Sparkles as SparkleIcon } from "lucide-react"
import { Ripple } from "@/components/magicui/ripple"
import FadeIn from "@/components/aesop/FadeIn"

const EASE = [0.22, 1, 0.36, 1] as const

const FEATURES = [
  { key: "speed", icon: Zap, gradient: "from-pink-400 via-paradigm-accent to-paradigm-tech", accent: "text-pink-400" },
  { key: "guarantee", icon: Shield, gradient: "from-paradigm-tech via-paradigm-glow to-violet-400", accent: "text-paradigm-tech" },
  { key: "team", icon: Users, gradient: "from-paradigm-glow via-violet-400 to-paradigm-accent", accent: "text-violet-400" },
  { key: "aiFusion", icon: SparkleIcon, gradient: "from-paradigm-accent via-pink-400 to-orange-300", accent: "text-orange-400" },
] as const

export default function FeaturesSection() {
  const t = useTranslations("home")

  return (
    <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-50" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        <FadeIn className="mb-20 max-w-3xl">
          <p className="paradigm-eyebrow text-paradigm-accent mb-5">{t("featuresEyebrow")}</p>
          <h2 className="font-display text-[40px] md:text-[72px] leading-[1.02] tracking-[-0.03em] text-paradigm-ink">
            <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-pink-400 bg-clip-text text-transparent">
              {t("featuresHeading")}
            </span>
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {FEATURES.map((f, idx) => {
            const Icon = f.icon
            return (
              <motion.div
                key={f.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: idx * 0.08, ease: EASE }}
                whileHover={{ y: -6 }}
                className="group relative paradigm-glass rounded-2xl border border-paradigm-line p-8 md:p-10 overflow-hidden paradigm-glow-sm hover:paradigm-glow-xl hover:border-paradigm-accent/50 transition-all duration-500"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl">
                  <Ripple mainCircleSize={160} mainCircleOpacity={0.18} numCircles={5} />
                </div>

                <div className="relative z-10">
                  <div
                    className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${f.gradient} text-paradigm-paper mb-6 paradigm-glow-md group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}
                  >
                    <Icon size={24} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display text-[26px] md:text-[30px] leading-[1.1] text-paradigm-ink mb-3 tracking-[-0.02em]">
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
