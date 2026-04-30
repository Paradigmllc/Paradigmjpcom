/**
 * /[locale]/report/[slug] — 多言語診断レポート（paradigmjp.com）
 *
 * 役割:
 *   - Paradigm Sales OS v2（appexx.me）が生成した diagnostic_reports を
 *     日本語/英語どちらでも違和感なく表示するマーケ面ページ
 *   - URL の locale セグメントが single source of truth（AE-10）
 *   - 閲覧トラッキング: /api/report/{token}（GET時）+ beforeunload beacon
 *
 * appexxme版との差分:
 *   - Magic UI 依存なし（Meteors/BorderBeam/NumberTicker は Tailwind/framer-motionで代替）
 *   - Dify chatbot がページ内で常時見える（SiteWrapper 側で描画）
 *   - i18n キー駆動（messages/{ja,en}.json の "report.*"）
 */

"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import ProposalRenderer from "@/components/proposal/ProposalRenderer"
import type { ProspectData } from "@/app/[locale]/p/[slug]/AllInOneClient"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  Star,
  MessageSquare,
  Gauge,
  CheckCircle2,
  TrendingUp,
  Mail,
  Calendar,
  Shield,
  Globe,
} from "lucide-react"

export const dynamic = "force-dynamic"

interface Competitor {
  name: string
  rating?: number
  reviews?: number
  strengths?: string[]
}

interface Issue {
  title?: string
  issue?: string
  description?: string
  severity?: string
}

interface Recommendation {
  title: string
  description: string
  priority?: string
  impact?: string
}

interface Report {
  id: string
  token: string
  business_name: string
  business_data?: Record<string, unknown>
  google_rating?: number
  google_reviews_count?: number
  unanswered_reviews?: number
  hp_speed_score?: number
  seo_issues?: Issue[]
  competitors?: Competitor[]
  recommendations?: Recommendation[]
  overall_score: number
  ai_summary?: string
  ai_issues?: Issue[]
  ai_opportunities?: { title: string; description: string; potential: string }[]
}

function scoreColor(score: number): string {
  if (score >= 70) return "#10b981"
  if (score >= 40) return "#f59e0b"
  return "#ef4444"
}

