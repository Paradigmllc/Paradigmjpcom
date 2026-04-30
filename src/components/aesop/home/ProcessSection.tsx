"use client"

/**
 * ProcessSection — 4-step flow w/ AnimatedBeam (P18-D-8 right-sized).
 * Card title 24-26px → 18-20px / padding p-8 → p-5 / icon 12 → 11.
 */

import { useRef } from "react"
import { useTranslations, useLocale } from "next-intl"
import { motion } from "framer-motion"
import { Headphones, PenTool, Code2, TrendingUp } from "lucide-react"
import { AnimatedBeam } from "@/components/magicui/animated-beam"
import FadeIn from "@/components/aesop/FadeIn"

const EASE = [0.22, 1, 0.36, 1] as const

const STEPS_JA = [
  { key: "listen", icon: Headphones, gradient: "from-pink-400 to-paradigm-accent", title: "Listen", desc: "ヒアリングで現状と目標を整理" },
  { key: "design", icon: PenTool, gradient: "from-paradigm-accent to-paradigm-tech", title: "Design", desc: "戦略 + UX 設計 + ワイヤー" },
  { key: "build", icon: Code2, gradient: "from-paradigm-tech to-paradigm-glow", title: "Build", desc: "Next.js 実装 + AI 連携" },
  { key: "grow", icon: TrendingUp, gradient: "from-paradigm-glow to-pink-400", title: "Grow", desc: "PDCA + KPI 改善で伴走" },
] as const

const STEPS_EN = [
  { key: "listen", icon: Headphones, gradient: "from-pink-400 to-paradigm-accent", title: "Listen", desc: "Discover goals through deep interviews" },
  { key: "design", icon: PenTool, gradient: "from-paradigm-accent to-paradigm-tech", title: "Design", desc: "Strategy + UX architecture + wireframes" },
  { key: "build", icon: Code2, gradient: "from-paradigm-tech to-paradigm-glow", title: "Build", desc: "Next.js implementation + AI integration" },
  { key: "grow", icon: TrendingUp, gradient: "from-paradigm-glow to-pink-400", title: "Grow", desc: "PDCA + KPI optimisation as your partner" },
] as const

export default function ProcessSection() {
  const t = useTranslations("home")
  const locale = useLocale()
  const isJa = locale === "ja"
  const STEPS = isJa ? STEPS_JA : STEPS_EN

  const containerRef = useRef<HTMLDivElement>(null)
  const refs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]

  const heading = (() => { try { return t("processHeading") } catch { return isJa ? "御社のプロジェクトを成功に導く 4 ステップ。" : "Four steps to ship your project successfully." } })()
  const eyebrow = (() => { try { return t("processEyebrow") } catch { return "Process" } })()

  return (
    <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-50" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
        <FadeIn className="mb-10 max-w-2xl">
          <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{eyebrow}</p>
          <h2 className="font-display text-[26px] md:text-[40px] leading-[1.1] tracking-[-0.025em] text-paradigm-ink">
            <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
              {heading}
            </span>
          </h2>
        </FadeIn>

        <div ref={containerRef} className="relative grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {STEPS.map((s, idx) => {
            const Icon = s.icon
            return (
              <motion.div
                key={s.key}
                ref={refs[idx]}
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: idx * 0.12, ease: EASE }}
                className="relative paradigm-glass rounded-xl p-5 md:p-6 paradigm-glow-sm hover:paradigm-glow-md hover:-translate-y-1 transition-all duration-500"
              >
                <span className="absolute top-3 right-4 font-display text-[26px] md:text-[36px] leading-none text-paradigm-ink/10">
                  0{idx + 1}
                </span>
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${s.gradient} text-paradigm-paper mb-3 paradigm-glow-sm`}>
                  <Icon size={18} strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-[18px] md:text-[20px] leading-[1.2] text-paradigm-ink mb-1.5 tracking-[-0.015em]">
                  {s.title}
                </h3>
                <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft leading-[1.65]">
                  {s.desc}
                </p>
              </motion.div>
            )
          })}

          <div className="hidden md:block absolute inset-0 pointer-events-none">
            <AnimatedBeam containerRef={containerRef} fromRef={refs[0]} toRef={refs[1]} duration={4} curvature={-22} gradientStartColor="#f472b6" gradientStopColor="#6366f1" />
            <AnimatedBeam containerRef={containerRef} fromRef={refs[1]} toRef={refs[2]} duration={4} curvature={-22} delay={0.5} gradientStartColor="#6366f1" gradientStopColor="#0ea5e9" />
            <AnimatedBeam containerRef={containerRef} fromRef={refs[2]} toRef={refs[3]} duration={4} curvature={-22} delay={1.0} gradientStartColor="#0ea5e9" gradientStopColor="#a5b4fc" />
          </div>
        </div>
      </div>
    </section>
  )
}
