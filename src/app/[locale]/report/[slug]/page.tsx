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
// 2026-05-01 audit: AllInOneClient.tsx (2123 行) retire — ProposalRenderer のみで動作。
// ?legacy=1 escape hatch も廃止。ProspectData 型は lib/proposal/prospect-data に移管済み。
import type { ProspectData } from "@/lib/proposal/prospect-data"
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

  if (error || !data) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFBFD", color: "#1e293b" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <p style={{ fontSize: 28, marginBottom: 8 }}>🔒</p>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Page not found</h1>
        <p style={{ fontSize: 13, color: "#94a3b8" }}>{error || "Invalid URL"}</p>
      </div>
    </div>
  )

  // ProposalRenderer (Manifest-driven · 13 sections) のみで動作。
  return <ProposalRenderer data={data} />
}
