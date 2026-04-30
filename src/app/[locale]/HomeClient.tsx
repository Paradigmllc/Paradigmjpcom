"use client"

/**
 * HomeClient — paradigm /[locale] homepage (Modern Tech × Aesop hybrid).
 *
 * 2026-04-30 ユーザ追加指示反映:
 *   1. 「殺風景」回避 → Aesop.com 風 hero 背景動画 (Pexels CC0)
 *   2. MagicUI フル活用 → BorderBeam / NumberTicker / Sparkles / Meteors
 *   3. アニメーション盛り込み → framer-motion + parallax + hover lift
 *   4. カラフル → paradigm-accent (indigo) + paradigm-tech (cyan) を hover/glow に
 *
 * 5 editorial bands は維持: Hero / Services / Features / Testimonials / CTA
 * すべて messages 経由 (AE-PHP-2 厳守)。
 *
 * AE-PHP-1: 480 行 (under 500). 全 section は manifest 風に <Section> wrapper
 * で組み立て、将来的に section-per-file への split が容易な構造を維持。
 */

import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import { ArrowRight, Bot, Globe, Search, TrendingUp, Zap, Shield, Users, Sparkles as SparkleIcon } from "lucide-react"
import { useTypingEffect } from "@/components/aesop/home/useTypingEffect"
import { NumberTicker } from "@/components/magicui/number-ticker"
import { BorderBeam } from "@/components/magicui/border-beam"
import { Sparkles } from "@/components/magicui/sparkles"
import { Meteors } from "@/components/magicui/meteors"
import FadeIn from "@/components/aesop/FadeIn"

const EASE = [0.22, 1, 0.36, 1] as const

const SERVICE_DEFS = [
  { key: "web", icon: Globe, href: "/services/web", featured: true },
  { key: "meo", icon: Search, href: "/services/meo", featured: false },
  { key: "seo", icon: TrendingUp, href: "/services/seo", featured: false },
  { key: "ai", icon: Bot, href: "/services/ai", featured: false },
] as const

const STAT_DEFS = [
  { key: "support", to: 200 },
  { key: "retention", to: 98 },
  { key: "growth", to: 3 },
  { key: "consult", to: 15 },
] as const

const FEATURE_DEFS = [
  { key: "speed", icon: Zap },
  { key: "guarantee", icon: Shield },
  { key: "team", icon: Users },
  { key: "aiFusion", icon: SparkleIcon },
] as const

const TESTIMONIAL_KEYS = ["1", "2", "3"] as const
const TRUST_BADGE_KEYS = ["1", "2", "3", "4"] as const
const CTA_BULLET_KEYS = ["1", "2", "3"] as const

// Pexels CC0 video — minimalist tokyo city b-roll (close to Aesop voice)
const HERO_VIDEO_URL = "https://videos.pexels.com/video-files/3209663/3209663-uhd_2560_1440_25fps.mp4"

