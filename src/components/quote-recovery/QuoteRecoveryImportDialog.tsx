"use client"

import { AlertTriangle, CheckCircle2, FileSpreadsheet, X } from "lucide-react"
import type { QuoteInput } from "@/lib/quote-recovery/types"

export type PendingQuoteImport = {
  fileName: string
  rows: QuoteInput[]
  failures: Array<{ row: number; message: string }>
  detectedHeaders: string[]
}

type Props = {
  pending: PendingQuoteImport
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}

function yen(value: number): string {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value)
}

export function QuoteRecoveryImportDialog({ pending, busy, onCancel, onConfirm }: Props) {
  const total = pending.rows.reduce((sum, row) => sum + row.amount, 0)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="import-preview-title">
      <div className="my-auto w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Import preview</p><h2 id="import-preview-title" className="mt-2 text-xl font-bold">取込前に内容を確認</h2><p className="mt-1 text-sm text-slate-500">{pending.fileName}</p></div><button type="button" onClick={onCancel} disabled={busy} aria-label="取込プレビューを閉じる" className="flex size-10 items-center justify-center rounded-xl hover:bg-slate-100"><X className="size-5" /></button></div>
        <div className="max-h-[65dvh] overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-700">取込可能</p><p className="mt-2 text-2xl font-bold text-emerald-950">{pending.rows.length}件</p></div><div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-700">除外・要確認</p><p className="mt-2 text-2xl font-bold text-amber-950">{pending.failures.length}件</p></div><div className="rounded-2xl bg-violet-50 p-4"><p className="text-xs font-semibold text-violet-700">見積金額合計</p><p className="mt-2 text-2xl font-bold text-violet-950">{yen(total)}</p></div></div>
          <div className="mt-5 rounded-2xl border border-slate-200 p-4"><p className="flex items-center gap-2 text-sm font-bold"><CheckCircle2 className="size-4 text-emerald-600" />認識した列</p><div className="mt-3 flex flex-wrap gap-2">{pending.detectedHeaders.map((header) => <span key={header} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{header}</span>)}</div><p className="mt-3 text-xs leading-5 text-slate-500">見積番号・顧客名・見積日・見積金額を自動判定します。担当者・最終接触日・次回予定日・ステータスは任意です。</p></div>
          {pending.failures.length > 0 && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="flex items-center gap-2 text-sm font-bold text-amber-900"><AlertTriangle className="size-4" />除外される行</p>{pending.failures.slice(0, 8).map((failure) => <p key={`${failure.row}-${failure.message}`} className="mt-2 text-xs leading-5 text-amber-800">{failure.row}行目：{failure.message}</p>)}</div>}
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">見積番号</th><th className="px-4 py-3">顧客名</th><th className="px-4 py-3">見積日</th><th className="px-4 py-3">金額</th><th className="px-4 py-3">担当者</th></tr></thead><tbody className="divide-y divide-slate-100">{pending.rows.slice(0, 8).map((row) => <tr key={row.quoteId}><td className="px-4 py-3 font-semibold">{row.quoteId}</td><td className="px-4 py-3">{row.companyName}</td><td className="px-4 py-3">{row.quoteDate}</td><td className="px-4 py-3 font-semibold">{yen(row.amount)}</td><td className="px-4 py-3">{row.owner ?? "未設定"}</td></tr>)}</tbody></table></div>
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 p-5 sm:flex-row sm:justify-end sm:p-6"><button type="button" onClick={onCancel} disabled={busy} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold">キャンセル</button><button type="button" onClick={onConfirm} disabled={busy || pending.rows.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 text-sm font-bold text-white disabled:opacity-60"><FileSpreadsheet className="size-4" />{busy ? "取込中…" : `${pending.rows.length}件を取り込む`}</button></div>
      </div>
    </div>
  )
}
