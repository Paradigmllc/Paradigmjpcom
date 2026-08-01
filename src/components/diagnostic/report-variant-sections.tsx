"use client"

import { motion } from "framer-motion"
import { CheckCircle2, MapPin, MessageSquare, Shield, TrendingUp } from "lucide-react"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"
import { AnnotatedScreenshot, BeforeAfterComparison, MobileComparison } from "./report-website-sections"
import { CompetitorComparison, FiveSecondAudit, SaviorPositioning } from "./report-pain-sections"
import { MarketPresenceSummary } from "./report-market-sections"
import { ProposalSection } from "./report-proposal-section"
import { VideoSampleSection, VideoFlowSection, SubsidyTableSection, OutreachFunnelSection, OutreachTestSection } from "./report-missing-sections"
import {
  buildJapanMarketMetrics,
  buildJapanRequirementChecks,
  buildSecurityChecks,
  type EvidenceCheck,
  type EvidenceStatus,
} from "./report-evidence"

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

const CHECK_STYLE: Record<EvidenceStatus, { card: string; icon: string; text: string }> = {
  pass: { card: "border-emerald-200 bg-emerald-50", icon: "text-emerald-600", text: "text-emerald-700" },
  fail: { card: "border-rose-200 bg-rose-50", icon: "text-rose-600", text: "text-rose-700" },
  unknown: { card: "border-zinc-200 bg-zinc-50", icon: "text-zinc-400", text: "text-zinc-500" },
}

