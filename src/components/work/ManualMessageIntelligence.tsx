"use client"

import { AlertTriangle, Calculator, CheckCircle2, Copy, ExternalLink, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ManualJapanEntryWorkRow } from "@/lib/sales/manual-japan-entry-types"
import { manualWorkOperatorNotice } from "@/lib/sales/manual-work-operator-notice"

type JsonRecord = Record<string, unknown>

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null
}
function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function strategyRows(value: unknown): Array<[string, string]> {
  const data = record(value)
  if (!data) return []
  return [
    ["固有の観察", text(data.primaryObservation)],
    ["Why now", text(data.whyNow)],
    ["想定する日本顧客", text(data.japaneseSegment)],
    ["未検証ギャップ", text(data.japanGap)],
    ["今回の切り口", text(data.opportunityAngle)],
    ["CTA設計", text(data.cta)],
    ["国別トーン調整", text(data.countryAdaptation)],
  ].filter((row): row is [string, string] => Boolean(row[1]))
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(record).filter((item): item is JsonRecord => Boolean(item)) : []
}

function sourceLink(source: string): URL | null {
  if (!/^https:\/\//i.test(source)) return null
  try {
    const url = new URL(source)
    return url.protocol === "https:" ? url : null
  } catch (error) {
    console.error("[manual-work] invalid internal evidence source:", { source, error })
    return null
  }
}

function projectionSnapshot(evidence: JsonRecord): Array<[string, string]> {
  const projection = record(evidence.message_projection)
  const visitRange = record(projection?.monthlyVisitRange)
  const assumptions = record(projection?.assumptions)
  const lowVisits = number(visitRange?.low)
  const highVisits = number(visitRange?.high)
  const conversionRate = number(assumptions?.conversionRate)
  const averageOrderValue = number(assumptions?.averageOrderValueUsd)
  const monthlyGap = number(projection?.monthlyOpportunityGapUsd)
  const scenarios = records(projection?.scenarios)
  const conservative = scenarios.find((scenario) => scenario.scenario === "conservative")
  const upside = scenarios.find((scenario) => scenario.scenario === "upside")
  const annualValue = (scenario: JsonRecord | undefined): number | null => {
    const months = records(scenario?.months).slice(0, 12)
    if (months.length < 12) return null
    return months.reduce((sum, month) => sum + (number(month.incrementalRevenueUsd) ?? 0), 0)
  }
  const annualLow = annualValue(conservative)
  const annualHigh = annualValue(upside)
  const format = (value: number) => Math.round(value).toLocaleString("en-US")
  const rows: Array<[string, string]> = []
  if (lowVisits !== null && highVisits !== null) rows.push(["推定月間PV", `${format(lowVisits)}–${format(highVisits)}`])
  if (lowVisits !== null && highVisits !== null && conversionRate !== null && averageOrderValue !== null) {
    rows.push(["仮説月商", `$${format(lowVisits * conversionRate * averageOrderValue)}–$${format(highVisits * conversionRate * averageOrderValue)}`])
  }
  if (monthlyGap !== null) rows.push(["月次機会差", `$${format(monthlyGap)}`])
  if (annualLow !== null && annualHigh !== null) rows.push(["初年度機会", `$${format(annualLow)}–$${format(annualHigh)}`])
  return rows
}

export function ManualMessageIntelligence({ item, onCopy }: {
  item: ManualJapanEntryWorkRow
  onCopy: (value: string, label: string) => void
}) {
  const review = item.message_review
  if (!item.initial_message) {
    const notice = manualWorkOperatorNotice(item)
    return (
      <section className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50" aria-label="フォーム文面の生成状況">
        <div className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-amber-950">
          <AlertTriangle className="size-4 text-amber-700" />企業別フォーム文面は未生成です
        </div>
        <div className="border-t border-amber-200 px-4 py-3 text-xs leading-5 text-amber-900">
          <p>{notice?.detail ?? "前回の生成結果が保存されていません。"}</p>
          <p className="mt-1 font-semibold">初回処理内の自動生成・品質修正・再生成は完了しています。</p>
        </div>
      </section>
    )
  }
  const rows = strategyRows(review.strategy)
  const drafts = records(review.candidates)
  const selectedIndex = number(review.selected_index) ?? 0
  const facts = records(review.evidence_pack)
  const score = number(review.score)
  const uniqueness = number(review.uniquenessScore)
  const projection = projectionSnapshot(item.evidence)

  return (
    <details className="overflow-hidden rounded-xl border border-slate-200 bg-white" open>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-800 marker:hidden">
        <MessageSquareText className="size-4 text-blue-600" />企業別フォーム文面（未送信）
        <span className="ml-auto flex gap-1.5">
          {score !== null && <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">品質 {score}</Badge>}
          {uniqueness !== null && <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">固有性 {uniqueness}</Badge>}
        </span>
      </summary>
      <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-4">
        <div className="rounded-xl border border-blue-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-800"><CheckCircle2 className="size-4" />DeepSeek批評で採用</div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">{item.initial_message}</p>
          <Button variant="outline" size="sm" className="mt-3 rounded-lg" onClick={() => onCopy(item.initial_message ?? "", "初回文面")}><Copy />コピー</Button>
        </div>
        {projection.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4"><p className="flex items-center gap-2 text-xs font-semibold text-amber-950"><Calculator className="size-4" />無料公開シグナルによる企業別試算</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{projection.map(([label, value]) => <div key={label} className="rounded-lg border border-amber-200 bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">{label}</p><p className="mt-1 text-sm font-semibold text-slate-900">{value}</p></div>)}</div><p className="mt-3 text-[11px] leading-5 text-amber-900">Tranco・Cloudflare Radar・Common Crawl・sitemap等の公開シグナルと業態別仮定による幅のある試算です。実測PV・実売上・保証値ではありません。</p></div>}
        {rows.length > 0 && <div><p className="flex items-center gap-2 text-xs font-semibold text-slate-700"><Sparkles className="size-4 text-violet-600" />企業別メッセージ戦略</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-xs leading-5 text-slate-700">{value}</p></div>)}</div></div>}
        {facts.length > 0 && <details className="rounded-xl border border-slate-200 bg-white"><summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-700 marker:hidden"><ShieldCheck className="size-4 text-emerald-600" />使用可能な根拠・出典（内部確認専用）<span className="ml-auto font-normal text-slate-500">本文には挿入しません</span></summary><div className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-2">{facts.map((fact, index) => { const statement = text(fact.statement); const source = text(fact.source); const link = source ? sourceLink(source) : null; return <div key={text(fact.id) ?? String(index)} className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600"><p className="text-slate-700">{statement}</p>{source && (link ? <a href={link.toString()} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 font-medium text-blue-700 hover:underline">出典を確認<ExternalLink className="size-3" /></a> : <p className="mt-1 text-[11px] text-slate-500">{source}</p>)}</div> })}</div></details>}
        {drafts.length > 1 && <details className="rounded-xl border border-slate-200 bg-white"><summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-semibold text-slate-700 marker:hidden">代替案 {drafts.length - 1}件（採用案と構成・CTAが異なるもののみ）</summary><div className="space-y-3 border-t border-slate-100 p-3">{drafts.map((draft, index) => index === selectedIndex ? null : <div key={`${text(draft.ctaType) ?? "draft"}-${index}`} className="rounded-lg bg-slate-50 p-3"><div className="flex flex-wrap gap-1.5"><Badge variant="outline">{text(draft.openingStyle) ?? "別の導入"}</Badge><Badge variant="outline">{text(draft.ctaType) ?? "別CTA"}</Badge></div><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-700">{text(draft.message)}</p>{text(draft.message) && <Button variant="outline" size="sm" className="mt-2 bg-white" onClick={() => onCopy(text(draft.message) ?? "", `代替案${index + 1}`)}><Copy />コピー</Button>}</div>)}</div></details>}
      </div>
    </details>
  )
}
