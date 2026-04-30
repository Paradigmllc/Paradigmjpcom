"use client"

/**
 * ProcessSection — 4-step process flow with AnimatedBeam connectors.
 *
 * P18-D-7 NEW section. 4 nodes (Listen / Design / Build / Grow) connected
 * by AnimatedBeam arcs that pulse a gradient travelling between them.
 * Each node = rounded-2xl glass card with gradient icon + serif title.
 *
 * "How we work" の流れを視覚で見せて感動を作る storytelling band。
 */

import { useRef } from "react"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { Headphones, PenTool, Code2, TrendingUp } from "lucide-react"
import { AnimatedBeam } from "@/components/magicui/animated-beam"
import FadeIn from "@/components/aesop/FadeIn"

const EASE = [0.22, 1, 0.36, 1] as const

const STEPS = [
  { key: "listen", icon: Headphones, gradient: "from-pink-400 to-paradigm-accent", title: "Listen", desc: "ヒアリングで現状と目標を整理" },
  { key: "design", icon: PenTool, gradient: "from-paradigm-accent to-paradigm-tech", title: "Design", desc: "戦略 + UX 設計 + ワイヤー" },
  { key: "build", icon: Code2, gradient: "from-paradigm-tech to-paradigm-glow", title: "Build", desc: "Next.js 実装 + AI 連携" },
  { key: "grow", icon: TrendingUp, gradient: "from-paradigm-glow to-pink-400", title: "Grow", desc: "PDCA + KPI 改善で伴走" },
] as const

export default function ProcessSection() {
  const t = useTranslations("home")
  const containerRef = useRef<HTMLDivElement>(null)
  const refs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]

  // graceful fallback for translation keys that may not exist yet
  const heading = (() => { try { return t("processHeading") } catch { return "御社のプロジェクトを成功に導く 4 ステップ。" } })()
  const eyebrow = (() => { try { return t("processEyebrow") } catch { return "Process" } })()

  return (
    <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
      <div className="paradigm-mesh opacity-60" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        <FadeIn className="mb-20 max-w-3xl">
          <p className="paradigm-eyebrow mb-5 text-paradigm-accent">{eyebrow}</p>
          <h2 className="font-display text-[40px] md:text-[72px] leading-[1.02] tracking-[-0.03em] text-paradigm-ink">
            <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
              {heading}
            </span>
          </h2>
        </FadeIn>

        <div ref={containerRef} className="relative grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-8">
          {STEPS.map((s, idx) => {
            const Icon = s.icon
            return (
              <motion.div
                key={s.key}
                ref={refs[idx]}
                initial={{ opacity: 0, y: 32, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: idx * 0.15, ease: EASE }}
                className="relative paradigm-glass rounded-2xl p-6 md:p-8 paradigm-glow-md hover:paradigm-glow-lg hover:-translate-y-1 transition-all duration-500"
              >
                <span className="absolute top-5 right-5 font-display text-[40px] md:text-[56px] leading-none text-paradigm-ink/10">
                  0{idx + 1}
                </span>
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${s.gradient} text-paradigm-paper mb-5 paradigm-glow-md`}>
                  <Icon size={22} strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-[24px] md:text-[28px] leading-[1.15] text-paradigm-ink mb-2 tracking-[-0.02em]">
                  {s.title}
                </h3>
                <p className="text-[13px] md:text-[14px] text-paradigm-ink-soft leading-[1.75]">
                  {s.desc}
                </p>
              </motion.div>
            )
          })}

          {/* AnimatedBeam connectors (only on md+) */}
          <div className="hidden md:block absolute inset-0 pointer-events-none">
            <AnimatedBeam containerRef={containerRef} fromRef={refs[0]} toRef={refs[1]} duration={4} curvature={-30} gradientStartColor="#f472b6" gradientStopColor="#6366f1" />
            <AnimatedBeam containerRef={containerRef} fromRef={refs[1]} toRef={refs[2]} duration={4} curvature={-30} delay={0.5} gradientStartColor="#6366f1" gradientStopColor="#0ea5e9" />
            <AnimatedBeam containerRef={containerRef} fromRef={refs[2]} toRef={refs[3]} duration={4} curvature={-30} delay={1.0} gradientStartColor="#0ea5e9" gradientStopColor="#a5b4fc" />
          </div>
        </div>
      </div>
    </section>
  )
}
