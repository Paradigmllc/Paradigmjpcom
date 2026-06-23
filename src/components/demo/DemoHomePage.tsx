"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import type { DemoMultiPageData } from "@/lib/sales/demo-site-types"

interface Props {
  data: DemoMultiPageData
}

export function DemoHomePage({ data }: Props) {
  const home = data.pages.home
  const meta = data.meta
  const isJa = data.locale === "ja"
  const accent = meta.accentColor || "#2563eb"
  const accentDark = meta.accentColorDark || "#1e3a8a"

  return (
    <div className="[--demo-accent:var(--home-accent)]" style={{ "--home-accent": accent } as React.CSSProperties}>
      {/* Hero */}
      <HeroSection hero={home.hero} isJa={isJa} />

      {/* Stats */}
      <StatsSection stats={home.stats} isJa={isJa} accent={accent} />

      {/* Loss Estimate */}
      {home.totalLoss && home.totalLoss !== "¥0" && home.totalLoss !== "0" && home.totalLoss !== "¥ 0" && (
        <LossEstimate totalLoss={home.totalLoss} isJa={isJa} />
      )}

      {/* Before / After */}
      {home.beforeAfter.length > 0 && (
        <BeforeAfterSection items={home.beforeAfter} isJa={isJa} accent={accent} />
      )}

      {/* Features */}
      {home.features.length > 0 && (
        <FeaturesSection features={home.features} isJa={isJa} accent={accent} />
      )}

      {/* CTA */}
      <CtaSection cta={home.cta} isJa={isJa} accent={accent} accentDark={accentDark} />
    </div>
  )
}

/* ─── Hero ─── */

