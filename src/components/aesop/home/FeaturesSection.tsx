"use client"

/**
 * FeaturesSection — 4-up grid w/ Ripple hover (P18-D-8 right-sized).
 * Title 30px → 20px / padding p-10 → p-5 / icon 14 → 11.
 */

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Zap, Shield, Users, Sparkles as SparkleIcon } from "lucide-react"
import { Ripple } from "@/components/magicui/ripple"
import FadeIn from "@/components/aesop/FadeIn"

const EASE = [0.22, 1, 0.36, 1] as const

const FEATURES = [
  { key: "speed", icon: Zap, gradient: "from-fuchsia-400 via-paradigm-accent to-paradigm-tech" },
  { key: "guarantee", icon: Shield, gradient: "from-paradigm-tech via-paradigm-glow to-violet-400" },
  { key: "team", icon: Users, gradient: "from-paradigm-glow via-violet-400 to-paradigm-accent" },
  { key: "aiFusion", icon: SparkleIcon, gradient: "from-paradigm-accent via-fuchsia-400 to-orange-300" },
] as const

export default function FeaturesSection() {
  const t = useTranslations("home")

  return (
    <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-40" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
        <FadeIn className="mb-10 max-w-2xl">
          <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("featuresEyebrow")}</p>
          <h2 className="font-display text-[26px] md:text-[40px] leading-[1.1] tracking-[-0.025em] text-paradigm-ink">
            <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-fuchsia-400 bg-clip-text text-transparent">
              {t("featuresHeading")}
            </span>
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {FEATURES.map((f, idx) => {
            const Icon = f.icon
            return (
              <motion.div
                key={f.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: idx * 0.07, ease: EASE }}
                whileHover={{ y: -4 }}
                className="group relative paradigm-glass rounded-2xl border border-paradigm-line p-5 md:p-6 overflow-hidden paradigm-glow-sm hover:paradigm-glow-lg hover:border-paradigm-accent/50 transition-all duration-500"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl">
                  <Ripple mainCircleSize={140} mainCircleOpacity={0.16} numCircles={4} />
                </div>

                <div className="relative z-10">
                  <div
                    className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${f.gradient} text-paradigm-paper mb-3.5 paradigm-glow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}
                  >
                    <Icon size={18} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display text-[18px] md:text-[20px] leading-[1.2] text-paradigm-ink mb-2 tracking-[-0.015em]">
                    {t(`features.${f.key}.title`)}
                  </h3>
                  <p className="text-[13px] text-paradigm-ink-soft leading-[1.7]">
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
