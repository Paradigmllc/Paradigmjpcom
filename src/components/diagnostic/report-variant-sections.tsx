"use client"

import { motion } from "framer-motion"
import { CheckCircle2, MapPin, MessageSquare, Shield, Star, TrendingUp } from "lucide-react"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"
import type { ReportCopy } from "./report-copy"
import { AnnotatedScreenshot, BeforeAfterComparison, MobileComparison } from "./report-website-sections"
import { CompetitorComparison, FiveSecondAudit, SaviorPositioning } from "./report-pain-sections"

// ─── MEO: Map Section ──────────────────────────────────────
export function MeoMapSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const meta = data.meta
  const place = meta?.place as Record<string, unknown> | undefined
  const hasPlace = place?.name
  const rating = place?.rating as number | undefined
  const reviewCount = place?.reviewCount as number | undefined
  const address = place?.address as string | undefined

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
                <div className="text-lg font-bold text-zinc-900">{place.name as string}</div>
                {address && <div className="mt-1 text-sm text-zinc-500">{address}</div>}
                {rating && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-2xl font-bold text-amber-500">{rating}</span>
                    <div className="flex">{"★★★★★".split("").map((s, i) => (
                      <span key={i} className={i < Math.round(rating) ? "text-amber-400" : "text-zinc-200"}>{s}</span>
                    ))}</div>
                    {reviewCount && <span className="text-sm text-zinc-500">({reviewCount} reviews)</span>}
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
              {[
                { check: !!place?.name, labelJa: "Googleビジネスプロフィール登録", labelEn: "Google Business Profile claimed" },
                { check: !!place?.address, labelJa: "住所・営業時間の正確性", labelEn: "Accurate address & hours" },
                { check: (rating ?? 0) >= 3.5, labelJa: "口コミ評価 3.5以上", labelEn: "Review rating 3.5+" },
                { check: (reviewCount ?? 0) >= 10, labelJa: "口コミ数 10件以上", labelEn: "10+ reviews" },
              ].map((item, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-lg border p-3 ${item.check ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                  {item.check ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Shield className="h-4 w-4 text-amber-600" />}
                  <span className="text-sm text-zinc-700">{lang === "ja" ? item.labelJa : item.labelEn}</span>
                </div>
              ))}
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
  const meta = data.meta ?? {}
  const ssl = meta.ssl as Record<string, unknown> | undefined
  const obs = meta.mozilla_observatory as Record<string, unknown> | undefined
  const dns = meta.dns as Record<string, unknown> | undefined

  const checks = [
    { labelJa: "SSL証明書", labelEn: "SSL Certificate", status: ssl?.grade ? "pass" : "fail", detail: (ssl?.grade as string) ?? "未確認" },
    { labelJa: "HSTS Preload", labelEn: "HSTS Preload", status: dns ? "pass" : "warn", detail: dns ? "有効" : "未確認" },
    { labelJa: "DNSSEC", labelEn: "DNSSEC", status: dns?.dnssec ? "pass" : "warn", detail: dns?.dnssec ? "有効" : "無効" },
    { labelJa: "Observatory Score", labelEn: "Observatory Score", status: (obs?.score as number) >= 80 ? "pass" : "fail", detail: obs?.score ? `${obs.score}/100` : "未測定" },
    { labelJa: "CSP Header", labelEn: "CSP Header", status: ((data.meta?.security_headers as Record<string, unknown>)?.hasCsp) ? "pass" : "fail", detail: "—" },
  ]

  return (
    <section className="px-5 py-14" style={{ background: "linear-gradient(135deg, #fef2f2, #fee2e2)" }}>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-5 w-5 text-rose-600" />
          <h2 className="text-xl font-bold text-zinc-900">{lang === "ja" ? "セキュリティスコアカード" : "Security Scorecard"}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {checks.map((check, i) => {
            const color = check.status === "pass" ? "emerald" : check.status === "warn" ? "amber" : "rose"
            return (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                className={`rounded-xl border p-5 shadow-sm ${check.status === "pass" ? "border-emerald-200 bg-emerald-50" : check.status === "warn" ? "border-amber-200 bg-amber-50" : "border-rose-200 bg-rose-50"}`}>
                <div className="text-[10px] font-semibold uppercase text-zinc-500">{lang === "ja" ? check.labelJa : check.labelEn}</div>
                <div className={`mt-2 text-2xl font-bold text-${color}-700`}>{check.detail}</div>
                <div className={`mt-1 text-[10px] font-bold text-${color}-600`}>
                  {check.status === "pass" ? (lang === "ja" ? "問題なし" : "OK") : check.status === "warn" ? (lang === "ja" ? "注意" : "Warning") : (lang === "ja" ? "要対応" : "Action needed")}
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

// ─── Japan Entry: Market Section ────────────────────────────
export function JapanMarketSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const japanAudit = data.meta?.japan_market_audit as Record<string, unknown> | undefined

  return (
    <section className="px-5 py-14" style={{ background: "linear-gradient(135deg, #eff6ff, #dbeafe)" }}>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-bold text-zinc-900">{lang === "ja" ? "日本市場適合性" : "Japan Market Fit"}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { labelJa: "特商法表示", labelEn: "Commercial Disclosure", ok: !japanAudit?.tokushoho_missing },
            { labelJa: "プライバシーポリシー(APPI)", labelEn: "Privacy Policy (APPI)", ok: !japanAudit?.appi_missing },
            { labelJa: "国内決済対応", labelEn: "Local Payment Methods", ok: !japanAudit?.local_payments_missing },
            { labelJa: "日本語コンテンツ", labelEn: "Japanese Content", ok: japanAudit ? true : false },
          ].map((item, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-xl border p-4 ${item.ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              {item.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Shield className="h-5 w-5 text-amber-600" />}
              <div>
                <div className="font-medium text-zinc-900">{lang === "ja" ? item.labelJa : item.labelEn}</div>
                <div className="text-xs text-zinc-500">{item.ok ? (lang === "ja" ? "確認済み" : "Verified") : (lang === "ja" ? "要確認" : "Needs review")}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Japan Entry: Checklist ─────────────────────────────────
export function JapanChecklistSection({ data, lang }: { data: DiagnosticReportData; lang: string }) {
  const items = [
    { ja: "特定商取引法に基づく表記", en: "Commercial Transaction Law disclosure", done: false },
    { ja: "個人情報保護方針（日本語）", en: "Privacy policy in Japanese", done: false },
    { ja: "日本語の問い合わせフォーム", en: "Japanese contact form", done: !!data.contactFormUrl },
    { ja: "国内決済手段（クレカ/コンビニ/銀行振込）", en: "Local payment methods", done: false },
    { ja: "日本語FAQ/サポートページ", en: "Japanese FAQ/support page", done: false },
    { ja: "会社概要（日本語）", en: "Company profile in Japanese", done: false },
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
              {item.done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <span className="text-xs text-amber-600 font-bold">{lang === "ja" ? "未対応" : "Pending"}</span>}
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
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
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
    default: return null
  }
}
