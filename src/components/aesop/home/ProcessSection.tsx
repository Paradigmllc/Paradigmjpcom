"use client"

import { useRef } from "react"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Headphones, PenTool, Code2, TrendingUp } from "lucide-react"
import { AnimatedBeam } from "@/components/magicui/animated-beam"
import FadeIn from "@/components/aesop/FadeIn"
import { SectionHeader } from "@/components/paradigm-ui"

const EASE = [0.22, 1, 0.36, 1] as const

const STEP_META = [
  { key: "listen", icon: Headphones, gradient: "from-fuchsia-400 to-paradigm-accent" },
  { key: "design", icon: PenTool,    gradient: "from-paradigm-accent to-paradigm-tech" },
  { key: "build",  icon: Code2,      gradient: "from-paradigm-tech to-paradigm-glow" },
  { key: "grow",   icon: TrendingUp, gradient: "from-paradigm-glow to-fuchsia-400" },
] as const

export default function ProcessSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const refs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]
  const t = useTranslations("home")

  return (
    <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-40" />
      <div className="section-dots absolute inset-0 opacity-40" />
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        <SectionHeader
          eyebrow={t("processEyebrow")}
          heading={t("processHeading")}
          headingClassName="bg-gradient-to-br from-paradigm-ink via-paradigm-accent to-paradigm-glow bg-clip-text text-transparent"
        />

        <div ref={containerRef} className="relative grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
          {STEP_META.map((s, idx) => {
            const Icon = s.icon
            return (
              <motion.div key={s.key} ref={refs[idx]}
                initial={{ opacity: 0, y: 28, scale: 0.95 }} whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: idx * 0.12, ease: EASE }}
                className="relative paradigm-glass rounded-2xl p-6 md:p-7 paradigm-glow-sm hover:paradigm-glow-md hover:-translate-y-1.5 transition-all duration-500">
                <span className="absolute top-4 right-5 font-display text-[28px] md:text-[40px] leading-none text-paradigm-ink/8">
                  0{idx + 1}
                </span>
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${s.gradient} text-white mb-4 paradigm-glow-sm`}>
                  <Icon size={20} strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-[19px] md:text-[22px] leading-[1.2] text-paradigm-ink mb-2 tracking-[-0.02em]">
                  {t(`process.${s.key}.title`)}
                </h3>
                <p className="text-[13px] md:text-[14px] text-paradigm-ink-soft leading-[1.7]">
                  {t(`process.${s.key}.desc`)}
                </p>
              </motion.div>
            )
          })}

          <div className="hidden md:block absolute inset-0 pointer-events-none">
            <AnimatedBeam containerRef={containerRef} fromRef={refs[0]} toRef={refs[1]} duration={4} curvature={-22} gradientStartColor="#ec4899" gradientStopColor="#8b5cf6" />
            <AnimatedBeam containerRef={containerRef} fromRef={refs[1]} toRef={refs[2]} duration={4} curvature={-22} delay={0.5} gradientStartColor="#8b5cf6" gradientStopColor="#f59e0b" />
            <AnimatedBeam containerRef={containerRef} fromRef={refs[2]} toRef={refs[3]} duration={4} curvature={-22} delay={1.0} gradientStartColor="#f59e0b" gradientStopColor="#c4b5fd" />
          </div>
        </div>
      </div>
    </section>
  )
}