export default function ReportPage() {
  const { slug } = useParams<{ slug: string }>()
  const t = useTranslations("report")
  const locale = useLocale()
  const [report, setReport] = useState<Report | null>(null)
  const [prospect, setProspect] = useState<ProspectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const startTime = useRef(Date.now())

  // 2026-04-30 統合 dispatcher: slug-first → token fallback
  // canonical: /[locale]/report/[slug] (V2 ProposalRenderer Magic UI)
  // fallback:  /[locale]/report/[slug] (V1 legacy diagnostic_reports・i18n版)
  useEffect(() => {
    if (!slug) return
    let cancelled = false

    async function load() {
      // ── 1) Try slug first (proposal_pages・V2 canonical) ─────
      try {
        const r1 = await fetch("https://appexx.me/api/sales-automation", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_prospect", slug }),
        })
        const d1 = await r1.json()
        if (!cancelled && r1.ok && d1.prospect && !d1.error) {
          const p = d1.prospect
          const tpl = d1.template || {}
          const demoData = p.demo_data || {}
          setProspect({
            diagnostic_report: d1.diagnostic_report || null,
            id: p.id, slug: p.slug,
            business_name: p.business_name || "",
            category: p.category || "", address: p.address || "",
            rating: p.rating || 0, review_count: p.review_count || 0,
            unanswered_reviews: p.unanswered_reviews || 0,
            unanswered_english: p.unanswered_english || 0,
            reply_rate: p.reply_rate || 0,
            competitor_avg_reply_rate: p.competitor_avg_reply_rate || 78,
            competitor_avg_rating: 4.4,
            page_speed_mobile: p.page_speed_mobile || 0,
            page_speed_desktop: p.page_speed_desktop || 0,
            has_website: !!p.website_url, website_url: p.website_url || null,
            tech_stack: p.tech_stack || [], vulnerabilities: p.vulnerabilities || [],
            has_english_page: p.has_english_page || false,
            foreign_review_ratio: p.unanswered_english > 0 ? p.unanswered_english / Math.max(1, p.review_count) : 0,
            sample_reviews: [], ai_reply_samples: p.ai_reply_samples || [],
            loss_aversion_hook: p.loss_aversion_hook || "",
            estimated_monthly_loss: p.estimated_monthly_loss || 0,
            match_score: p.match_score || 0,
            primary_product: p.primary_product || "hp",
            demo_url: demoData.demo_url || "", report_url: demoData.report_url || "",
            ai_analysis: p.ai_analysis || null,
            review_analysis: p.review_analysis || null,
            competitor_analysis: p.competitor_analysis || null,
            has_sns: p.has_sns || false, has_ads: p.has_ads || false,
            phone: p.phone || "", email: p.email || "",
            visible_sections: p.visible_sections || undefined,
            template_accent: tpl.accent_color || tpl.accent2 || undefined,
            template_cta_text: tpl.cta_text || undefined,
            template_cta_url: tpl.cta_url || undefined,
            template_copy_tone: tpl.copy_tone || undefined,
            db_template: Object.keys(tpl).length > 0 ? tpl : undefined,
            demo_html: d1.demo_html || undefined,
            matched_pattern: d1.matched_pattern || undefined,
          })
          setLoading(false)
          return
        }
      } catch { /* fall through to token fallback */ }

      // ── 2) Fallback to token (diagnostic_reports・V1 legacy) ──
      try {
        const r2 = await fetch(`/api/report/${slug}`)
        const d2 = await r2.json()
        if (cancelled) return
        if (d2.error) {
          if (d2.error === "not_found") setError(t("notFound"))
          else if (d2.error === "expired") setError(t("expired"))
          else setError(t("errorGeneric"))
        } else {
          setReport(d2.report)
        }
      } catch {
        if (!cancelled) setError(t("errorGeneric"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug, t])

  // 滞在時間 beacon（30秒超で HOT 判定）
  useEffect(() => {
    if (!slug) return
    const send = () => {
      const seconds = Math.round((Date.now() - startTime.current) / 1000)
      if (seconds > 3) {
        try {
          navigator.sendBeacon(
            `/api/report/${slug}`,
            JSON.stringify({ duration_seconds: seconds }),
          )
        } catch (e) {
          console.error("sendBeacon failed:", e)
        }
      }
    }
    window.addEventListener("beforeunload", send)
    return () => window.removeEventListener("beforeunload", send)
  }, [slug])

  if (loading) return <LoadingScreen label={t("loading")} />
  // 1) slug ヒット → V2 ProposalRenderer (canonical)
  if (prospect) {
    const useLegacy = typeof window !== "undefined" && window.location.search.includes("legacy=1")
    if (!useLegacy) return <ProposalRenderer data={prospect} />
  }
  if (error) return <ErrorScreen title={t("errorTitle")} message={error} />
  if (!report) return null

  const ringColor = scoreColor(report.overall_score)
  const labelKey =
    report.overall_score >= 70
      ? "good"
      : report.overall_score >= 40
        ? "improve"
        : "critical"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <HeroSection
        report={report}
        ringColor={ringColor}
        labelText={t(`scoreLabel.${labelKey}`)}
        overallScoreLabel={t("overallScore")}
        eyebrow={t("eyebrow")}
        intro={t("intro")}
        locale={locale}
      />

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        {report.ai_summary && (
          <AiSummaryCard summary={report.ai_summary} heading={t("aiSummaryHeading")} />
        )}

        <ScoreCardsGrid
          report={report}
          heading={t("scoreCardsHeading")}
          labels={{
            googleRating: t("metric.googleRating"),
            reviews: t("metric.reviews"),
            unanswered: t("metric.unanswered"),
            hpSpeed: t("metric.hpSpeed"),
          }}
        />

        {(report.ai_issues?.length || report.seo_issues?.length) ? (
          <IssuesSection
            issues={(report.ai_issues?.length ? report.ai_issues : report.seo_issues) || []}
            heading={t("issuesHeading")}
            severity={{
              high: t("severity.high"),
              medium: t("severity.medium"),
              low: t("severity.low"),
            }}
          />
        ) : null}

        {report.competitors && report.competitors.length > 0 && (
          <CompetitorsSection
            competitors={report.competitors}
            heading={t("competitorsHeading")}
            cols={{
              name: t("competitor.name"),
              rating: t("competitor.rating"),
              reviews: t("competitor.reviews"),
              strengths: t("competitor.strengths"),
            }}
          />
        )}

        {report.recommendations && report.recommendations.length > 0 && (
          <RecommendationsSection
            recommendations={report.recommendations}
            heading={t("recommendationsHeading")}
            priority={{
              high: t("priority.high"),
              medium: t("priority.medium"),
              low: t("priority.low"),
            }}
            impactLabel={t("impact")}
          />
        )}

        <CtaSection
          heading={t("ctaHeading")}
          subheading={t("ctaSubheading")}
          button={t("ctaButton")}
          email={t("ctaEmail")}
          locale={locale}
        />

        <footer className="text-center py-6">
          <p className="text-[10px] text-gray-400">
            © {new Date().getFullYear()} Paradigm · {t("autoGenerated")}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {t("confidential", { name: report.business_name })}
          </p>
        </footer>
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="text-center">
        <div className="h-10 w-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-red-50">
      <div className="text-center max-w-md px-6">
        <AlertTriangle size={32} className="mx-auto text-red-400 mb-3" />
        <h1 className="text-lg font-bold text-gray-800 mb-2">{title}</h1>
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
function HeroSection({
  report,
  ringColor,
  labelText,
  overallScoreLabel,
  eyebrow,
  intro,
  locale,
}: {
  report: Report
  ringColor: string
  labelText: string
  overallScoreLabel: string
  eyebrow: string
  intro: string
  locale: string
}) {
  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(at 20% 30%, rgba(59,130,246,0.3) 0px, transparent 50%), radial-gradient(at 80% 70%, rgba(139,92,246,0.3) 0px, transparent 50%)",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-14 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col md:flex-row items-center justify-between gap-8"
        >
          <div className="text-center md:text-left flex-1">
            <p className="text-[11px] text-blue-300 font-semibold uppercase tracking-[0.2em] mb-2">
              {eyebrow}
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              {report.business_name}
            </h1>
            <p className="text-xs text-slate-300">
              Paradigm ·{" "}
              {new Date().toLocaleDateString(locale === "en" ? "en-US" : "ja-JP")}
            </p>
            <p className="text-sm text-slate-200 mt-4 max-w-md">{intro}</p>
          </div>

          <ScoreRing
            score={report.overall_score}
            color={ringColor}
            label={labelText}
            overallLabel={overallScoreLabel}
          />
        </motion.div>
      </div>
    </header>
  )
}

function ScoreRing({
  score,
  color,
  label,
  overallLabel,
}: {
  score: number
  color: string
  label: string
  overallLabel: string
}) {
  const clamped = Math.max(0, Math.min(100, score))
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (clamped / 100) * circumference
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      className="relative w-40 h-40 flex-shrink-0"
    >
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r="54"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
          fill="none"
        />
        <motion.circle
          cx="60"
          cy="60"
          r="54"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
        <p className="text-[9px] uppercase tracking-[0.15em] text-slate-300">
          {overallLabel}
        </p>
        <p className="text-4xl font-bold" style={{ color }}>
          {clamped}
        </p>
        <p className="text-[10px] text-slate-200">{label}</p>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
function AiSummaryCard({ summary, heading }: { summary: string; heading: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="relative bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-slate-100 p-6 md:p-8 overflow-hidden"
    >
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-blue-200/40 to-purple-200/40 blur-3xl rounded-full pointer-events-none" />
      <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-3 relative z-10">
        {heading}
      </h2>
      <p className="text-sm md:text-base text-slate-700 leading-relaxed whitespace-pre-wrap relative z-10">
        {summary}
      </p>
    </motion.section>
  )
}

// ─────────────────────────────────────────────────────────────
function ScoreCardsGrid({
  report,
  heading,
  labels,
}: {
  report: Report
  heading: string
  labels: {
    googleRating: string
    reviews: string
    unanswered: string
    hpSpeed: string
  }
}) {
  const cards = [
    {
      icon: <Star size={20} />,
      label: labels.googleRating,
      value: report.google_rating != null ? report.google_rating.toFixed(1) : "—",
      accent: "from-amber-100 to-amber-50",
      iconColor: "text-amber-500",
    },
    {
      icon: <MessageSquare size={20} />,
      label: labels.reviews,
      value:
        report.google_reviews_count != null
          ? report.google_reviews_count.toLocaleString()
          : "—",
      accent: "from-blue-100 to-blue-50",
      iconColor: "text-blue-500",
    },
    {
      icon: <AlertTriangle size={20} />,
      label: labels.unanswered,
      value:
        report.unanswered_reviews != null
          ? report.unanswered_reviews.toLocaleString()
          : "—",
      accent: "from-rose-100 to-rose-50",
      iconColor: "text-rose-500",
    },
    {
      icon: <Gauge size={20} />,
      label: labels.hpSpeed,
      value: report.hp_speed_score != null ? `${report.hp_speed_score}/100` : "—",
      accent: "from-emerald-100 to-emerald-50",
      iconColor: "text-emerald-600",
    },
  ]

  return (
    <section>
      <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-4">{heading}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className={`bg-gradient-to-br ${c.accent} rounded-xl p-4 md:p-5 border border-white/40`}
          >
            <div className={`${c.iconColor} mb-2`}>{c.icon}</div>
            <p className="text-[11px] md:text-xs font-medium text-slate-600 mb-1">
              {c.label}
            </p>
            <p className="text-xl md:text-2xl font-bold text-slate-900">{c.value}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
function IssuesSection({
  issues,
  heading,
  severity,
}: {
  issues: Issue[]
  heading: string
  severity: { high: string; medium: string; low: string }
}) {
  return (
    <section>
      <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-4">{heading}</h2>
      <div className="space-y-3">
        {issues.map((issue, i) => {
          const sev = (issue.severity || "medium").toLowerCase()
          const sevKey: "high" | "medium" | "low" =
            sev === "high" || sev === "critical"
              ? "high"
              : sev === "low" || sev === "minor"
                ? "low"
                : "medium"
          const sevStyle = {
            high: "bg-red-50 border-red-200 text-red-700",
            medium: "bg-amber-50 border-amber-200 text-amber-700",
            low: "bg-blue-50 border-blue-200 text-blue-700",
          }[sevKey]
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="bg-white rounded-xl border border-slate-100 p-4 md:p-5 flex gap-3 items-start"
            >
              <span
                className={`flex-shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full border ${sevStyle}`}
              >
                {severity[sevKey]}
              </span>
              <div className="min-w-0">
                <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-1">
                  {issue.title || issue.issue}
                </h3>
                {issue.description && (
                  <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                    {issue.description}
                  </p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
function CompetitorsSection({
  competitors,
  heading,
  cols,
}: {
  competitors: Competitor[]
  heading: string
  cols: { name: string; rating: string; reviews: string; strengths: string }
}) {
  return (
    <section>
      <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-4">{heading}</h2>
      <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left font-semibold text-slate-600 px-4 py-3 text-xs uppercase tracking-wide">
                {cols.name}
              </th>
              <th className="text-left font-semibold text-slate-600 px-4 py-3 text-xs uppercase tracking-wide">
                {cols.rating}
              </th>
              <th className="text-left font-semibold text-slate-600 px-4 py-3 text-xs uppercase tracking-wide">
                {cols.reviews}
              </th>
              <th className="text-left font-semibold text-slate-600 px-4 py-3 text-xs uppercase tracking-wide">
                {cols.strengths}
              </th>
            </tr>
          </thead>
          <tbody>
            {competitors.map((c, i) => (
              <tr
                key={i}
                className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
              >
                <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                <td className="px-4 py-3 text-slate-700">
                  {c.rating != null ? (
                    <span className="inline-flex items-center gap-1">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      {c.rating.toFixed(1)}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {c.reviews != null ? c.reviews.toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {c.strengths && c.strengths.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {c.strengths.map((s, si) => (
                        <span
                          key={si}
                          className="inline-block text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
function RecommendationsSection({
  recommendations,
  heading,
  priority,
  impactLabel,
}: {
  recommendations: Recommendation[]
  heading: string
  priority: { high: string; medium: string; low: string }
  impactLabel: string
}) {
  return (
    <section>
      <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-4">{heading}</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {recommendations.map((r, i) => {
          const p = (r.priority || "medium").toLowerCase()
          const pKey: "high" | "medium" | "low" =
            p === "high" || p === "critical"
              ? "high"
              : p === "low" || p === "minor"
                ? "low"
                : "medium"
          const ring = {
            high: "ring-2 ring-emerald-300",
            medium: "ring-1 ring-slate-200",
            low: "ring-1 ring-slate-200",
          }[pKey]
          const icon = {
            high: <TrendingUp size={16} className="text-emerald-600" />,
            medium: <CheckCircle2 size={16} className="text-blue-500" />,
            low: <Shield size={16} className="text-slate-400" />,
          }[pKey]
          return (
            <motion.article
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className={`bg-white rounded-xl p-5 ${ring}`}
            >
              <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  {priority[pKey]}
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                {r.title}
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed mb-3">
                {r.description}
              </p>
              {r.impact && (
                <div className="text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">{impactLabel}: </span>
                  {r.impact}
                </div>
              )}
            </motion.article>
          )
        })}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
function CtaSection({
  heading,
  subheading,
  button,
  email,
  locale,
}: {
  heading: string
  subheading: string
  button: string
  email: string
  locale: string
}) {
  const bookHref = locale === "en" ? "/en/contact?ref=report" : "/ja/contact?ref=report"
  const mailHref = "mailto:info@paradigmjp.com?subject=Report%20Follow-up"
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.97 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 md:p-12 text-white text-center"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.15),transparent_60%)]" />
      </div>
      <div className="relative z-10">
        <Globe size={28} className="mx-auto mb-3 opacity-80" />
        <h2 className="text-xl md:text-2xl font-bold mb-2">{heading}</h2>
        <p className="text-sm md:text-base text-white/90 mb-6 max-w-xl mx-auto">
          {subheading}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
          <a
            href={bookHref}
            className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold px-6 py-3 rounded-full hover:bg-blue-50 transition shadow-lg"
          >
            <Calendar size={16} />
            {button}
          </a>
          <a
            href={mailHref}
            className="inline-flex items-center gap-2 bg-white/10 text-white font-medium px-6 py-3 rounded-full hover:bg-white/20 transition backdrop-blur-sm"
          >
            <Mail size={16} />
            {email}
          </a>
        </div>
      </div>
    </motion.section>
  )
}