// ─── MEO: Map Section ──────────────────────────────────────
export function MeoMapSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const meta = data.meta
  const place = asRecord(meta?.place)
  const placeName = typeof place?.name === "string" && place.name.trim() ? place.name : null
  const hasPlace = placeName !== null
  const rating = finiteNumber(place?.rating)
  const reviewCount = finiteNumber(place?.reviewCount)
  const address = typeof place?.address === "string" && place.address.trim() ? place.address : null
  const improvementChecks: Array<EvidenceCheck> = [
    {
      labelJa: "Googleビジネスプロフィールを検出",
      labelEn: "Google Business Profile detected",
      status: hasPlace ? "pass" : "unknown",
      detailJa: hasPlace ? "公開データで確認" : "未測定",
      detailEn: hasPlace ? "Observed in public data" : "Not measured",
    },
    {
      labelJa: "事業所住所を検出",
      labelEn: "Business address detected",
      status: address ? "pass" : "unknown",
      detailJa: address ? "公開データで確認" : "未測定",
      detailEn: address ? "Observed in public data" : "Not measured",
    },
    {
      labelJa: "口コミ評価 3.5以上",
      labelEn: "Review rating 3.5+",
      status: rating === null ? "unknown" : rating >= 3.5 ? "pass" : "fail",
      detailJa: rating === null ? "未測定" : `実測 ${rating}`,
      detailEn: rating === null ? "Not measured" : `Measured ${rating}`,
    },
    {
      labelJa: "口コミ数 10件以上",
      labelEn: "10+ reviews",
      status: reviewCount === null ? "unknown" : reviewCount >= 10 ? "pass" : "fail",
      detailJa: reviewCount === null ? "未測定" : `実測 ${reviewCount}件`,
      detailEn: reviewCount === null ? "Not measured" : `Measured ${reviewCount}`,
    },
  ]

  return (
    <section className="px-5 py-14" style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)" }}>
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-emerald-600" />
              <h2 className="text-xl font-bold text-zinc-900">
                {lang === "ja" ? "Googleマップ推定表示" : "Google Maps Estimated Listing"}
              </h2>
            </div>
            {hasPlace ? (
              <div className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
                <div className="text-lg font-bold text-zinc-900">{placeName}</div>
                {address && <div className="mt-1 text-sm text-zinc-500">{address}</div>}
                {rating !== null && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-2xl font-bold text-amber-500">{rating}</span>
                    <div className="flex">{"★★★★★".split("").map((s, i) => (
                      <span key={i} className={i < Math.round(rating) ? "text-amber-400" : "text-zinc-200"}>{s}</span>
                    ))}</div>
                    {reviewCount !== null && <span className="text-sm text-zinc-500">({reviewCount} reviews)</span>}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center">
                <MapPin className="mx-auto h-8 w-8 text-zinc-300" />
                <p className="mt-3 text-sm text-zinc-500">
                  {lang === "ja" ? "Google Placesデータが取得できませんでした。正確な情報はGoogleビジネスプロフィールでご確認ください。" : "Google Places data unavailable. Verify your Google Business Profile."}
                </p>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <h2 className="text-xl font-bold text-zinc-900">
                {lang === "ja" ? "MEO改善ポイント" : "MEO Improvement Points"}
              </h2>
            </div>
            <div className="space-y-3">
              {improvementChecks.map((item) => {
                const style = CHECK_STYLE[item.status]
                return (
                <div key={item.labelEn} className={`flex items-center gap-3 rounded-lg border p-3 ${style.card}`}>
                  {item.status === "pass" ? <CheckCircle2 className={`h-4 w-4 ${style.icon}`} /> : <Shield className={`h-4 w-4 ${style.icon}`} />}
                  <div>
                    <div className="text-sm text-zinc-700">{lang === "ja" ? item.labelJa : item.labelEn}</div>
                    <div className={`text-[10px] font-semibold ${style.text}`}>{lang === "ja" ? item.detailJa : item.detailEn}</div>
                  </div>
                </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── MEO: Reviews Section ───────────────────────────────────
export function MeoReviewsSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  return (
    <section className="px-5 py-14 bg-white border-t border-zinc-200">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="h-5 w-5 text-emerald-600" />
          <h2 className="text-xl font-bold text-zinc-900">
            {lang === "ja" ? "口コミ・評判分析" : "Review & Reputation Analysis"}
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { labelJa: "口コミ返信率", labelEn: "Review response rate", value: "—", status: "warning" },
            { labelJa: "最新口コミ日", labelEn: "Latest review date", value: "—", status: "warning" },
            { labelJa: "写真掲載数", labelEn: "Photo count", value: "—", status: "warning" },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-xs text-zinc-500 mb-2">{lang === "ja" ? item.labelJa : item.labelEn}</div>
              <div className="text-2xl font-bold text-zinc-900">{item.value}</div>
              <div className="mt-2 text-xs text-amber-600">{lang === "ja" ? "データ収集が必要" : "Data collection needed"}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Security: Scorecard Section ────────────────────────────
export function SecurityScorecardSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const checks = buildSecurityChecks(data)

  return (
    <section className="px-5 py-14" style={{ background: "linear-gradient(135deg, #fef2f2, #fee2e2)" }}>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-5 w-5 text-rose-600" />
          <h2 className="text-xl font-bold text-zinc-900">{lang === "ja" ? "セキュリティスコアカード" : "Security Scorecard"}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {checks.map((check, i) => {
            const style = CHECK_STYLE[check.status]
            return (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                className={`rounded-xl border p-5 shadow-sm ${style.card}`}>
                <div className="text-[10px] font-semibold uppercase text-zinc-500">{lang === "ja" ? check.labelJa : check.labelEn}</div>
                <div className={`mt-2 text-2xl font-bold ${style.text}`}>{lang === "ja" ? check.detailJa : check.detailEn}</div>
                <div className={`mt-1 text-[10px] font-bold ${style.text}`}>
                  {check.status === "pass"
                    ? (lang === "ja" ? "実測で確認" : "Measured")
                    : check.status === "fail"
                      ? (lang === "ja" ? "要対応" : "Action needed")
                      : (lang === "ja" ? "判定保留" : "Unknown")}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Security: Certificate Timeline ─────────────────────────
export function SecurityTimelineSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const crtsh = data.meta?.crtsh as Record<string, unknown> | undefined
  const ssl = data.meta?.ssl as Record<string, unknown> | undefined

  return (
    <section className="px-5 py-14 bg-white border-t border-zinc-200">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-xl font-bold text-zinc-900 mb-6">{lang === "ja" ? "SSL証明書履歴" : "SSL Certificate History"}</h2>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          {crtsh ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">{lang === "ja" ? "発行枚数" : "Total certs"}</span>
                <span className="font-bold text-zinc-900">{crtsh.total_certs as number}</span>
              </div>
              {!!crtsh.latest_cert && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">{lang === "ja" ? "最新証明書" : "Latest cert"}</span>
                  <span className="font-bold text-zinc-900">{(crtsh.latest_cert as Record<string,string>).issuer}</span>
                </div>
              )}
              {(ssl?.grade as string) && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">{lang === "ja" ? "SSLグレード" : "SSL Grade"}</span>
                  <span className={`font-bold ${((ssl?.grade as string) ?? "").startsWith("A") ? "text-emerald-600" : "text-rose-600"}`}>{ssl?.grade as string}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">{lang === "ja" ? "証明書データが取得できませんでした" : "Certificate data unavailable"}</p>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Security: Vulnerability Matrix ─────────────────────────
export function SecurityVulnMatrix({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const issues = data.acts.map((act) => ({
    label: act.headline,
    severity: act.severity,
    status: act.severity === "critical" ? "critical" : act.severity === "warning" ? "high" : "medium",
  }))

  return (
    <section className="px-5 py-14 bg-white border-t border-zinc-200">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-xl font-bold text-zinc-900 mb-6">{lang === "ja" ? "脆弱性マトリクス" : "Vulnerability Matrix"}</h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-3">{lang === "ja" ? "項目" : "Item"}</th>
                <th className="px-4 py-3">{lang === "ja" ? "深刻度" : "Severity"}</th>
                <th className="px-4 py-3">{lang === "ja" ? "ステータス" : "Status"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {issues.map((issue, i) => (
                <tr key={i} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-900">{issue.label}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      issue.severity === "critical" ? "bg-rose-100 text-rose-700" : issue.severity === "warning" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    }`}>{issue.severity}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      issue.status === "critical" ? "bg-rose-100 text-rose-700" : issue.status === "high" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    }`}>{issue.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function localizedUnknown(lang: string): string {
  return lang === "ja" ? "未測定" : "Not measured"
}

// ─── Japan Entry: Market Section ────────────────────────────
export function JapanMarketSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const marketData = asRecord(data.meta?.market_data)
  const metrics = buildJapanMarketMetrics(data, lang)
  const requirements = buildJapanRequirementChecks(data)

  return (
    <section className="px-5 py-16" style={{ background: "linear-gradient(160deg, #0a1628 0%, #172554 40%, #1e3a5f 70%, #0a1628 100%)" }}>
      <div className="mx-auto max-w-6xl text-white">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-blue-300 mb-4 border border-white/10">
            <TrendingUp className="h-3 w-3" />
            {lang === "ja" ? "日本市場参入機会" : "Japan Market Entry Opportunity"}
          </div>
          <h2 className="text-3xl font-bold">
            {lang === "ja" ? `${data.company_name} の日本市場ポテンシャル` : `${data.company_name}'s Japan Market Potential`}
          </h2>
        </div>

        {/* 4 key metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              icon={metric.icon}
              label={metric.label}
              value={metric.value}
              sub={metric.source}
              tone={metric.tone}
            />
          ))}
        </div>

        {/* Market context */}
        {marketData && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-lg">🏛️</span>
              <div>
                <div className="text-sm font-bold">{lang === "ja" ? "日本市場データ" : "Japan Market Data"}</div>
                <div className="text-xs text-blue-300">{typeof marketData.source === "string" ? marketData.source : localizedUnknown(lang)}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{typeof marketData.size === "string" ? marketData.size : localizedUnknown(lang)}</div>
                <div className="text-xs text-blue-300 mt-1">{lang === "ja" ? "市場規模" : "Market Size"}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{typeof marketData.growth === "string" ? marketData.growth : localizedUnknown(lang)}</div>
                <div className="text-xs text-blue-300 mt-1">{lang === "ja" ? "年率成長" : "Annual Growth"}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{typeof marketData.players === "string" ? marketData.players : localizedUnknown(lang)}</div>
                <div className="text-xs text-blue-300 mt-1">{lang === "ja" ? "事業者数" : "Players"}</div>
              </div>
            </div>
          </div>
        )}

        {/* Regulatory checklist */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="text-sm font-bold mb-4">{lang === "ja" ? "日本市場参入要件" : "Japan Entry Requirements"}</div>
          <p className="mb-4 text-xs leading-5 text-blue-200/80">
            {lang === "ja"
              ? "公開ページの自動確認結果であり、法令適合の認定や法的助言ではありません。"
              : "Public-page heuristic only; this is not legal advice or a compliance certification."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {requirements.map((item) => (
              <div key={item.labelEn} className={`flex items-center gap-3 rounded-xl border p-4 ${item.status === "pass" ? "border-emerald-500/20 bg-emerald-500/10" : item.status === "fail" ? "border-rose-500/20 bg-rose-500/10" : "border-white/10 bg-white/5"}`}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${item.status === "pass" ? "bg-emerald-500/20 text-emerald-300" : item.status === "fail" ? "bg-rose-500/20 text-rose-300" : "bg-white/10 text-blue-200"}`}>
                  {item.status === "pass" ? "✓" : item.status === "fail" ? "!" : "?"}
                </span>
                <div>
                  <div className="text-sm font-medium text-white">{lang === "ja" ? item.labelJa : item.labelEn}</div>
                  <div className="text-xs text-blue-300">{lang === "ja" ? item.detailJa : item.detailEn}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function MetricCard({ icon, label, value, sub, tone }: { icon: string; label: string; value: string; sub?: string; tone: string }) {
  const colors: Record<string, string> = {
    blue: "border-blue-500/20 bg-amber-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    rose: "border-rose-500/20 bg-rose-500/5",
    amber: "border-amber-500/20 bg-amber-500/5",
    zinc: "border-white/10 bg-white/5",
  }
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className={`rounded-xl border p-5 backdrop-blur ${colors[tone] ?? colors.zinc}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xs font-bold text-blue-300 uppercase">{label}</div>
      <div className="mt-1 text-xl font-bold text-white">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-blue-400/60">{sub}</div>}
    </motion.div>
  )
}

// ─── Japan Entry: Checklist ─────────────────────────────────
export function JapanChecklistSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const requirements = buildJapanRequirementChecks(data)
  const items = [
    { ja: requirements[0].labelJa, en: requirements[0].labelEn, status: requirements[0].status },
    { ja: requirements[1].labelJa, en: requirements[1].labelEn, status: requirements[1].status },
    {
      ja: "日本語の問い合わせフォーム",
      en: "Japanese contact form",
      status: data.contactFormUrl ? "pass" as const : "unknown" as const,
    },
    { ja: requirements[2].labelJa, en: requirements[2].labelEn, status: requirements[2].status },
    { ja: "日本語FAQ/サポートページ", en: "Japanese FAQ/support page", status: "unknown" as const },
    { ja: "会社概要（日本語）", en: "Company profile in Japanese", status: "unknown" as const },
  ]

  return (
    <section className="px-5 py-14 bg-white border-t border-zinc-200">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-xl font-bold text-zinc-900 mb-6">{lang === "ja" ? "日本参入チェックリスト" : "Japan Entry Checklist"}</h2>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500">{i + 1}</span>
              <span className="flex-1 text-sm text-zinc-700">{lang === "ja" ? item.ja : item.en}</span>
              {item.status === "pass" ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {lang === "ja" ? "公開データで確認" : "Observed"}
                </span>
              ) : item.status === "fail" ? (
                <span className="text-xs font-bold text-rose-600">{lang === "ja" ? "不足を検出" : "Gap detected"}</span>
              ) : (
                <span className="text-xs font-bold text-zinc-500">{lang === "ja" ? "未測定" : "Not measured"}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Japan Entry: Roadmap ───────────────────────────────────
export function JapanRoadmapSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const phases = [
    { ja: "Phase 1: 法規制対応", en: "Phase 1: Legal compliance", descJa: "特商法・APPI・資金決済法の確認と対応", descEn: "Review commercial law, privacy law, settlement law" },
    { ja: "Phase 2: ローカライズ", en: "Phase 2: Localization", descJa: "日本語サイト・FAQ・決済手段の整備", descEn: "Japanese site, FAQ, payment methods" },
    { ja: "Phase 3: 集客開始", en: "Phase 3: Launch", descJa: "SEO/MEO・広告・SNSの展開", descEn: "SEO, MEO, ads, social media launch" },
  ]

  return (
    <section className="px-5 py-14 bg-white border-t border-zinc-200">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-xl font-bold text-zinc-900 mb-6">{lang === "ja" ? "参入ロードマップ" : "Entry Roadmap"}</h2>
        <div className="relative">
          <div className="absolute left-4 top-0 h-full w-0.5 bg-blue-200" />
          {phases.map((phase, i) => (
            <div key={i} className="relative flex gap-4 pb-8 last:pb-0">
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                {i + 1}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-zinc-900">{lang === "ja" ? phase.ja : phase.en}</div>
                <div className="mt-1 text-sm text-zinc-500">{lang === "ja" ? phase.descJa : phase.descEn}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Generic variant-specific section router ────────────────
export function VariantSection({ sectionId, data, lang }: { sectionId: string; data: DiagnosticReportData; lang: string }) {
  switch (sectionId) {
    case "meo_map": return <MeoMapSection data={data} lang={lang} />
    case "meo_reviews": return <MeoReviewsSection data={data} lang={lang} />
    case "security_scorecard": return <SecurityScorecardSection data={data} lang={lang} />
    case "security_timeline": return <SecurityTimelineSection data={data} lang={lang} />
    case "security_vuln_matrix": return <SecurityVulnMatrix data={data} lang={lang} />
    case "japan_market": return <JapanMarketSection data={data} lang={lang} />
    case "japan_checklist": return <JapanChecklistSection data={data} lang={lang} />
    case "japan_roadmap": return <JapanRoadmapSection data={data} lang={lang} />
    case "annotated_screenshot": return <AnnotatedScreenshot data={data} lang={lang} />
    case "before_after": return <BeforeAfterComparison data={data} lang={lang} />
    case "mobile_comparison": return <MobileComparison data={data} lang={lang} />
    case "competitor_comparison": return <CompetitorComparison data={data} lang={lang} />
    case "five_second_audit": return <FiveSecondAudit data={data} lang={lang} />
    case "savior_positioning": return <SaviorPositioning data={data} lang={lang} />
    case "market_presence": return <MarketPresenceSummary data={data} lang={lang} />
    case "solution_proposal": return <ProposalSection data={data} lang={lang} />
    case "video_sample": return <VideoSampleSection data={data} lang={lang} />
    case "video_flow": return <VideoFlowSection data={data} lang={lang} />
    case "subsidy_table": return <SubsidyTableSection data={data} lang={lang} />
    case "outreach_funnel": return <OutreachFunnelSection data={data} lang={lang} />
    case "outreach_test": return <OutreachTestSection data={data} lang={lang} />
    default: return null
  }
}
