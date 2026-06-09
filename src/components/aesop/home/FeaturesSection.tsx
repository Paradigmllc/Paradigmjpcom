"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Zap, Shield, Users, Sparkles as SparkleIcon } from "lucide-react"
import { Ripple } from "@/components/magicui/ripple"
import FadeIn from "@/components/aesop/FadeIn"
import { SectionHeader } from "@/components/paradigm-ui"

const EASE = [0.22, 1, 0.36, 1] as const

const FEATURES = [
  { key: "speed", icon: Zap, gradient: "from-fuchsia-400 via-paradigm-accent to-paradigm-tech" },
  { key: "guarantee", icon: Shield, gradient: "from-paradigm-tech via-paradigm-glow to-violet-400" },
  { key: "team", icon: Users, gradient: "from-paradigm-glow via-violet-400 to-paradigm-accent" },
  { key: "aiFusion", icon: SparkleIcon, gradient: "from-paradigm-accent via-fuchsia-400 to-amber-400" },
] as const

export default function FeaturesSection() {
  const t = useTranslations("home")

  return (
    <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-35" />
      <div className="section-dots absolute inset-0 opacity-40" />
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        <SectionHeader
          eyebrow={t("featuresEyebrow")}
          heading={t("featuresHeading")}
          headingClassName="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-fuchsia-400 bg-clip-text text-transparent"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {FEATURES.map((f, idx) => {
            const Icon = f.icon
            return (
              <motion.div key={f.key}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, delay: idx * 0.08, ease: EASE }}
                whileHover={{ y: -6 }}
                className="group relative paradigm-glass rounded-2xl border border-paradigm-line/60 p-6 md:p-7 overflow-hidden paradigm-glow-sm hover:paradigm-glow-lg hover:border-paradigm-accent/40 transition-all duration-500">
                
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl">
                  <Ripple mainCircleSize={140} mainCircleOpacity={0.12} numCircles={4} />
                </div>

                <div className="relative z-10">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} text-white mb-4 paradigm-glow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                    <Icon size={20} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display text-[19px] md:text-[22px] leading-[1.2] text-paradigm-ink mb-2 tracking-[-0.02em]">
                    {t(`features.${f.key}.title`)}
                  </h3>
                  <p className="text-[14px] text-paradigm-ink-soft leading-[1.75]">
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
