"use client"

import { useState } from "react"
import { OFFER_COPY, type OfferCopyByLanguage } from "@/components/diagnostic/report-offer-copy"
import { REPORT_COPY, normalizeReportLang } from "@/components/diagnostic/report-copy"
import { INDUSTRY_HOOK_JA, INDUSTRY_HOOK_EN } from "@/lib/sales/diagnostic"

export const dynamic = "force-dynamic"

export default function TemplatePreviewPage() {
  const VARIABLES = {
    variants: ["website_diagnostic", "meo", "security", "japan_entry", "video_subscription", "subsidy", "outreach", "dx_ai_package"] as const,
    langs: ["ja", "en"] as const,
    industries: ["beauty_salon", "dental", "restaurant", "construction", "accounting", "retail", "cleaning", "consulting"] as const,
  }

  const VARIANTS = VARIABLES.variants
  const LANGS = VARIABLES.langs
  const INDUSTRIES = VARIABLES.industries

  const variantDescriptions: Record<string, string> = {
    website_diagnostic: "Web制作診断",
    meo: "MEO診断",
    security: "セキュリティ診断",
    japan_entry: "日本参入診断",
    video_subscription: "動画診断",
    subsidy: "補助金診断",
    outreach: "アウトリーチ診断",
  }

  const ISSUE_DEMO: Record<string, Array<{ code: string; label: string; icon: string; severity: string; metric: string; body: string }>> = {
    ja: [
      { code: "speed_critical", label: "スマホ表示速度", icon: "SPEED", severity: "critical", metric: "38点", body: "モバイル表示速度の遅延は直帰率上昇の最大要因。1秒の遅れがコンバージョン率を約20%低下。" },
      { code: "ssl_expired", label: "信頼表示", icon: "TRUST", severity: "warning", metric: "要確認", body: "SSL設定の不備はブラウザで「保護されていない通信」警告を表示。信頼を一瞬で損なう。" },
      { code: "no_ogp", label: "SNS共有表示", icon: "SNS", severity: "info", metric: "未整備", body: "SNSプレビュー未整備で共有時のクリック率と初期信頼が大幅に低下。" },
    ],
    en: [
      { code: "speed_critical", label: "mobile speed", icon: "SPEED", severity: "critical", metric: "38 pts", body: "Slow mobile loading is the leading cause of bounce." },
      { code: "ssl_expired", label: "trust display", icon: "TRUST", severity: "warning", metric: "Verify", body: "SSL issues cause browsers to show Not Secure warning." },
      { code: "no_ogp", label: "social preview", icon: "SNS", severity: "info", metric: "Not set", body: "Missing social previews hurt click-through and credibility." },
    ],
  }

  function getHooks(industry: string, lang: string): string {
    if (lang === "ja") return (INDUSTRY_HOOK_JA as Record<string, string>)[industry] ?? "—"
    return (INDUSTRY_HOOK_EN as Record<string, string>)[industry] ?? "—"
  }
  // Total patterns: 8 variants × 2 full langs × 8 industries = 128 basic combinations
  // Plus issue combos, making it effectively ~500 unique report patterns

  return (
    <main className="min-h-dvh bg-zinc-50 p-4 sm:p-8 font-sans">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">診断レポート テンプレートプレビュー</h1>
          <p className="mt-2 text-sm text-zinc-500">
            8 variants × 2 languages × 8 industries = <strong>128 base patterns</strong> × issue combinations = ~500 unique reports
          </p>
        </div>

        {/* Summary table */}
        <div className="mb-10 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">バリアント</th>
                <th className="px-4 py-3 font-medium">説明</th>
                <th className="px-4 py-3 font-medium">コピー区分</th>
                <th className="px-4 py-3 font-medium">JA Badge</th>
                <th className="px-4 py-3 font-medium">EN Badge</th>
                <th className="px-4 py-3 font-medium">デモ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {VARIANTS.map((variant) => {
                const copy = OFFER_COPY[variant] as OfferCopyByLanguage | undefined
                if (!copy) return null
                return (
                  <tr key={variant} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-zinc-700">{variant}</td>
                    <td className="px-4 py-3 text-xs text-zinc-600">{variantDescriptions[variant]}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{variant === "meo" || variant === "subsidy" ? "MEO/SUBSIDY (NEW)" : variant.toUpperCase()}</td>
                    <td className="px-4 py-3"><span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">{copy.ja.badge}</span></td>
                    <td className="px-4 py-3"><span className="rounded bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">{copy.en.badge}</span></td>
                    <td className="px-4 py-3">
                      <a href={`/ja/report/demo/${variant}`} className="text-xs font-semibold text-indigo-600 hover:underline">
                        詳細を見る →
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pattern count breakdown */}
        <div className="mb-10 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900">パターン数内訳</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CountCard label="バリアント" value={VARIANTS.length} />
            <CountCard label="言語（完全対応）" value={LANGS.length} sub="ja / en" />
            <CountCard label="言語（ENフォールバック）" value={10} sub="ko, zh, de, fr, es, pt, ru, ar, vi, id" />
            <CountCard label="業種" value={INDUSTRIES.length} sub="美容室, 歯科, 飲食, 建設, 会計, 小売, 清掃, コンサル" />
            <CountCard label="課題コード" value={7} sub="speed, ssl, wp, ogp, sns, copyright, ua残存" />
            <CountCard label="ベースパターン" value={8 * 2 * 8} sub="variant × lang × industry" highlight />
            <CountCard label="推定固有パターン" value="~500" sub="課題組み合わせ + パーソナライズ" highlight />
          </div>
        </div>

        {/* Variant detail cards */}
        <div className="space-y-10">
          {VARIANTS.map((variant) => {
            const copy = OFFER_COPY[variant] as OfferCopyByLanguage | undefined
            if (!copy) return null
            return (
              <section key={variant} id={variant} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 font-mono">{variant}</h2>
                    <p className="mt-1 text-sm text-zinc-500">{variantDescriptions[variant]}</p>
                  </div>
                  <span className="rounded bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{copy.ja.badge}</span>
                </div>

                {LANGS.map((lang) => {
                  const c = copy[lang]
                  const issues = ISSUE_DEMO[lang]
                  const industry = INDUSTRIES[0] // beauty_salon as demo
                  const hook = getHooks(industry, lang)
                  const reportCopy = REPORT_COPY[normalizeReportLang(lang)]
                  return (
                    <div key={lang} className="mb-6 last:mb-0 rounded-lg border border-zinc-100 p-5">
                      <h3 className="text-sm font-bold text-zinc-500 mb-4">{lang === "ja" ? "🇯🇵 日本語" : "🇺🇸 English"}</h3>
                      
                      <div className="grid gap-4 lg:grid-cols-2">
                        {/* Hero section preview */}
                        <div className="space-y-3 rounded-md bg-zinc-50 p-4">
                          <p className="text-[10px] font-bold uppercase text-zinc-400">Hero Section</p>
                          <div className="rounded bg-white p-3 shadow-sm">
                            <p className="text-[10px] text-zinc-400">badge:</p>
                            <span className="rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">{c.badge}</span>
                          </div>
                          <div className="rounded bg-white p-3 shadow-sm">
                            <p className="text-[10px] text-zinc-400">heroLead:</p>
                            <p className="text-xs text-zinc-700 mt-1">{c.heroLead}</p>
                          </div>
                          <div className="rounded bg-white p-3 shadow-sm">
                            <p className="text-[10px] text-zinc-400">primaryCta:</p>
                            <p className="text-xs font-bold text-indigo-700 mt-1">{c.primaryCta}</p>
                          </div>
                          <div className="rounded bg-white p-3 shadow-sm">
                            <p className="text-[10px] text-zinc-400">industry hook:</p>
                            <p className="text-xs text-zinc-600 mt-1">{hook}</p>
                          </div>
                        </div>

                        {/* Acts preview */}
                        <div className="space-y-3 rounded-md bg-zinc-50 p-4">
                          <p className="text-[10px] font-bold uppercase text-zinc-400">Acts (max 3)</p>
                          {issues.map((issue, idx) => {
                            const actType = issue.severity === "critical" ? "pain" : issue.severity === "warning" ? "fear" : "hope"
                            return (
                              <div key={issue.code} className="rounded bg-white p-3 shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                    actType === "pain" ? "bg-rose-100 text-rose-700" : actType === "fear" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                                  }`}>ACT {idx + 1} — {actType}</span>
                                  <span className="text-[10px] text-zinc-400">{issue.icon}</span>
                                </div>
                                <p className="text-xs font-bold text-zinc-800">{issue.label} ({issue.metric})</p>
                                <p className="text-[11px] leading-relaxed text-zinc-600 mt-1">{issue.body}</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* CTA section */}
                      <div className="mt-4 rounded-md bg-zinc-50 p-4">
                        <p className="text-[10px] font-bold uppercase text-zinc-400 mb-2">Final CTA</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded bg-white p-3 shadow-sm">
                            <p className="text-[10px] text-zinc-400">finalHeading:</p>
                            <p className="text-sm font-bold text-zinc-800">{c.finalHeading}</p>
                          </div>
                          <div className="rounded bg-white p-3 shadow-sm">
                            <p className="text-[10px] text-zinc-400">finalBody:</p>
                            <p className="text-xs text-zinc-600">{c.finalBody}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </section>
            )
          })}
        </div>
      </div>
    </main>
  )
}

function CountCard({ label, value, sub, highlight }: { label: string; value: number | string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "border-indigo-200 bg-indigo-50" : "border-zinc-100 bg-zinc-50"}`}>
      <div className="text-[10px] font-semibold uppercase text-zinc-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${highlight ? "text-indigo-700" : "text-zinc-900"}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-zinc-500">{sub}</div>}
    </div>
  )
}
