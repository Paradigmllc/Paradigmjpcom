"use client"

import { AlertTriangle, CheckCircle2, Copy, ExternalLink, FileText, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ManualJapanEntryWorkRow } from "@/lib/sales/manual-japan-entry-types"
import { manualChatGptBrief } from "@/lib/sales/manual-work-chatgpt-handoff"
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

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : []
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

function isImported(item: ManualJapanEntryWorkRow): boolean {
  return item.evidence.analysis_mode === "chatgpt_manual_import"
    || item.message_review.generation_status === "imported_chatgpt_pro"
}

export function ManualMessageIntelligence({ item, onCopy }: {
  item: ManualJapanEntryWorkRow
  onCopy: (value: string, label: string) => void
}) {
  const review = item.message_review
  const brief = manualChatGptBrief(item)
  const mode = typeof item.evidence.analysis_mode === "string" ? item.evidence.analysis_mode : ""

  if (!item.initial_message) {
    const notice = manualWorkOperatorNotice(item)
    const insufficient = review.generation_status === "chatgpt_insufficient"
    const briefReady = mode === "chatgpt_brief_ready" && Boolean(brief) && !insufficient
    const fastQualification = mode === "fast_qualification"
    return (
      <section className={`overflow-hidden rounded-xl border ${insufficient ? "border-amber-200 bg-amber-50" : briefReady ? "border-violet-200 bg-violet-50" : "border-slate-200 bg-slate-50"}`} aria-label="フォーム文面の準備状況">
        <div className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold ${insufficient ? "text-amber-950" : briefReady ? "text-violet-950" : "text-slate-800"}`}>
          {briefReady ? <FileText className="size-4 text-violet-700" /> : <AlertTriangle className="size-4 text-slate-500" />}
          {insufficient ? "ChatGPTが根拠不足と判断しました" : briefReady ? "ChatGPT用ブリーフ準備済み" : fastQualification ? "送信文はまだ作成していません" : "旧文面は送信対象外です"}
        </div>
        <div className={`border-t px-4 py-3 text-xs leading-5 ${insufficient ? "border-amber-200 text-amber-900" : briefReady ? "border-violet-200 text-violet-900" : "border-slate-200 text-slate-600"}`}>
          <p>{briefReady ? `公開根拠${brief?.evidence.length ?? 0}件を保存しました。上の「ChatGPT Pro handoff」から最大15社をまとめてコピーできます。` : notice?.detail ?? "送信文はありません。"}</p>
          {briefReady && <p className="mt-2 font-semibold">文章生成APIは呼び出していません。ChatGPT Proの返却JSONを取り込むまで文面は保存されません。</p>}
          {insufficient && text(review.insufficiency_reason) && <p className="mt-2 rounded-lg border border-amber-200 bg-white p-3">{text(review.insufficiency_reason)}</p>}
          {fastQualification && <p className="mt-2 font-semibold text-slate-700">残す企業だけブリーフ準備へ進めてください。</p>}
        </div>
      </section>
    )
  }

  const score = number(review.score)
  const subject = text(review.subject)
  const reasoningSummary = text(review.reasoning_summary)
  const evidenceIds = new Set(strings(review.evidence_ids))
  const facts = (brief?.evidence ?? []).filter((point) => evidenceIds.size === 0 || evidenceIds.has(point.id))
  const validation = record(review.validation)
  const imported = isImported(item)

  return (
    <details className="overflow-hidden rounded-xl border border-slate-200 bg-white" open>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-800 marker:hidden">
        <MessageSquareText className="size-4 text-blue-600" />企業別フォーム文面（未送信）
        <span className="ml-auto flex flex-wrap gap-1.5">
          {imported && <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">ChatGPT Pro取込</Badge>}
          {score !== null && <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">自己評価 {score}</Badge>}
          {facts.length > 0 && <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">使用根拠 {facts.length}件</Badge>}
        </span>
      </summary>
      <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-4">
        <div className="rounded-xl border border-blue-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-800"><CheckCircle2 className="size-4" />ChatGPT Pro手動バッチから取込・機械検証済み</div>
          {subject && <p className="mt-3 text-xs font-semibold text-slate-600">Subject: <span className="text-slate-900">{subject}</span></p>}
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">{item.initial_message}</p>
          <Button variant="outline" size="sm" className="mt-3 rounded-lg" onClick={() => onCopy(item.initial_message ?? "", "初回文面")}><Copy />コピー</Button>
        </div>

        {(reasoningSummary || validation) && <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/60 p-4"><p className="flex items-center gap-2 text-xs font-semibold text-fuchsia-950"><Sparkles className="size-4" />取込時の判断と検証</p>{reasoningSummary && <p className="mt-2 text-xs leading-5 text-fuchsia-900">{reasoningSummary}</p>}<div className="mt-3 flex flex-wrap gap-2 text-[11px] text-fuchsia-900">{number(validation?.word_count) !== null && <span className="rounded-full border border-fuchsia-200 bg-white px-2.5 py-1">本文 {number(validation?.word_count)}語</span>}{validation?.similarity_passed === true && <span className="rounded-full border border-fuchsia-200 bg-white px-2.5 py-1">類似度ゲート通過</span>}{number(validation?.max_similarity) !== null && <span className="rounded-full border border-fuchsia-200 bg-white px-2.5 py-1">最大類似 {Math.round((number(validation?.max_similarity) ?? 0) * 100)}%</span>}</div></div>}

        {facts.length > 0 && <details className="rounded-xl border border-slate-200 bg-white"><summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-700 marker:hidden"><ShieldCheck className="size-4 text-emerald-600" />文章に使用した公開根拠<span className="ml-auto font-normal text-slate-500">内部確認用</span></summary><div className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-2">{facts.map((fact) => { const link = sourceLink(fact.sourceUrl); return <div key={fact.id} className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600"><p className="font-mono text-[10px] text-slate-400">{fact.id} · {fact.pageKind}</p><p className="mt-1 text-slate-700">{fact.statement}</p>{link && <a href={link.toString()} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 font-medium text-blue-700 hover:underline">出典を確認<ExternalLink className="size-3" /></a>}</div> })}</div></details>}
      </div>
    </details>
  )
}
