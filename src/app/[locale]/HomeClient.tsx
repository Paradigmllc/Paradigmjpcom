"use client"

/**
 * HomeClient — paradigm /[locale] homepage in Aesop / Le Labo grammar.
 *
 * Five editorial bands, each with the same eyebrow+serif heading pattern:
 *   1. Hero            — full-viewport paper + serif typing headline + outline CTA
 *   2. Services        — 4-card hairline grid, no gradients
 *   3. Features        — paper-deep contrast band, 4-up monoline grid
 *   4. Testimonials    — 3 hairline cards + caps trust strip
 *   5. CTA closing     — full-viewport ink reverse, single outline button
 *
 * AE-PHP-2 厳守: every visible string resolved through `useTranslations("home")`
 * and the existing message keys (which were already i18n-correct in the
 * P17 messages migration). Only structure / styling changed in P18-D.
 *
 * AE-PHP-1: 415 lines (under 500). Could be section-per-file but the
 * sections share container width / motion variants enough that a single
 * file is the cleaner read here. Refactor to /home/{Hero,Services,…}
 * if any section grows past ~150 lines.
 *
 * AE-PHP-4 role: this file is the home-page composition. Sub-helpers
 * (AnimCounter, useTypingEffect) live in /aesop/home/ for reuse on
 * about / services / pricing pages.
 */

import { Link } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { ArrowRight, Bot, Globe, Search, TrendingUp, Zap, Shield, Users, Sparkles } from "lucide-react"
import AnimCounter from "@/components/aesop/home/AnimCounter"
import { useTypingEffect } from "@/components/aesop/home/useTypingEffect"
import FadeIn from "@/components/aesop/FadeIn"

const EASE = [0.22, 1, 0.36, 1] as const

const SERVICE_DEFS = [
  { key: "web", icon: Globe, href: "/services/web" },
  { key: "meo", icon: Search, href: "/services/meo" },
  { key: "seo", icon: TrendingUp, href: "/services/seo" },
  { key: "ai", icon: Bot, href: "/services/ai" },
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
  { key: "aiFusion", icon: Sparkles },
] as const

const TESTIMONIAL_KEYS = ["1", "2", "3"] as const
const TRUST_BADGE_KEYS = ["1", "2", "3", "4"] as const
const CTA_BULLET_KEYS = ["1", "2", "3"] as const

