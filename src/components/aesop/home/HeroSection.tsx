"use client"

/**
 * HeroSection — cinematic video hero with parallax + gradient mesh + Sparkles.
 *
 * Visual layers (z-index ascending):
 *   0. Video background (Pexels Tokyo b-roll, parallax translateY)
 *   1. Gradient scrim (3-stop ink gradient + multiply mix)
 *   2. Animated gradient mesh (paradigm-mesh CSS class)
 *   3. Sparkles overlay (gold particles 22 個)
 *   4. Content (eyebrow / serif typing / subline / dual CTA / stats)
 *   5. Scroll cue
 */

import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import { ArrowRight } from "lucide-react"
import { useTypingEffect } from "./useTypingEffect"
import { NumberTicker } from "@/components/magicui/number-ticker"
import { Sparkles } from "@/components/magicui/sparkles"

const EASE = [0.22, 1, 0.36, 1] as const
const HERO_VIDEO_URL = "https://videos.pexels.com/video-files/3209663/3209663-uhd_2560_1440_25fps.mp4"

const STAT_DEFS = [
  { key: "support", to: 200 },
  { key: "retention", to: 98 },
  { key: "growth", to: 3 },
  { key: "consult", to: 15 },
] as const

export default function HeroSection() {
  const t = useTranslations("home")
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  })
  const heroParallaxY = useTransform(scrollYProgress, [0, 1], [0, 140])
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
        <div className="absolute inset-0 bg-gradient-to-b from-paradigm-ink/55 via-paradigm-ink/65 to-paradigm-ink/85" />
        <div className="absolute inset-0 bg-paradigm-ink/30 mix-blend-multiply" />
      </motion.div>

      {/* Gradient mesh layer */}
      <div className="paradigm-mesh" />

      {/* Sparkles overlay */}
      <Sparkles count={22} color="rgba(255, 215, 130, 0.55)" duration={3.5} />

      <motion.div
        style={{ opacity: heroOpacity }}
        className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 text-center pt-24 pb-16"
      >
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="paradigm-eyebrow text-paradigm-paper/70 mb-10 inline-flex items-center gap-2"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-paradigm-glow animate-pulse" />
          {t("heroBadge")}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.9, ease: EASE }}
          className="font-display text-[48px] md:text-[104px] leading-[1.02] tracking-[-0.03em] text-paradigm-paper mb-8"
        >
          <span className="block">
            <span className="bg-gradient-to-r from-paradigm-glow via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradientShift_6s_ease_infinite]">
              {typingText}
            </span>
            <span
              aria-hidden
              className="inline-block w-[2px] h-[0.78em] bg-paradigm-glow ml-2 align-middle animate-[blink_1s_step-end_infinite]"
            />
          </span>
          <span className="block font-light text-paradigm-paper/95">{t("heroSuffix")}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-[15px] md:text-[18px] text-paradigm-paper/75 max-w-2xl mx-auto mb-12 leading-[1.85]"
        >
          {t("heroSubheadline")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="flex items-center justify-center gap-3 md:gap-4 flex-wrap"
        >
          <Link
            href="/contact"
            className="group relative inline-flex items-center gap-2 bg-paradigm-paper text-paradigm-ink px-10 py-4 text-[12px] tracking-[0.18em] uppercase font-medium overflow-hidden hover:shadow-[0_0_40px_rgba(129,140,248,0.4)] transition-shadow"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-paradigm-glow via-paradigm-tech to-paradigm-glow bg-[length:200%_100%] animate-[gradientShift_3s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10">{t("heroBookConsult")}</span>
            <ArrowRight size={14} className="relative z-10 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/services"
            className="inline-flex items-center gap-2 border border-paradigm-paper/40 text-paradigm-paper/85 hover:border-paradigm-paper hover:text-paradigm-paper px-10 py-4 text-[12px] tracking-[0.18em] uppercase transition-colors backdrop-blur-sm"
          >
            {t("heroSeeServices")}
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 border-t border-paradigm-paper/20"
        >
          {STAT_DEFS.map((s, i) => (
            <div
              key={s.key}
              className={`px-4 py-6 text-center ${i > 0 ? "md:border-l border-paradigm-paper/20" : ""} ${
                i === 1 ? "border-l border-paradigm-paper/20 md:border-l" : ""
              } ${i === 2 ? "border-t md:border-t-0 border-paradigm-paper/20" : ""} ${
                i === 3 ? "border-t border-l md:border-t-0 border-paradigm-paper/20" : ""
              }`}
            >
              <div className="font-display text-[32px] md:text-[44px] text-paradigm-paper">
                <span className="bg-gradient-to-br from-paradigm-paper via-paradigm-glow to-paradigm-tech bg-clip-text text-transparent">
                  <NumberTicker value={s.to} />
                </span>
                <span className="text-[14px] md:text-[16px] text-paradigm-paper/70 ml-0.5">{t(`stats.${s.key}.suffix`)}</span>
              </div>
              <div className="paradigm-eyebrow text-paradigm-paper/55 mt-2">{t(`stats.${s.key}.label`)}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 paradigm-eyebrow text-paradigm-paper/50"
      >
        <span className="block animate-[blink_2.4s_ease-in-out_infinite]">↓ scroll</span>
      </motion.div>
    </section>
  )
}
