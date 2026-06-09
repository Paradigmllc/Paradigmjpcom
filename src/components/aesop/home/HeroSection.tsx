"use client"

import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import { ArrowRight } from "lucide-react"
import { useTypingEffect } from "./useTypingEffect"
import { NumberTicker } from "@/components/magicui/number-ticker"
import { Sparkles } from "@/components/magicui/sparkles"
import { Meteors } from "@/components/magicui/meteors"
import { ParadigmButton } from "@/components/paradigm-ui"

const EASE = [0.22, 1, 0.36, 1] as const

const HERO_VIDEO_URL =
  process.env.NEXT_PUBLIC_HERO_VIDEO_URL
  ?? "https://videos.pexels.com/video-files/3209663/3209663-uhd_2560_1440_25fps.mp4"

const STAT_DEFS = [
  { key: "support", to: 200, gradient: "from-fuchsia-400 via-paradigm-glow to-paradigm-tech" },
  { key: "retention", to: 98, gradient: "from-paradigm-tech via-paradigm-glow to-violet-400" },
  { key: "growth", to: 3, gradient: "from-paradigm-glow via-violet-400 to-fuchsia-400" },
  { key: "consult", to: 15, gradient: "from-violet-400 via-fuchsia-400 to-paradigm-tech" },
] as const

export default function HeroSection() {
  const t = useTranslations("home")
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] })
  const heroParallaxY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  const typingWords = (t.raw("heroTypingWords") as string[]) ?? []
  const typingText = useTypingEffect(typingWords, 90, 1800)

  return (
    <section
      ref={heroRef}
      className="relative min-h-[80vh] sm:min-h-[90vh] flex items-center bg-paradigm-ink overflow-hidden"
    >
      <motion.div style={{ y: heroParallaxY }} className="absolute inset-0 z-0">
        <div className="absolute inset-0 paradigm-mesh-vivid opacity-90" />
        <video autoPlay loop muted playsInline aria-hidden="true" tabIndex={-1} poster="/paper-grain.svg" preload="metadata"
          onError={(e) => { console.warn("[hero] video failed"); e.currentTarget.style.display = "none" }}
          className="absolute inset-0 w-full h-full object-cover motion-reduce:hidden">
          <source src={HERO_VIDEO_URL} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-paradigm-ink/80 via-paradigm-ink/65 to-transparent" />
      </motion.div>

      <div className="absolute inset-0 section-dots opacity-[0.04] pointer-events-none" />
      <Meteors number={10} color="rgba(167, 139, 250, 0.4)" />
      <Sparkles count={18} color="rgba(244, 114, 182, 0.4)" duration={4} />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div style={{ opacity: heroOpacity }}
            initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: EASE }}>

            <div className="inline-flex items-center gap-2.5 bg-paradigm-surface/10 backdrop-blur-sm border border-paradigm-line/20 rounded-full px-4 py-2 mb-8">
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-paradigm-accent to-paradigm-glow animate-pulse" />
              <span className="paradigm-eyebrow text-paradigm-paper/80 text-[10px]">{t("heroBadge")}</span>
            </div>

            <h1 style={{ fontSize: "clamp(2.2rem, 6.5vw, 4.5rem)" }}
              className="font-display leading-[1.1] tracking-[-0.04em] text-paradigm-paper mb-6">
              <span className="bg-gradient-to-r from-paradigm-paper via-paradigm-glow to-paradigm-tech bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradientShift_5s_ease_infinite]">
                {typingText}
              </span>
              <span aria-hidden className="inline-block w-[3px] h-[0.7em] bg-paradigm-glow ml-2 align-middle animate-[blink_1s_step-end_infinite] rounded-sm" />
              {" "}
              <span className="font-light text-paradigm-paper/80 text-[clamp(1rem,2.5vw,1.5rem)]">
                {t("heroSuffix")}
              </span>
            </h1>

            <p className="text-[13px] md:text-[14px] text-paradigm-paper/50 max-w-lg mb-4 leading-[1.7]">
              {t("heroBrandStory")}
            </p>

            <p className="text-[15px] md:text-[17px] text-paradigm-paper/70 max-w-lg mb-10 leading-[1.85] font-light">
              {t("heroSubheadline")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link href="/contact" legacyBehavior passHref>
                <ParadigmButton variant="glow" size="xl" asChild>
                  <a>{t("heroBookConsult")}<ArrowRight size={16} /></a>
                </ParadigmButton>
              </Link>
              <Link href="/services" legacyBehavior passHref>
                <ParadigmButton variant="secondary" size="xl" className="text-paradigm-paper border-paradigm-paper/15 hover:bg-paradigm-paper/8" asChild>
                  <a>{t("heroSeeServices")}</a>
                </ParadigmButton>
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {STAT_DEFS.map((s, i) => (
                <motion.div key={s.key} whileHover={{ y: -3, scale: 1.02 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="paradigm-glass rounded-xl px-3 py-4 text-center cursor-default paradigm-glow-sm">
                  <div className="font-display text-[22px] md:text-[28px] leading-none">
                    <span className={`bg-gradient-to-br ${s.gradient} bg-clip-text text-transparent`}>
                      <NumberTicker value={s.to} />
                    </span>
                    <span className="text-[10px] md:text-[12px] text-paradigm-paper/60 ml-0.5">{t(`stats.${s.key}.suffix`)}</span>
                  </div>
                  <div className="paradigm-eyebrow text-paradigm-paper/50 mt-1 text-[9px]">{t(`stats.${s.key}.label`)}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: EASE }}
            className="hidden lg:flex items-center justify-center">
            <div className="relative w-[380px] h-[380px]">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-paradigm-accent via-paradigm-glow to-paradigm-tech opacity-25 blur-3xl animate-[meshDrift_15s_ease-in-out_infinite]" />
              <div className="absolute inset-16 rounded-full border border-paradigm-paper/8 paradigm-glow-xl" />
              <div className="absolute inset-28 rounded-full bg-gradient-to-br from-paradigm-accent/15 to-paradigm-glow/8 backdrop-blur-sm border border-paradigm-paper/5" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-gradient-to-br from-paradigm-paper/5 to-transparent backdrop-blur-md border border-paradigm-paper/10 flex items-center justify-center">
                <span className="font-display text-[14px] text-paradigm-glow/50 tracking-[0.2em] uppercase">Paradigm</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-paradigm-paper to-transparent pointer-events-none" />
    </section>
  )
}