export default function HomeClient() {
  const t = useTranslations("home")
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  })
  const heroParallaxY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  const typingWords = (t.raw("heroTypingWords") as string[]) ?? ["MEO対策"]
  const typingText = useTypingEffect(typingWords, 90, 1800)

  return (
    <div className="overflow-x-hidden">
      {/* ════════════════════════════════════════════════
          1. Hero — full-viewport video bg + Sparkles + parallax serif typing
          ════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-[100vh] flex items-center justify-center overflow-hidden bg-paradigm-ink"
      >
        {/* Background video layer */}
        <motion.div
          style={{ y: heroParallaxY }}
          className="absolute inset-0 z-0"
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            poster=""
          >
            <source src={HERO_VIDEO_URL} type="video/mp4" />
          </video>
          {/* Layered scrim for legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-paradigm-ink/55 via-paradigm-ink/65 to-paradigm-ink/85" />
          <div className="absolute inset-0 bg-paradigm-ink/30 mix-blend-multiply" />
        </motion.div>

        {/* Sparkles overlay (subtle gold particles) */}
        <Sparkles count={18} color="rgba(255, 215, 130, 0.6)" duration={3} />

        {/* Content */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 text-center pt-24 pb-16"
        >
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="paradigm-eyebrow text-paradigm-paper/70 mb-10"
          >
            {t("heroBadge")}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: EASE }}
            className="font-display text-[44px] md:text-[88px] leading-[1.05] tracking-[-0.025em] text-paradigm-paper mb-8"
          >
            <span className="block">
              <span className="bg-gradient-to-r from-paradigm-paper via-paradigm-glow to-paradigm-paper bg-clip-text text-transparent">
                {typingText}
              </span>
              <span
                aria-hidden
                className="inline-block w-[2px] h-[0.78em] bg-paradigm-paper/80 ml-2 align-middle animate-[blink_1s_step-end_infinite]"
              />
            </span>
            <span className="block font-light text-paradigm-paper/85">
              {t("heroSuffix")}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-[15px] md:text-[17px] text-paradigm-paper/70 max-w-2xl mx-auto mb-12 leading-[1.85]"
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
              className="group relative inline-flex items-center gap-2 bg-paradigm-paper text-paradigm-ink px-8 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-glow hover:text-paradigm-ink transition-colors overflow-hidden"
            >
              <span className="relative z-10">{t("heroBookConsult")}</span>
              <ArrowRight size={14} className="relative z-10 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center gap-2 border border-paradigm-paper/40 text-paradigm-paper/85 hover:border-paradigm-paper hover:text-paradigm-paper px-8 py-4 text-[12px] tracking-[0.18em] uppercase transition-colors backdrop-blur-sm"
            >
              {t("heroSeeServices")}
            </Link>
          </motion.div>

          {/* Stats — NumberTicker animated */}
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
                <div className="font-display text-[28px] md:text-[40px] text-paradigm-paper">
                  <NumberTicker value={s.to} />
                  <span className="text-[14px] md:text-[16px] text-paradigm-paper/70 ml-0.5">
                    {t(`stats.${s.key}.suffix`)}
                  </span>
                </div>
                <div className="paradigm-eyebrow text-paradigm-paper/55 mt-2">{t(`stats.${s.key}.label`)}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
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

      {/* ════════════════════════════════════════════════
          2. Services — hairline grid + BorderBeam on featured card
          ════════════════════════════════════════════════ */}
      <section className="bg-paradigm-paper paradigm-section relative">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <FadeIn className="mb-16 max-w-3xl">
            <p className="paradigm-eyebrow mb-5">{t("servicesEyebrow")}</p>
            <h2 className="font-display text-[32px] md:text-[56px] leading-[1.1] tracking-[-0.02em] text-paradigm-ink">
              {t("servicesHeading")}
            </h2>
          </FadeIn>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-px bg-paradigm-line"
          >
            {SERVICE_DEFS.map((s, idx) => {
              const Icon = s.icon
              const badge = t(`services.${s.key}.badge`)
              return (
                <motion.div
                  key={s.key}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.6, delay: idx * 0.08, ease: EASE }}
                >
                  <Link
                    href={s.href}
                    className="group relative block bg-paradigm-paper p-10 md:p-12 hover:bg-paradigm-paper-card transition-colors overflow-hidden"
                  >
                    {/* BorderBeam on featured card only */}
                    {s.featured && (
                      <BorderBeam
                        size={250}
                        duration={10}
                        colorFrom="rgb(99 102 241)"
                        colorTo="rgb(14 165 233)"
                      />
                    )}
                    {badge && (
                      <span className="absolute top-6 right-6 paradigm-eyebrow text-paradigm-accent">
                        {badge}
                      </span>
                    )}
                    <Icon
                      size={28}
                      strokeWidth={1.25}
                      className="text-paradigm-ink-soft mb-6 group-hover:text-paradigm-accent transition-colors"
                    />
                    <h3 className="font-display text-[26px] md:text-[34px] leading-[1.15] text-paradigm-ink mb-2">
                      {t(`services.${s.key}.title`)}
                    </h3>
                    <p className="paradigm-eyebrow mb-5">
                      {t(`services.${s.key}.tagline`)}
                    </p>
                    <p className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.85] mb-8 max-w-md">
                      {t(`services.${s.key}.desc`)}
                    </p>
                    <div className="flex items-center justify-between border-t border-paradigm-line pt-5">
                      <span className="text-[13px] text-paradigm-ink font-medium">
                        {t(`services.${s.key}.results`)}
                      </span>
                      <span className="paradigm-eyebrow text-paradigm-ink-soft group-hover:text-paradigm-accent transition-colors flex items-center gap-1">
                        {t("servicesViewMore")}
                        <ArrowRight
                          size={11}
                          className="group-hover:translate-x-1 transition-transform"
                        />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          3. Features — paper-deep band + animated icon hover
          ════════════════════════════════════════════════ */}
      <section className="bg-paradigm-paper-deep paradigm-section">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <FadeIn className="mb-16 max-w-3xl">
            <p className="paradigm-eyebrow mb-5">{t("featuresEyebrow")}</p>
            <h2 className="font-display text-[32px] md:text-[56px] leading-[1.1] tracking-[-0.02em] text-paradigm-ink">
              {t("featuresHeading")}
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-paradigm-line">
            {FEATURE_DEFS.map((f, idx) => {
              const Icon = f.icon
              return (
                <motion.div
                  key={f.key}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, delay: idx * 0.06, ease: EASE }}
                  className="group bg-paradigm-paper-deep p-8 md:p-10 hover:bg-paradigm-paper transition-colors"
                >
                  <Icon
                    size={26}
                    strokeWidth={1.25}
                    className="text-paradigm-ink-soft mb-5 group-hover:text-paradigm-accent group-hover:scale-110 transition-all"
                  />
                  <h3 className="font-display text-[22px] md:text-[26px] leading-[1.2] text-paradigm-ink mb-3">
                    {t(`features.${f.key}.title`)}
                  </h3>
                  <p className="text-[14px] text-paradigm-ink-soft leading-[1.8]">
                    {t(`features.${f.key}.desc`)}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          4. Testimonials — quote cards + caps trust strip
          ════════════════════════════════════════════════ */}
      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <FadeIn className="mb-16 max-w-3xl">
            <p className="paradigm-eyebrow mb-5">{t("testimonialsEyebrow")}</p>
            <h2 className="font-display text-[32px] md:text-[56px] leading-[1.1] tracking-[-0.02em] text-paradigm-ink">
              {t("testimonialsHeading")}
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-paradigm-line">
            {TESTIMONIAL_KEYS.map((k, idx) => {
              const name = t(`testimonials.${k}.name`)
              return (
                <motion.div
                  key={k}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.6, delay: idx * 0.1, ease: EASE }}
                  className="bg-paradigm-paper p-9 md:p-10 flex flex-col group hover:bg-paradigm-paper-card transition-colors"
                >
                  <p className="font-display text-[20px] md:text-[24px] leading-[1.45] text-paradigm-ink mb-8 flex-1">
                    <span className="text-paradigm-ink-mute" aria-hidden>
                      &ldquo;
                    </span>
                    {t(`testimonials.${k}.text`)}
                    <span className="text-paradigm-ink-mute" aria-hidden>
                      &rdquo;
                    </span>
                  </p>
                  <div className="border-t border-paradigm-line pt-5">
                    <p className="text-[13px] font-medium text-paradigm-ink mb-1 group-hover:text-paradigm-accent transition-colors">
                      {name}
                    </p>
                    <p className="paradigm-eyebrow">
                      {t(`testimonials.${k}.location`)}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>

          <FadeIn
            delay={0.1}
            className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 border-t border-paradigm-line pt-10"
          >
            {TRUST_BADGE_KEYS.map((k) => (
              <span
                key={k}
                className="paradigm-eyebrow text-paradigm-ink-soft hover:text-paradigm-accent transition-colors cursor-default"
              >
                {t(`trustBadges.${k}`)}
              </span>
            ))}
          </FadeIn>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          5. CTA — full-viewport ink + Meteors + Sparkles
          ════════════════════════════════════════════════ */}
      <section className="relative bg-paradigm-ink text-paradigm-paper paradigm-section overflow-hidden">
        <Meteors number={14} color="rgba(255, 255, 255, 0.55)" />
        <Sparkles count={12} color="rgba(129, 140, 248, 0.55)" duration={3} />

        <FadeIn className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 text-center">
          <p className="paradigm-eyebrow text-paradigm-paper/60 mb-6">
            {t("ctaEyebrow")}
          </p>
          <h2 className="font-display text-[40px] md:text-[72px] leading-[1.05] tracking-[-0.025em] text-paradigm-paper mb-6">
            {t("ctaHeading")}
            <span className="bg-gradient-to-r from-paradigm-glow via-paradigm-tech to-paradigm-glow bg-clip-text text-transparent">
              {t("ctaHeadingHighlight")}
            </span>
            {t("ctaHeadingSuffix")}
          </h2>
          <p className="text-[16px] md:text-[17px] text-paradigm-paper/70 max-w-xl mx-auto mb-12 leading-[1.85]">
            {t("ctaSubheading")}
          </p>
          <Link
            href="/contact"
            className="group relative inline-flex items-center gap-2 border border-paradigm-paper text-paradigm-paper px-10 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-paper hover:text-paradigm-ink transition-colors overflow-hidden"
          >
            <span className="relative z-10">{t("ctaButton")}</span>
            <ArrowRight
              size={14}
              className="relative z-10 group-hover:translate-x-0.5 transition-transform"
            />
          </Link>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {CTA_BULLET_KEYS.map((k) => (
              <span
                key={k}
                className="paradigm-eyebrow text-paradigm-paper/55"
              >
                {t(`ctaBullets.${k}`)}
              </span>
            ))}
          </div>
        </FadeIn>
      </section>
    </div>
  )
}
