"use client"

/**
 * HeroSection — cinematic hero w/ balanced typography (P18-D-8 size leap-down).
 *
 * Sizing rules (Web standard):
 *   - h1: 40-72px (was 128px — too large)
 *   - body: 15-18px
 *   - badge / eyebrow: 11px
 *   - Stats numbers: 28-44px (was 52px)
 *   - CTA padding: px-8 py-4 (was px-10 py-5)
 *   - Section min-height: 88vh (was 100vh — over-immersive)
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
import { ParadigmButton } from "@/components/paradigm-ui"

const EASE = [0.22, 1, 0.36, 1] as const
// Hero video sources (priority order — Pexels CDN primary, mirror fallback).
// 2026-05-01 audit: 環境変数 NEXT_PUBLIC_HERO_VIDEO_URL で R2 / Cloudflare Stream
// 等の自社 CDN URL に置き換え可能。デフォルトは Pexels CDN にフォールバック。
const HERO_VIDEO_URL =
  process.env.NEXT_PUBLIC_HERO_VIDEO_URL
  ?? "https://videos.pexels.com/video-files/3209663/3209663-uhd_2560_1440_25fps.mp4"

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
  const heroParallaxY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  // 2026-05-13 audit fix: fallback を locale-neutral 空配列に変更。
  // messages/{12}.json には全 locale heroTypingWords があるため通常 fallback は発火しないが、
  // 万が一 t.raw が undefined を返した場合に旧 ["MEO対策"] は非 ja locale で JP leak を起こす。
  const typingWords = (t.raw("heroTypingWords") as string[]) ?? []
  const typingText = useTypingEffect(typingWords, 90, 1800)

  return (
    <section
      ref={heroRef}
      className="relative min-h-[88vh] flex items-center justify-center overflow-hidden bg-paradigm-ink"
    >
      <motion.div style={{ y: heroParallaxY }} className="absolute inset-0 z-0">
        {/* gradient mesh poster (LCP-stable・video が読込中もこちらが見える) */}
        <div className="absolute inset-0 paradigm-mesh-vivid opacity-90" />
        <video
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
          tabIndex={-1}
          poster="/paper-grain.svg"
          preload="metadata"
          onError={(e) => {
            // Pexels CDN が落ちても poster + meshグラデが見えるため graceful degrade。
            // eslint-disable-next-line no-console
            console.warn("[hero] video load failed, falling back to gradient", e)
            e.currentTarget.style.display = "none"
          }}
          className="absolute inset-0 w-full h-full object-cover motion-reduce:hidden"
        >
          <source src={HERO_VIDEO_URL} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-paradigm-ink/60 via-paradigm-ink/70 to-paradigm-ink/90" />
      </motion.div>

      <div className="paradigm-mesh-vivid" />
      <Meteors number={10} color="rgba(165, 180, 252, 0.5)" />
      <Sparkles count={18} color="rgba(255, 215, 130, 0.55)" duration={3.5} />

      <motion.div
        style={{ opacity: heroOpacity }}
        className="relative z-10 max-w-4xl mx-auto px-6 md:px-8 text-center pt-24 pb-12"
      >
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="inline-flex items-center gap-2 paradigm-glass rounded-full px-4 py-2 mb-7 paradigm-glow-sm"
        >
          <SparkleIcon size={12} className="text-paradigm-glow" strokeWidth={2} />
          <span className="paradigm-eyebrow text-paradigm-paper">{t("heroBadge")}</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-paradigm-glow animate-pulse" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.9, ease: EASE }}
          // clamp() で 320px 端末から 1440px+ までスムーズなレスポンシブ。
          // min: 32px (smol mobile折返し抑制) / preferred: 6vw / max: 64px (デスクトップ)
          style={{ fontSize: "clamp(2rem, 6vw, 4rem)" }}
          className="font-display leading-[1.05] tracking-[-0.025em] text-paradigm-paper mb-6"
        >
          <span className="block">
            <span className="bg-gradient-to-r from-pink-300 via-paradigm-glow via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent bg-[length:300%_100%] animate-[gradientShift_8s_ease_infinite]">
              {typingText}
            </span>
            <span
              aria-hidden
              className="inline-block w-[2px] h-[0.78em] bg-paradigm-glow ml-2 align-middle animate-[blink_1s_step-end_infinite] rounded-sm"
            />
          </span>
          <span className="block font-light text-paradigm-paper/95 mt-1">{t("heroSuffix")}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="text-[12px] md:text-[13px] text-paradigm-paper/50 max-w-lg mx-auto mb-6 leading-[1.7]"
        >
          {t("heroBrandStory")}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-[14px] md:text-[16px] text-paradigm-paper/80 max-w-xl mx-auto mb-10 leading-[1.8]"
        >
          {t("heroSubheadline")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="flex items-center justify-center gap-3 flex-wrap mb-14"
        >
          <Link href="/contact" legacyBehavior passHref>
            <ParadigmButton variant="glow" size="lg" asChild>
              <a>
                {t("heroBookConsult")}
                <ArrowRight size={14} />
              </a>
            </ParadigmButton>
          </Link>
          <Link href="/services" legacyBehavior passHref>
            <ParadigmButton variant="secondary" size="lg" className="text-paradigm-paper border-paradigm-paper/20 hover:bg-paradigm-paper/10" asChild>
              <a>{t("heroSeeServices")}</a>
            </ParadigmButton>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.7 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3"
        >
          {STAT_DEFS.map((s, i) => (
            <motion.div
              key={s.key}
              whileHover={{ y: -3, scale: 1.02 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="paradigm-glass rounded-xl px-3 py-4 text-center cursor-default paradigm-glow-sm"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="font-display text-[24px] md:text-[32px] leading-none">
                <span className={`bg-gradient-to-br ${s.gradient} bg-clip-text text-transparent`}>
                  <NumberTicker value={s.to} />
                </span>
                <span className="text-[11px] md:text-[13px] text-paradigm-paper/65 ml-0.5">{t(`stats.${s.key}.suffix`)}</span>
              </div>
              <div className="paradigm-eyebrow text-paradigm-paper/55 mt-1.5 text-[10px]">{t(`stats.${s.key}.label`)}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 paradigm-eyebrow text-paradigm-paper/45 flex flex-col items-center gap-2 text-[10px]"
      >
        <span className="block">scroll</span>
        <span className="block w-px h-8 bg-gradient-to-b from-paradigm-paper/50 to-transparent" />
      </motion.div>
    </section>
  )
}