function HeroSection({ hero, isJa }: { hero: DemoMultiPageData["pages"]["home"]["hero"]; isJa: boolean }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50/50 px-4 pb-20 pt-24 sm:px-6 lg:px-8">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <motion.div
        className="relative mx-auto max-w-4xl text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Tagline */}
        <motion.div
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--home-accent,#2563eb)]/20 bg-[var(--home-accent,#2563eb)]/5 px-4 py-1.5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--home-accent, #2563eb)" }}
          />
          <span className="text-xs font-semibold tracking-wide" style={{ color: "var(--home-accent, #2563eb)" }}>
            {hero.tagline}
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="mx-auto max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        >
          {hero.title}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-500 sm:text-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
        >
          {hero.subtitle}
        </motion.p>

        {/* Company info */}
        <motion.div
          className="mt-6 flex items-center justify-center gap-3 text-sm text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
        >
          <span className="font-semibold text-gray-700">{hero.companyName}</span>
          <span className="text-gray-300">•</span>
          <span>{hero.industryLabel}</span>
          <span className="text-gray-300">•</span>
          <span>{hero.locationLabel}</span>
        </motion.div>

        {/* CTAs */}
        <motion.div
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
        >
          <a
            href={hero.primaryCta.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-[var(--home-accent,#2563eb)]/25 transition-all hover:shadow-xl hover:shadow-[var(--home-accent,#2563eb)]/40 hover:-translate-y-0.5"
            style={{ background: "var(--home-accent, #2563eb)" }}
          >
            {hero.primaryCta.text}
            <ArrowRightIcon />
          </a>
          <a
            href={hero.secondaryCta.href}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 transition-all hover:border-[var(--home-accent,#2563eb)]/30 hover:bg-[var(--home-accent,#2563eb)]/5 hover:text-[var(--home-accent,#2563eb)]"
          >
            {hero.secondaryCta.text}
          </a>
        </motion.div>
      </motion.div>
    </section>
  )
}

/* ─── Stats ─── */

function StatsSection({ stats, isJa, accent }: { stats: DemoMultiPageData["pages"]["home"]["stats"]; isJa: boolean; accent: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <section className="border-y border-gray-100 bg-white px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        ref={ref}
        className="mx-auto max-w-4xl"
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
      >
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              className="text-center"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" }}
            >
              <div
                className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: `${accent}10` }}
              >
                <StatIcon name={stat.icon} accent={accent} />
              </div>
              <p className="font-display text-3xl font-extrabold text-gray-900 sm:text-4xl">{stat.amount}</p>
              <p className="mt-1 text-sm font-medium text-gray-500">{stat.title}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

/* ─── Loss Estimate ─── */

function LossEstimate({ totalLoss, isJa }: { totalLoss: string; isJa: boolean }) {
  // Format totalLoss with commas if it's a numeric value
  const formattedLoss = formatLoss(totalLoss)

  return (
    <section className="relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8" style={{ background: "linear-gradient(135deg, #fef2f2 0%, #fff7ed 50%, #fef2f2 100%)" }}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.08)_0%,transparent_70%)]" />
      <motion.div
        className="relative mx-auto max-w-3xl text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-100/60 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          <span className="text-xs font-bold text-red-600">
            {isJa ? "推定機会損失" : "Estimated Opportunity Loss"}
          </span>
        </div>
        <p className="mb-4 font-display text-5xl font-black text-red-600 sm:text-7xl">{formattedLoss}</p>
        <p className="mx-auto max-w-xl text-lg leading-relaxed text-gray-600">
          {isJa
            ? "現状のWebサイトで毎月失われている推定売上です。改善によりこの損失を回収できます。"
            : "Estimated revenue lost each month with the current website. This can be recovered through improvement."}
        </p>
      </motion.div>
    </section>
  )
}

function formatLoss(value: string): string {
  // Extract numeric part and yen symbol
  const match = value.match(/^(¥?\s*)([\d,]+)(.*)$/)
  if (!match) return value
  const [, symbol, num, suffix] = match
  const cleaned = num.replace(/,/g, "")
  const formatted = Number(cleaned).toLocaleString("en-US")
  return `${symbol}${formatted}${suffix}`
}

/* ─── Before / After ─── */

function BeforeAfterSection({ items, isJa, accent }: { items: DemoMultiPageData["pages"]["home"]["beforeAfter"]; isJa: boolean; accent: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <section id="before-after" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h2 className="font-display text-3xl font-bold text-gray-900 sm:text-4xl">
            {isJa ? "改善前後の比較" : "Before & After Comparison"}
          </h2>
          <p className="mt-3 text-gray-500">
            {isJa ? "診断データに基づく改善ポイント" : "Improvement points based on diagnostic data"}
          </p>
        </motion.div>

        <motion.div
          ref={ref}
          className="grid gap-8 md:grid-cols-3"
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              variants={{
                hidden: { opacity: 0, x: i % 2 === 0 ? -30 : 30 },
                visible: { opacity: 1, x: 0 },
              }}
              transition={{ duration: 0.4, delay: i * 0.12, ease: "easeOut" }}
            >
              <div className="mb-4">
                <SeverityBadge severity={item.severity} />
              </div>
              <h3 className="mb-4 font-display text-lg font-semibold text-gray-900">{item.label}</h3>

              {/* Before & After side-by-side */}
              <div className="grid grid-cols-2 gap-3">
                {/* Before */}
                <div className="rounded-xl border border-red-200 bg-red-50/70 p-3">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                      {isJa ? "BEFORE" : "BEFORE"}
                    </p>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-600">{item.beforeDescription}</p>
                </div>

                {/* Arrow + After */}
                <div>
                  <div className="flex justify-center -my-0.5 mb-1">
                    <svg className="h-4 w-4 rotate-90 text-gray-300 md:rotate-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                        {isJa ? "AFTER" : "AFTER"}
                      </p>
                    </div>
                    <p className="text-xs leading-relaxed text-gray-600">{item.afterDescription}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Features ─── */

function FeaturesSection({ features, isJa, accent }: { features: DemoMultiPageData["pages"]["home"]["features"]; isJa: boolean; accent: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <section id="features" className="bg-gray-50/80 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h2 className="font-display text-3xl font-bold text-gray-900 sm:text-4xl">
            {isJa ? "改善のポイント" : "Key Improvements"}
          </h2>
          <p className="mt-3 text-gray-500">
            {isJa ? "診断レポートに基づく3つの重点領域" : "Three focus areas based on the diagnostic report"}
          </p>
        </motion.div>

        <motion.div
          ref={ref}
          className="grid gap-8 md:grid-cols-3"
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {features.map((feature, i) => (
            <motion.div
              key={i}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" }}
            >
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: `${accent}10` }}
              >
                <FeatureIcon name={feature.icon} accent={accent} />
              </div>
              <h3 className="mb-3 font-display text-lg font-semibold text-gray-900">{feature.title}</h3>
              <p className="mb-4 text-sm leading-relaxed text-gray-500">{feature.description}</p>
              {feature.metricValue && feature.metricValue !== "-" && (
                <div className="flex items-end gap-2 border-t border-gray-100 pt-4">
                  <span className="font-display text-2xl font-bold" style={{ color: accent }}>{feature.metricValue}</span>
                  {feature.metricLabel && (
                    <span className="text-xs text-gray-400">{feature.metricLabel}</span>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ─── CTA ─── */

function CtaSection({ cta, isJa, accent, accentDark }: {
  cta: DemoMultiPageData["pages"]["home"]["cta"]
  isJa: boolean
  accent: string
  accentDark: string
}) {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <motion.div
        className="mx-auto max-w-3xl rounded-3xl p-10 text-center sm:p-16"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accentDark})` }}
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
          {cta.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/80">
          {cta.subtitle}
        </p>
        <motion.a
          href={cta.buttonHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-gray-900 shadow-lg transition-all hover:bg-gray-50 hover:shadow-xl hover:-translate-y-0.5"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
        >
          {cta.buttonText}
          <ArrowRightIcon />
        </motion.a>
      </motion.div>
    </section>
  )
}

/* ─── Icons ─── */

function ArrowRightIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StatIcon({ name, accent }: { name: string; accent: string }) {
  const icons: Record<string, React.ReactNode> = {
    bolt: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    lock: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    target: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
    clock: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  }
  return icons[name] ?? <StatIcon name="bolt" accent={accent} />
}

function FeatureIcon({ name, accent }: { name: string; accent: string }) {
  const icons: Record<string, React.ReactNode> = {
    sparkles: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" /><path d="M5 19l.5 1.5L7 21l-1.5.5L5 23l-.5-1.5L3 21l1.5-.5z" /><path d="M19 5l.5 1.5L21 7l-1.5.5L19 9l-.5-1.5L17 7l1.5-.5z" /></svg>,
    shield: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    route: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 000-7h-11a3.5 3.5 0 010-7H15" /><circle cx="18" cy="5" r="3" /></svg>,
  }
  return icons[name] ?? <FeatureIcon name="sparkles" accent={accent} />
}

function SeverityBadge({ severity }: { severity: "critical" | "warning" | "info" }) {
  const colors = {
    critical: "border-red-200 bg-red-50 text-red-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
  }
  const labels = {
    critical: "Critical",
    warning: "Warning",
    info: "Info",
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colors[severity]}`}>
      {labels[severity]}
    </span>
  )
}
