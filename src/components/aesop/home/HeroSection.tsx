"use client"

/**
 * HeroSection — cinematic premium hero (P18-D-7 quality leap).
 *
 * Visual layers:
 *   0. Pexels 4K video bg (parallax translateY 0→160)
 *   1. 3-stop ink gradient scrim
 *   2. paradigm-mesh-vivid (rainbow drift 18s)
 *   3. Sparkles 28 (gold) + Meteors 14 (indigo)
 *   4. Content w/ 128px display + glow-text + multi-color gradient
 *   5. Glassmorphism stat cards (rounded-2xl + backdrop-blur)
 *   6. Magnetic gradient-border CTA + soft outline
 */

import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import { ArrowRight, Sparkles as SparkleIcon } from "lucide-react"
import { useTypingEffect } from "./useTypingEffect"
import { NumberTicker } from "@/components/magicui/number-ticker"
import { Sparkles } from "@/components/magicui/sparkles"
import { Meteors } from "@/components/magicui/meteors"

const EASE = [0.22, 1, 0.36, 1] as const
const HERO_VIDEO_URL = "https://videos.pexels.com/video-files/3209663/3209663-uhd_2560_1440_25fps.mp4"

const STAT_DEFS = [
  { key: "support", to: 200, gradient: "from-pink-300 via-paradigm-glow to-paradigm-tech" },
  { key: "retention", to: 98, gradient: "from-paradigm-tech via-paradigm-glow to-violet-300" },
  { key: "growth", to: 3, gradient: "from-paradigm-glow via-violet-300 to-pink-300" },
  { key: "consult", to: 15, gradient: "from-violet-300 via-pink-300 to-paradigm-tech" },
] as const

export default function HeroSection() {
  const t = useTranslations("home")
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  })
  const heroParallaxY = useTransform(scrollYProgress, [0, 1], [0, 160])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  const typingWords = (t.raw("heroTypingWords") as string[]) ?? ["MEO対策"]
  const typingText = useTypingEffect(typingWords, 90, 1800)

  return (
    <section
      ref={heroRef}
      className="relative min-h-[100vh] flex items-center justify-center overflow-hidden bg-paradigm-ink"
    >
      <motion.div style={{ y: heroParallaxY }} className="absolute inset-0 z-0">
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
          <source src={HERO_VIDEO_URL} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-paradigm-ink/60 via-paradigm-ink/70 to-paradigm-ink/90" />
      </motion.div>

      <div className="paradigm-mesh-vivid" />
      <Meteors number={14} color="rgba(165, 180, 252, 0.55)" />
      <Sparkles count={28} color="rgba(255, 215, 130, 0.6)" duration={3.5} />

      <motion.div
        style={{ opacity: heroOpacity }}
        className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 text-center pt-24 pb-16"
      >
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="inline-flex items-center gap-2.5 paradigm-glass rounded-full px-5 py-2.5 mb-10 paradigm-glow-sm"
        >
          <SparkleIcon size={14} className="text-paradigm-glow" strokeWidth={2} />
          <span className="paradigm-eyebrow text-paradigm-paper">{t("heroBadge")}</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-paradigm-glow animate-pulse" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 1, ease: EASE }}
          className="font-display text-[56px] md:text-[128px] leading-[0.95] tracking-[-0.04em] text-paradigm-paper mb-10 paradigm-glow-text"
        >
          <span className="block">
            <span className="bg-gradient-to-r from-pink-300 via-paradigm-glow via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent bg-[length:300%_100%] animate-[gradientShift_8s_ease_infinite]">
              {typingText}
            </span>
            <span
              aria-hidden
              className="inline-block w-[3px] h-[0.8em] bg-paradigm-glow ml-2 align-middle animate-[blink_1s_step-end_infinite] rounded-sm"
            />
          </span>
          <span className="block font-light text-paradigm-paper/95 mt-2">{t("heroSuffix")}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-[16px] md:text-[20px] text-paradigm-paper/85 max-w-2xl mx-auto mb-14 leading-[1.85]"
        >
          {t("heroSubheadline")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="flex items-center justify-center gap-3 md:gap-4 flex-wrap mb-20"
        >
          <Link
            href="/contact"
            className="group relative inline-flex items-center gap-2.5 px-10 py-5 rounded-2xl bg-paradigm-paper text-paradigm-ink text-[13px] tracking-[0.16em] uppercase font-semibold paradigm-glow-lg overflow-hidden hover:scale-[1.03] transition-transform"
          >
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-r from-pink-300/0 via-paradigm-glow/40 to-paradigm-tech/0 bg-[length:200%_100%] animate-[gradientShift_2.5s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <span className="relative z-10">{t("heroBookConsult")}</span>
            <ArrowRight size={16} className="relative z-10 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/services"
            className="inline-flex items-center gap-2 paradigm-glass text-paradigm-paper hover:bg-paradigm-paper/15 px-10 py-5 rounded-2xl text-[13px] tracking-[0.16em] uppercase font-medium transition-colors"
          >
            {t("heroSeeServices")}
          </Link>
        </motion.div>

        {/* Glassmorphism stat cards (rounded + backdrop blur) */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.7 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
        >
          {STAT_DEFS.map((s, i) => (
            <motion.div
              key={s.key}
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="paradigm-glass rounded-2xl px-4 py-6 text-center cursor-default paradigm-glow-sm hover:paradigm-glow-md"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="font-display text-[36px] md:text-[52px] leading-[0.95]">
                <span className={`bg-gradient-to-br ${s.gradient} bg-clip-text text-transparent`}>
                  <NumberTicker value={s.to} />
                </span>
                <span className="text-[14px] md:text-[16px] text-paradigm-paper/65 ml-0.5">{t(`stats.${s.key}.suffix`)}</span>
              </div>
              <div className="paradigm-eyebrow text-paradigm-paper/55 mt-2">{t(`stats.${s.key}.label`)}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 paradigm-eyebrow text-paradigm-paper/50 flex flex-col items-center gap-2"
      >
        <span className="block">scroll</span>
        <span className="block w-px h-10 bg-gradient-to-b from-paradigm-paper/60 to-transparent" />
      </motion.div>
    </section>
  )
}
