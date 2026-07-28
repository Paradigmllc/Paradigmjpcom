"use client"

import { AlertTriangle, CheckCircle2, Copy, ExternalLink, Gauge, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ManualJapanEntryWorkRow } from "@/lib/sales/manual-japan-entry-types"
import { manualWorkOperatorNotice } from "@/lib/sales/manual-work-operator-notice"

type JsonRecord = Record<string, unknown>

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(record).filter((item): item is JsonRecord => Boolean(item)) : []
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function sourceLink(source: string): URL | null {
  if (!/^https:\/\//i.test(source)) return null
  try {
    const url = new URL(source)
    return url.protocol === "https:" ? url : null
  } catch {
    return null
  }
}

function strategyRows(value: unknown): Array<[string, string]> {
  const data = record(value)
  if (!data) return []
  const candidates: Array<[string, string | null]> = [
    ["企業固有の仮説", text(data.companyThesis) ?? text(data.primaryObservation)],
    ["日本で検証する論点", text(data.japanQuestion) ?? text(data.japanGap)],
    ["Why now", text(data.whyNow)],
    ["切り口", text(data.opportunityAngle)],
    ["CTA", text(data.cta)],
  ]
  return candidates.filter((row): row is [string, string] => Boolean(row[1]))
}

function editorialEvidence(item: ManualJapanEntryWorkRow): JsonRecord[] {
  const editorial = record(item.evidence.editorialBrief)
  const newEvidence = records(editorial?.evidence)
  if (newEvidence.length > 0) return newEvidence
  return records(item.message_review.evidence_pack)
}

function generationLabel(review: JsonRecord): string {
  const engine = text(review.generation_engine) ?? ""
  const status = text(review.generation_status) ?? ""
  if (/gpt56|gpt-5\.6/i.test(`${engine} ${status}`)) return "GPT-5.6 Terra + Sol 編集で採用"
  if (/deepseek/i.test(engine)) return "旧DeepSeek工程で採用"
  return "品質ゲート通過"
}

function usageSummary(review: JsonRecord): {
  calls: number
  promptTokens: number
  completionTokens: number
  model: string | null
} | null {
  const usage = record(review.usage) ?? record(review.generation_usage)
  if (!usage) return null
  const calls = number(usage.calls) ?? number(usage.requests) ?? number(review.attempts) ?? 0
  const promptTokens = number(usage.promptTokens) ?? number(usage.prompt_tokens) ?? 0
  const completionTokens = number(usage.completionTokens) ?? number(usage.completion_tokens) ?? 0
  const model = text(usage.model) ?? text(review.critic_model) ?? text(review.draft_model)
  if (calls === 0 && promptTokens === 0 && completionTokens === 0 && !model) return null
  return { calls, promptTokens, completionTokens, model }
}

function dimensionRows(review: JsonRecord): Array<[string, number]> {
  const dimensions = record(review.dimensions) ?? record(record(review.personalization)?.dimensions)
  if (!dimensions) return []
  const values: Array<[string, number | null]> = [
    ["企業固有性", number(dimensions.companySpecificity)],
    ["戦略の中身", number(dimensions.strategicSubstance) ?? number(dimensions.commercialRelevance)],
    ["自然さ", number(dimensions.naturalness) ?? number(dimensions.languageIntegrity)],
    ["経営者への関連性", number(dimensions.executiveRelevance) ?? number(dimensions.narrativeOriginality)],
  ]
  return values.filter((row): row is [string, number] => row[1] !== null)
}

export function ManualMessageIntelligence({ item, onCopy }: {
  item: ManualJapanEntryWorkRow
  onCopy: (value: string, label: string) => void
}) {
  const review = item.message_review
  if (!item.initial_message) {
    const notice = manualWorkOperatorNotice(item)
    const fastQualification = item.evidence.analysis_mode === "fast_qualification"
    const qualityFailure = review.generation_status === "failed_quality_gate"
    return (
      <section className={`overflow-hidden rounded-xl border ${qualityFailure ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`} aria-label="フォーム文面の生成状況">
        <div className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold ${qualityFailure ? "text-amber-950" : "text-slate-800"}`}>
          <AlertTriangle className={`size-4 ${qualityFailure ? "text-amber-700" : "text-slate-500"}`} />
          {qualityFailure ? "採用品質に届く文面を作れませんでした" : fastQualification ? "送信文はまだ作成していません" : "企業別文面は未生成です"}
        </div>
        <div className={`border-t px-4 py-3 text-xs leading-5 ${qualityFailure ? "border-amber-200 text-amber-900" : "border-slate-200 text-slate-600"}`}>
          <p>{notice?.detail ?? "送信文はありません。"}</p>
          {qualityFailure && text(review.error) && <p className="mt-2 rounded-lg border border-amber-200 bg-white p-3">{text(review.error)}</p>}
          {fastQualification && <p className="mt-2 font-semibold text-slate-700">残す企業だけ、複数ページ調査とGPT-5.6編集工程へ進めます。定型文は生成しません。</p>}
        </div>
      </section>
    )
  }

  const score = number(review.score)
  const rows = strategyRows(review.strategy)
  const facts = editorialEvidence(item)
  const usage = usageSummary(review)
  const dimensions = dimensionRows(review)
  const critique = text(review.critique)

  return (
    <details className="overflow-hidden rounded-xl border border-slate-200 bg-white" open>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-800 marker:hidden">
        <MessageSquareText className="size-4 text-blue-600" />企業別フォーム文面（未送信）
        <span className="ml-auto flex flex-wrap gap-1.5">
          {score !== null && <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">編集品質 {score}</Badge>}
          {facts.length > 0 && <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">使用根拠 {facts.length}件</Badge>}
        </span>
      </summary>
      <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-4">
        <div className="rounded-xl border border-blue-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-800"><CheckCircle2 className="size-4" />{generationLabel(review)}</div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">{item.initial_message}</p>
          <Button variant="outline" size="sm" className="mt-3 rounded-lg" onClick={() => onCopy(item.initial_message ?? "", "初回文面")}><Copy />コピー</Button>
        </div>

        {dimensions.length > 0 && <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/60 p-4" aria-label="企業別文面品質ゲート"><p className="text-xs font-semibold text-fuchsia-950">GPT-5.6編集評価</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{dimensions.map(([label, value]) => <div key={label} className="rounded-lg border border-fuchsia-100 bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-700">{label}</p><p className="mt-1 text-sm font-semibold text-slate-900">{value} / 25</p></div>)}</div>{critique && <p className="mt-3 text-xs leading-5 text-fuchsia-900">{critique}</p>}</div>}

        {usage && <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs text-violet-950"><span className="inline-flex items-center gap-2 font-semibold"><Gauge className="size-4" />高品質編集 {usage.calls} calls</span>{usage.model && <span>{usage.model}</span>}<span>Input {usage.promptTokens.toLocaleString("en-US")}</span><span>Output {usage.completionTokens.toLocaleString("en-US")}</span></div>}

        {rows.length > 0 && <div><p className="flex items-center gap-2 text-xs font-semibold text-slate-700"><Sparkles className="size-4 text-violet-600" />この企業に固有の文面設計</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-xs leading-5 text-slate-700">{value}</p></div>)}</div></div>}

        {facts.length > 0 && <details className="rounded-xl border border-slate-200 bg-white"><summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-700 marker:hidden"><ShieldCheck className="size-4 text-emerald-600" />文章に使用した公開根拠<span className="ml-auto font-normal text-slate-500">内部確認用</span></summary><div className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-2">{facts.map((fact, index) => { const statement = text(fact.statement); const source = text(fact.sourceUrl) ?? text(fact.source); const link = source ? sourceLink(source) : null; return <div key={text(fact.id) ?? String(index)} className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600"><p className="text-slate-700">{statement}</p>{link && <a href={link.toString()} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 font-medium text-blue-700 hover:underline">出典を確認<ExternalLink className="size-3" /></a>}</div> })}</div></details>}
      </div>
    </details>
  )
}