export default function HomeClient() {
  const t = useTranslations("home")

  const typingWords = (t.raw("heroTypingWords") as string[]) ?? ["MEO対策"]
  const typingText = useTypingEffect(typingWords, 90, 1800)

  return (
    <div className="overflow-x-hidden">

      {/* ════════════════════════════════════════════════
          1. Hero — full-viewport paper editorial
          ════════════════════════════════════════════════ */}
      <section className="relative min-h-[92vh] flex items-center justify-center bg-paradigm-paper">
        <div className="relative max-w-5xl mx-auto px-6 md:px-12 text-center pt-24 pb-16">
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="paradigm-eyebrow mb-10"
          >
            {t("heroBadge")}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7, ease: EASE }}
            className="font-display text-[44px] md:text-[88px] leading-[1.05] tracking-[-0.015em] text-paradigm-ink mb-8"
          >
            <span className="block">
              {typingText}
              <span
                aria-hidden
                className="inline-block w-[2px] h-[0.78em] bg-paradigm-ink ml-2 align-middle animate-[blink_1s_step-end_infinite]"
              />
            </span>
            <span className="block italic font-light text-paradigm-ink-soft">
              {t("heroSuffix")}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-[15px] md:text-[17px] text-paradigm-ink-soft max-w-2xl mx-auto mb-12 leading-[1.85]"
          >
            {t("heroSubheadline")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="flex items-center justify-center gap-3 md:gap-4 flex-wrap"
          >
            <Link
              href="/contact"
              className="group inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper px-8 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-accent transition-colors"
            >
              {t("heroBookConsult")}
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center gap-2 border border-paradigm-line text-paradigm-ink-soft hover:border-paradigm-ink hover:text-paradigm-ink px-8 py-4 text-[12px] tracking-[0.18em] uppercase transition-colors"
            >
              {t("heroSeeServices")}
            </Link>
          </motion.div>

          {/* Stats strip — no card chrome, just a 4-column tabular row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.5 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 border-t border-paradigm-line"
          >
            {STAT_DEFS.map((s, i) => (
              <div
                key={s.key}
                className={`px-4 py-6 text-center ${
                  i > 0 ? "md:border-l border-paradigm-line" : ""
                } ${i === 1 ? "border-l border-paradigm-line md:border-l" : ""} ${
                  i === 2 ? "border-t md:border-t-0 border-paradigm-line" : ""
                } ${i === 3 ? "border-t border-l md:border-t-0 border-paradigm-line" : ""}`}
              >
                <div className="font-display text-[28px] md:text-[36px] text-paradigm-ink">
                  <AnimCounter to={s.to} suffix={t(`stats.${s.key}.suffix`)} />
                </div>
                <div className="paradigm-eyebrow mt-2">{t(`stats.${s.key}.label`)}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          2. Services — hairline 4-card grid on paper
          ════════════════════════════════════════════════ */}
      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <FadeIn className="mb-16 max-w-3xl">
            <p className="paradigm-eyebrow mb-5">{t("servicesEyebrow")}</p>
            <h2 className="font-display text-[32px] md:text-[52px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink">
              {t("servicesHeading")}
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-paradigm-line">
            {SERVICE_DEFS.map((s) => {
              const Icon = s.icon
              const badge = t(`services.${s.key}.badge`)
              return (
                <Link
                  key={s.key}
                  href={s.href}
                  className="group relative block bg-paradigm-paper p-10 md:p-12 hover:bg-paradigm-paper-card transition-colors"
                >
                  {badge && (
                    <span className="absolute top-6 right-6 paradigm-eyebrow text-paradigm-accent">
                      {badge}
                    </span>
                  )}
                  <Icon
                    size={28}
                    strokeWidth={1.25}
                    className="text-paradigm-ink-soft mb-6"
                  />
                  <h3 className="font-display text-[26px] md:text-[32px] leading-[1.2] text-paradigm-ink mb-2">
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
                    <span className="paradigm-eyebrow text-paradigm-ink-soft group-hover:text-paradigm-ink transition-colors flex items-center gap-1">
                      {t("servicesViewMore")}
                      <ArrowRight
                        size={11}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          3. Features — paper-deep contrast band
          ════════════════════════════════════════════════ */}
      <section className="bg-paradigm-paper-deep paradigm-section">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <FadeIn className="mb-16 max-w-3xl">
            <p className="paradigm-eyebrow mb-5">{t("featuresEyebrow")}</p>
            <h2 className="font-display text-[32px] md:text-[52px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink">
              {t("featuresHeading")}
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-paradigm-line">
            {FEATURE_DEFS.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.key}
                  className="bg-paradigm-paper-deep p-8 md:p-10"
                >
                  <Icon
                    size={26}
                    strokeWidth={1.25}
                    className="text-paradigm-ink-soft mb-5"
                  />
                  <h3 className="font-display text-[22px] md:text-[24px] leading-[1.25] text-paradigm-ink mb-3">
                    {t(`features.${f.key}.title`)}
                  </h3>
                  <p className="text-[14px] text-paradigm-ink-soft leading-[1.8]">
                    {t(`features.${f.key}.desc`)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          4. Testimonials — 3 quote cards + caps trust strip
          ════════════════════════════════════════════════ */}
      <section className="bg-paradigm-paper paradigm-section">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <FadeIn className="mb-16 max-w-3xl">
            <p className="paradigm-eyebrow mb-5">{t("testimonialsEyebrow")}</p>
            <h2 className="font-display text-[32px] md:text-[52px] leading-[1.15] tracking-[-0.01em] text-paradigm-ink">
              {t("testimonialsHeading")}
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-paradigm-line">
            {TESTIMONIAL_KEYS.map((k) => {
              const name = t(`testimonials.${k}.name`)
              return (
                <div
                  key={k}
                  className="bg-paradigm-paper p-9 md:p-10 flex flex-col"
                >
                  <p className="font-display text-[20px] md:text-[22px] leading-[1.45] text-paradigm-ink mb-8 flex-1">
                    <span className="text-paradigm-ink-mute" aria-hidden>
                      &ldquo;
                    </span>
                    {t(`testimonials.${k}.text`)}
                    <span className="text-paradigm-ink-mute" aria-hidden>
                      &rdquo;
                    </span>
                  </p>
                  <div className="border-t border-paradigm-line pt-5">
                    <p className="text-[13px] font-medium text-paradigm-ink mb-1">
                      {name}
                    </p>
                    <p className="paradigm-eyebrow">
                      {t(`testimonials.${k}.location`)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Trust strip — no pill chrome, just caps text */}
          <FadeIn
            delay={0.1}
            className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 border-t border-paradigm-line pt-10"
          >
            {TRUST_BADGE_KEYS.map((k) => (
              <span
                key={k}
                className="paradigm-eyebrow text-paradigm-ink-soft"
              >
                {t(`trustBadges.${k}`)}
              </span>
            ))}
          </FadeIn>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          5. CTA — full-viewport ink reverse
          ════════════════════════════════════════════════ */}
      <section className="bg-paradigm-ink text-paradigm-paper paradigm-section">
        <FadeIn className="max-w-3xl mx-auto px-6 md:px-12 text-center">
          <p className="paradigm-eyebrow text-paradigm-paper/60 mb-6">
            {t("ctaEyebrow")}
          </p>
          <h2 className="font-display text-[40px] md:text-[64px] leading-[1.1] tracking-[-0.015em] text-paradigm-paper mb-6">
            {t("ctaHeading")}
            <span className="italic text-paradigm-paper/80">
              {t("ctaHeadingHighlight")}
            </span>
            {t("ctaHeadingSuffix")}
          </h2>
          <p className="text-[16px] md:text-[17px] text-paradigm-paper/65 max-w-xl mx-auto mb-12 leading-[1.85]">
            {t("ctaSubheading")}
          </p>
          <Link
            href="/contact"
            className="group inline-flex items-center gap-2 border border-paradigm-paper text-paradigm-paper px-10 py-4 text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-paper hover:text-paradigm-ink transition-colors"
          >
            {t("ctaButton")}
            <ArrowRight
              size={14}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </Link>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {CTA_BULLET_KEYS.map((k) => (
              <span
                key={k}
                className="paradigm-eyebrow text-paradigm-paper/50"
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
