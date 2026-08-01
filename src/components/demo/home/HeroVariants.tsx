"use client"

import { motion } from "framer-motion"
import type { DemoHeroProps } from "@/lib/sales/demo-site-types"
import type { DemoTemplate } from "@/lib/sales/demo-templates/registry"
import { headingSizeClass } from "@/lib/sales/demo-templates/registry"

interface Props {
  hero: DemoHeroProps
  isJa: boolean
  template?: DemoTemplate["designTokens"]
}

/* ──────────── Centered Hero ──────────── */

export function HeroCentered({ hero, isJa: _isJa, template }: Props) {
  const size = headingSizeClass(template?.typography.scale ?? "normal")
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50/50 px-4 pb-20 pt-24 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <motion.div
        className="relative mx-auto max-w-4xl text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.div
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--home-accent,#2563eb)]/20 bg-[var(--home-accent,#2563eb)]/5 px-4 py-1.5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--home-accent, #2563eb)" }} />
          <span className="text-xs font-semibold tracking-wide" style={{ color: "var(--home-accent, #2563eb)" }}>{hero.tagline}</span>
        </motion.div>
        <motion.h1
          className={`mx-auto max-w-3xl font-display ${size.h1} ${template?.typography.headingWeight ?? "font-extrabold"} leading-tight tracking-tight text-gray-900`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {hero.title}
        </motion.h1>
        <motion.p
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-500 sm:text-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {hero.subtitle}
        </motion.p>
        <motion.div
          className="mt-6 flex items-center justify-center gap-3 text-sm text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <span className="font-semibold text-gray-700">{hero.companyName}</span>
          <span className="text-gray-300">•</span>
          <span>{hero.industryLabel}</span>
          <span className="text-gray-300">•</span>
          <span>{hero.locationLabel}</span>
        </motion.div>
        <motion.div
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <a href={hero.primaryCta.href} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5"
            style={{
              background: "var(--home-accent, #2563eb)",
              boxShadow: "0 10px 25px -5px var(--home-accent, #2563eb)44",
            }}>
            {hero.primaryCta.text} <ArrowRightIcon />
          </a>
          <a href={hero.secondaryCta.href}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 transition-all hover:border-[var(--home-accent,#2563eb)]/30 hover:bg-[var(--home-accent,#2563eb)]/5">
            {hero.secondaryCta.text}
          </a>
        </motion.div>
      </motion.div>
    </section>
  )
}

/* ──────────── Split Hero ──────────── */

export function HeroSplit({ hero, isJa: _isJa, template }: Props) {
  const size = headingSizeClass(template?.typography.scale ?? "normal")
  return (
    <section className="relative overflow-hidden bg-white px-4 pb-20 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <motion.div
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--home-accent,#2563eb)]/20 bg-[var(--home-accent,#2563eb)]/5 px-4 py-1.5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--home-accent, #2563eb)" }} />
              <span className="text-xs font-semibold tracking-wide" style={{ color: "var(--home-accent, #2563eb)" }}>{hero.tagline}</span>
            </motion.div>
            <h1 className={`font-display ${size.h1} ${template?.typography.headingWeight ?? "font-extrabold"} leading-tight tracking-tight text-gray-900`}>
              {hero.title}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-gray-500 sm:text-xl">
              {hero.subtitle}
            </p>
            <div className="mt-6 flex items-center gap-3 text-sm text-gray-400">
              <span className="font-semibold text-gray-700">{hero.companyName}</span>
              <span className="text-gray-300">•</span>
              <span>{hero.industryLabel}</span>
              <span className="text-gray-300">•</span>
              <span>{hero.locationLabel}</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href={hero.primaryCta.href} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5"
                style={{ background: "var(--home-accent, #2563eb)", boxShadow: "0 10px 25px -5px var(--home-accent, #2563eb)44" }}>
                {hero.primaryCta.text} <ArrowRightIcon />
              </a>
              <a href={hero.secondaryCta.href}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 transition-all hover:border-[var(--home-accent,#2563eb)]/30 hover:bg-[var(--home-accent,#2563eb)]/5">
                {hero.secondaryCta.text}
              </a>
            </div>
          </motion.div>
          <motion.div
            className="hidden lg:flex items-center justify-center"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          >
            <div
              className="relative h-96 w-full max-w-lg rounded-2xl"
              style={{
                background: "linear-gradient(135deg, var(--home-accent, #2563eb)15, var(--home-accent, #2563eb)05)",
                border: "2px solid var(--home-accent, #2563eb)20",
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl text-3xl font-black text-white"
                  style={{ background: "var(--home-accent, #2563eb)", boxShadow: "0 20px 40px -10px var(--home-accent, #2563eb)44" }}>
                  {hero.companyName?.[0]?.toUpperCase() ?? "P"}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ──────────── Minimal Hero ──────────── */

export function HeroMinimal({ hero, isJa: _isJa, template }: Props) {
  const size = headingSizeClass(template?.typography.scale ?? "normal")
  return (
    <section className="relative bg-white px-4 pb-16 pt-20 sm:px-6 lg:px-8">
      <motion.div
        className="mx-auto max-w-3xl text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.p
          className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]"
          style={{ color: "var(--home-accent, #2563eb)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {hero.tagline}
        </motion.p>
        <h1 className={`font-display ${size.h1} ${template?.typography.headingWeight ?? "font-semibold"} leading-tight tracking-tight text-gray-900`}>
          {hero.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-gray-500">{hero.subtitle}</p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a href={hero.primaryCta.href} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "var(--home-accent, #2563eb)" }}>
            {hero.primaryCta.text} <ArrowRightIcon />
          </a>
          <a href={hero.secondaryCta.href}
            className="text-sm font-medium text-gray-500 transition-colors hover:text-[var(--home-accent,#2563eb)]">
            {hero.secondaryCta.text}
          </a>
        </div>
      </motion.div>
    </section>
  )
}

/* ──────────── Fullscreen Hero ──────────── */

export function HeroFullscreen({ hero, isJa: _isJa, template }: Props) {
  const size = headingSizeClass(template?.typography.scale ?? "generous")
  return (
    <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:80px_80px]" />
      <motion.div
        className="relative z-10 mx-auto max-w-4xl text-center"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.div
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 backdrop-blur"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--home-accent, #2563eb)" }} />
          <span className="text-xs font-semibold tracking-wider text-white/70">{hero.tagline}</span>
        </motion.div>
        <h1 className={`font-display ${size.h1} ${template?.typography.headingWeight ?? "font-black"} leading-[1.05] tracking-tight text-white`}>
          {hero.title}
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-white/50 sm:text-xl">
          {hero.subtitle}
        </p>
        <div className="mt-6 mb-10 flex items-center justify-center gap-3 text-sm text-white/40">
          <span className="font-semibold text-white/80">{hero.companyName}</span>
          <span>•</span>
          <span>{hero.industryLabel}</span>
          <span>•</span>
          <span>{hero.locationLabel}</span>
        </div>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a href={hero.primaryCta.href} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl px-10 py-4 text-base font-semibold text-white shadow-2xl transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-10px_var(--home-accent,#2563eb)66]"
            style={{ background: "var(--home-accent, #2563eb)" }}>
            {hero.primaryCta.text} <ArrowRightIcon />
          </a>
          <a href={hero.secondaryCta.href}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white/70 backdrop-blur transition-all hover:border-white/20 hover:bg-white/10 hover:text-white">
            {hero.secondaryCta.text}
          </a>
        </div>
      </motion.div>
    </section>
  )
}

function ArrowRightIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
