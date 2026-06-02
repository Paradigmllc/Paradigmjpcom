"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, ExternalLink, FileText, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import type { DashboardCompany, SalesDashboardData } from "@/lib/sales/dashboard"
import type { JapanReadinessInsightSummary } from "@/lib/sales/japan-readiness"
import { formatDate, formatNumber } from "./SalesCommandPanels"

interface ApiResponse {
  ok?: boolean
  insight?: JapanReadinessInsightSummary
  error?: string
}

function scoreTone(score: number): string {
  if (score >= 74) return "bg-emerald-50 text-emerald-700 ring-emerald-200"
  if (score >= 52) return "bg-amber-50 text-amber-800 ring-amber-200"
  return "bg-zinc-100 text-zinc-600 ring-zinc-200"
}

function priorityLabel(priority: string): string {
  if (priority === "high") return "高優先"
  if (priority === "medium") return "中優先"
  return "低優先"
}

function moneyRange(insight: JapanReadinessInsightSummary): string {
  if (insight.lossAmountUsdMin === null || insight.lossAmountUsdMax === null) return "未算定"
  return `$${formatNumber(insight.lossAmountUsdMin)}-${formatNumber(insight.lossAmountUsdMax)}`
}

function companyCandidates(data: SalesDashboardData): DashboardCompany[] {
  return data.companies
    .filter((company) => company.targetCountry !== "JP" || company.templateVariant === "japan_entry" || company.reportLocale === "en")
    .slice(0, 10)
}

function InsightCard({ insight }: { insight: JapanReadinessInsightSummary }) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-zinc-950">{insight.companyName ?? insight.domain ?? "Unknown company"}</h3>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${scoreTone(insight.japanEntryScore)}`}>
              {priorityLabel(insight.priority)}
            </span>
            {insight.status === "manual_review" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">
                <AlertTriangle size={12} aria-hidden />
                要レビュー
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-zinc-500">{insight.domain} / {formatDate(insight.updatedAt)}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right">
          <div>
            <p className="text-[11px] text-zinc-500">総合</p>
            <p className="text-lg font-semibold tabular-nums text-zinc-950">{insight.japanEntryScore}</p>
          </div>
          <div>
            <p className="text-[11px] text-zinc-500">日本PV</p>
            <p className="text-lg font-semibold tabular-nums text-zinc-950">{insight.japanVisitsEstimate === null ? "-" : formatNumber(insight.japanVisitsEstimate)}</p>
          </div>
          <div>
            <p className="text-[11px] text-zinc-500">損失仮説</p>
            <p className="text-sm font-semibold tabular-nums text-zinc-950">{moneyRange(insight)}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-4">
        <MiniMetric label="集客" value={insight.trafficScore} />
        <MiniMetric label="決済ギャップ" value={insight.paymentGapScore} />
        <MiniMetric label="法務レビュー" value={insight.legalGapScore} />
        <MiniMetric label="支払余力" value={insight.abilityToPayScore} />
      </div>
      {insight.gaps.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {insight.gaps.slice(0, 4).map((gap) => (
            <span key={`${gap.type}-${gap.title}`} className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] text-zinc-600">
              {gap.title}
            </span>
          ))}
        </div>
      )}
      {insight.coldEmailSubject && (
        <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs font-semibold text-zinc-800">{insight.coldEmailSubject}</p>
          <p className="mt-2 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-zinc-600">{insight.coldEmailBody}</p>
        </div>
      )}
    </article>
  )
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-950">{value}</p>
    </div>
  )
}

export function SalesJapanReadinessPanel({ data }: { data: SalesDashboardData }) {
  const [insights, setInsights] = useState<JapanReadinessInsightSummary[]>(data.japanReadinessInsights)
  const [runningId, setRunningId] = useState<string | null>(null)
  const candidates = useMemo(() => companyCandidates(data), [data])
  const insightIds = new Set(insights.map((insight) => insight.companyId))

  async function generate(company: DashboardCompany) {
    setRunningId(company.id)
    try {
      const res = await fetch(`/api/sales/companies/${company.id}/japan-readiness`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_audit: true, probe_shopify: true, use_dify: true }),
      })
      const json = (await res.json()) as ApiResponse
      if (!res.ok || !json.ok || !json.insight) throw new Error(json.error ?? `HTTP ${res.status}`)
      setInsights((current) => [json.insight as JapanReadinessInsightSummary, ...current.filter((item) => item.companyId !== company.id)].slice(0, 8))
      toast.success("日本進出インサイトを生成しました。送信前レビューに回せます。")
    } catch (error) {
      console.error("[japan-readiness-ui] generate failed:", error)
      toast.error(error instanceof Error ? error.message : "日本進出インサイトの生成に失敗しました。")
    } finally {
      setRunningId(null)
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Japan Readiness</p>
          <h2 className="mt-1 text-base font-semibold text-zinc-950">日本進出スコアリングとDify文面</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-500">
            公開ページ監査、技術スタック、Shopify products.json、既存トラフィックmetaから、日本向けの余白を仮説化します。法務・決済・売上断定は送信前レビュー前提です。
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
          <FileText size={14} aria-hidden />
          {formatNumber(insights.length)}件生成済み
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-zinc-950">候補会社</h3>
            <span className="text-xs text-zinc-500">上位{formatNumber(candidates.length)}件</span>
          </div>
          {candidates.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500">
              候補会社がありません。SearxNG取り込みかCSVバッチから海外向けリードを追加してください。
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {candidates.map((company) => (
                <div key={company.id} className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-950">{company.companyName}</p>
                    <p className="truncate text-xs text-zinc-500">{company.domain}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => generate(company)}
                    disabled={runningId !== null}
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`${company.companyName}の日本進出スコアを生成`}
                  >
                    {runningId === company.id ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Sparkles size={14} aria-hidden />}
                    {insightIds.has(company.id) ? "再生成" : "生成"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {insights.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center">
              <ExternalLink size={20} className="mx-auto text-zinc-400" aria-hidden />
              <p className="mt-2 text-sm font-medium text-zinc-800">まだ日本進出インサイトはありません</p>
              <p className="mt-1 text-sm text-zinc-500">候補会社から生成すると、スコア・証拠・送信用文面がここに表示されます。</p>
            </div>
          ) : (
            insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)
          )}
        </div>
      </div>
    </section>
  )
}
