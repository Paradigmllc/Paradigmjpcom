"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import type { DemoMultiPageData, DemoMetricsSummary, DemoBeforeAfterItem, DemoStatsItem } from "@/lib/sales/demo-site-types"
import type { DemoTemplate } from "@/lib/sales/demo-templates/registry"
import {
  HeroCentered,
  HeroSplit,
  HeroMinimal,
  HeroFullscreen,
} from "./home/HeroVariants"
import {
  FeatureGrid3,
  FeatureGrid2,
  FeatureCards,
  FeatureAlternating,
  FeatureList,
} from "./home/FeatureVariants"
import { DemoFAQ } from "./DemoFAQ"

interface Props {
  data: DemoMultiPageData
  template?: DemoTemplate
}

export function DemoHomePage({ data, template }: Props) {
  const home = data.pages.home
  const meta = data.meta
  const isJa = data.locale === "ja"
  const accent = meta.accentColor || "#2563eb"
  const accentDark = meta.accentColorDark || "#1e3a8a"
  const layout = template?.layout.home

  // Render section by ID
  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case "hero":
        return renderHero()
      case "stats":
        return home.stats.length > 0 ? <StatsSectionCompact stats={home.stats} isJa={isJa} accent={accent} template={template?.designTokens} /> : null
      case "loss":
        return null
      case "beforeAfter":
        return home.beforeAfter.length > 0 ? (
          <>
            {home.metricsSummary && <MetricsSummarySection metrics={home.metricsSummary} isJa={isJa} accent={accent} />}
            <BeforeAfterSectionCompact items={home.beforeAfter} isJa={isJa} accent={accent} template={template?.designTokens} />
          </>
        ) : null
      case "features":
        return home.features.length > 0 ? renderFeatures() : null
      case "cta":
        return <CtaSectionCompact cta={home.cta} isJa={isJa} accent={accent} accentDark={accentDark} template={template?.designTokens} />
      case "testimonials":
      case "trustedBy":
        return null
      default:
        return null
    }
  }

  function renderHero() {
    switch (layout?.heroVariant ?? "centered") {
      case "split": return <HeroSplit hero={home.hero} isJa={isJa} template={template?.designTokens} />
      case "minimal": return <HeroMinimal hero={home.hero} isJa={isJa} template={template?.designTokens} />
      case "fullscreen": return <HeroFullscreen hero={home.hero} isJa={isJa} template={template?.designTokens} />
      default: return <HeroCentered hero={home.hero} isJa={isJa} template={template?.designTokens} />
    }
  }

  function renderFeatures() {
    switch (layout?.featureLayout ?? "grid3") {
      case "grid2": return <FeatureGrid2 features={home.features} isJa={isJa} accent={accent} template={template?.designTokens} />
      case "cards": return <FeatureCards features={home.features} isJa={isJa} accent={accent} template={template?.designTokens} />
      case "alternating": return <FeatureAlternating features={home.features} isJa={isJa} accent={accent} template={template?.designTokens} />
      case "list": return <FeatureList features={home.features} isJa={isJa} accent={accent} template={template?.designTokens} />
      default: return <FeatureGrid3 features={home.features} isJa={isJa} accent={accent} template={template?.designTokens} />
    }
  }

  // FAQ section
  const hasFaq = home.faq && home.faq.length > 0

  return (
    <div className="[--demo-accent:var(--home-accent)]" style={{ "--home-accent": accent } as React.CSSProperties}>
      {/* Render sections in template order */}
      {(data.designRecipe?.sectionOrder ?? layout?.sections ?? defaultSections).map((sectionId) => (
        <div key={sectionId}>
          {renderSection(sectionId)}
        </div>
      ))}

      {/* FAQ always shows if data exists */}
      {hasFaq && <DemoFAQ faq={home.faq!} isJa={isJa} accent={accent} />}
    </div>
  )
}

const defaultSections = ["hero", "stats", "beforeAfter", "features", "cta"]

/* ──────────── Compact section renderers (extracted from original) ──────────── */

function StatsSectionCompact({
  stats, isJa, accent, template: _template,
}: { stats: DemoStatsItem[]; isJa: boolean; accent: string; template?: DemoTemplate["designTokens"] }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-50px" })
  return (
    <section className="border-y border-gray-100 bg-white px-4 py-12 sm:px-6 lg:px-8">
      <motion.div ref={ref} className="mx-auto max-w-4xl" initial="hidden" animate={inView ? "visible" : "hidden"}>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div key={i} className="text-center"
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" }}>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `${accent}10` }}>
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

function LossEstimate({ totalLoss, isJa }: { totalLoss: string; isJa: boolean }) {
  const formattedLoss = formatLoss(totalLoss)
  return (
    <section className="relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8" style={{ background: "linear-gradient(135deg, #fef2f2 0%, #fff7ed 50%, #fef2f2 100%)" }}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.08)_0%,transparent_70%)]" />
      <motion.div className="relative mx-auto max-w-3xl text-center"
        initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-100/60 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          <span className="text-xs font-bold text-red-600">{isJa ? "推定機会損失" : "Estimated Opportunity Loss"}</span>
        </div>
        <p className="mb-4 font-display text-5xl font-black text-red-600 sm:text-7xl">{formattedLoss}</p>
        <p className="mx-auto max-w-xl text-lg leading-relaxed text-gray-600">
          {isJa ? "現状のWebサイトで毎月失われている推定売上です。改善によりこの損失を回収できます。" : "Estimated revenue lost each month with the current website. This can be recovered through improvement."}
        </p>
      </motion.div>
    </section>
  )
}

function MetricsSummarySection({ metrics, isJa, accent }: { metrics: DemoMetricsSummary; isJa: boolean; accent: string }) {
  const hasData = metrics.currentPageSpeed || metrics.currentSslGrade || metrics.currentSeoIssues > 0 || metrics.monthlyLoss
  if (!hasData) return null

  const rows: { label: string; current: string; target: string; icon: string }[] = []
  if (metrics.currentPageSpeed) rows.push({ label: isJa ? "PageSpeedスコア" : "PageSpeed Score", current: metrics.currentPageSpeed, target: metrics.targetPageSpeed, icon: "bolt" })
  if (metrics.currentSslGrade) rows.push({ label: isJa ? "SSLグレード" : "SSL Grade", current: metrics.currentSslGrade, target: metrics.targetSslGrade, icon: "lock" })
  if (metrics.currentSeoIssues > 0) rows.push({ label: isJa ? "SEO課題" : "SEO Issues", current: `${metrics.currentSeoIssues} ${isJa ? "件" : "issues"}`, target: `${metrics.targetSeoIssues} ${isJa ? "件" : "issues"}`, icon: "target" })
  if (metrics.monthlyLoss && metrics.recoveryAmount) rows.push({ label: isJa ? "月間損失" : "Monthly Loss", current: metrics.monthlyLoss, target: metrics.recoveryAmount, icon: "clock" })
  if (rows.length === 0) return null

  return (
    <section className="bg-white px-4 pb-8 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-6 shadow-sm sm:p-8"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-white" style={{ background: accent }}>✓</span>
            <h3 className="font-display text-lg font-bold text-gray-900">{isJa ? "改善目標サマリー" : "Improvement Targets Summary"}</h3>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">{isJa ? "指標" : "Metric"}</th>
                  <th className="px-4 py-3 text-center font-semibold text-red-600">{isJa ? "現在" : "Current"}</th>
                  <th className="px-4 py-3 text-center" />
                  <th className="px-4 py-3 text-center font-semibold text-emerald-600">{isJa ? "目標" : "Target"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-700">{row.label}</td>
                    <td className="px-4 py-3 text-center font-semibold text-red-600">{row.current}</td>
                    <td className="px-2 py-3 text-center text-gray-300">
                      <svg className="mx-auto h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-emerald-600">{row.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function BeforeAfterSectionCompact({
  items, isJa, accent, template: _template,
}: { items: DemoBeforeAfterItem[]; isJa: boolean; accent: string; template?: DemoTemplate["designTokens"] }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-50px" })
  return (
    <section id="before-after" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.div className="mb-12 text-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <h2 className="font-display text-3xl font-bold text-gray-900 sm:text-4xl">{isJa ? "改善前後の比較" : "Before & After Comparison"}</h2>
          <p className="mt-3 text-gray-500">{isJa ? "診断データに基づく改善ポイント" : "Improvement points based on diagnostic data"}</p>
        </motion.div>
        <motion.div ref={ref} className="grid gap-8 md:grid-cols-3" initial="hidden" animate={inView ? "visible" : "hidden"}>
          {items.map((item, i) => (
            <motion.div key={item.id} className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              variants={{ hidden: { opacity: 0, x: i % 2 === 0 ? -30 : 30 }, visible: { opacity: 1, x: 0 } }}
              transition={{ duration: 0.4, delay: i * 0.12 }}>
              <div className="mb-4"><SeverityBadge severity={item.severity} /></div>
              <h3 className="mb-4 font-display text-lg font-semibold text-gray-900">{item.label}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-red-200 bg-red-50/70 p-3">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">BEFORE</p>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-600">{item.beforeDescription}</p>
                </div>
                <div>
                  <div className="flex justify-center -my-0.5 mb-1">
                    <svg className="h-4 w-4 rotate-90 text-gray-300 md:rotate-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">AFTER</p>
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

function CtaSectionCompact({
  cta, isJa: _isJa, accent, accentDark, template: _template,
}: { cta: NonNullable<DemoMultiPageData["pages"]["home"]["cta"]>; isJa: boolean; accent: string; accentDark: string; template?: DemoTemplate["designTokens"] }) {
  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8"
      style={{ background: `linear-gradient(135deg, ${accentDark} 0%, ${accent} 100%)` }}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.15)_0%,transparent_70%)]" />
      <motion.div className="relative mx-auto max-w-3xl text-center"
        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
        <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">{cta.title}</h2>
        {cta.subtitle && <p className="mt-4 text-lg leading-relaxed text-white/80">{cta.subtitle}</p>}
        <div className="mt-8">
          <a href={cta.buttonHref} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl"
            style={{ color: accent }}>
            {cta.buttonText}
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </a>
        </div>
      </motion.div>
    </section>
  )
}

/* ──────────── Helpers ──────────── */

function formatLoss(totalLoss: string): string {
  const match = totalLoss.match(/[¥￥]?\s*([\d,]+)/)
  if (match) return `¥${match[1]}/月`
  return totalLoss
}

function SeverityBadge({ severity }: { severity: string | undefined }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    critical: { label: "CRITICAL", bg: "red-100", text: "red-600" },
    warning: { label: "WARNING", bg: "amber-100", text: "amber-600" },
    info: { label: "INFO", bg: "blue-100", text: "blue-600" },
    good: { label: "OK", bg: "emerald-100", text: "emerald-600" },
  }
  const s = map[severity ?? "info"] ?? map.info
  return <span className={`inline-flex items-center rounded-full bg-${s.bg} px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-${s.text}`}>{s.label}</span>
}

function StatIcon({ name, accent }: { name: string; accent: string }) {
  const icons: Record<string, React.ReactNode> = {
    bolt: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
    lock: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>,
    target: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
    clock: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  }
  return icons[name] ?? <StatIcon name="bolt" accent={accent} />
}
