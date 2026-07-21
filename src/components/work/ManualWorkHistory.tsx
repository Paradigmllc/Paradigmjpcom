"use client"

import { RefreshCw, Search, SlidersHorizontal } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { filterManualWorkItems, type ManualWorkHistoryFilter } from "@/lib/sales/manual-work-dashboard"
import type { ManualLeadSourceCatalogRow } from "@/lib/sales/manual-japan-entry-source-ledger"
import type { ManualJapanEntryWorkRow } from "@/lib/sales/manual-japan-entry-types"
import { ManualWorkHistoryItem, type ManualWorkOutcome } from "./ManualWorkHistoryItem"

const filters: Array<{ value: ManualWorkHistoryFilter; label: string }> = [
  { value: "all", label: "すべて" },
  { value: "action_required", label: "要確認" },
  { value: "completed", label: "Twenty保存" },
  { value: "sent", label: "手動送信済み" },
  { value: "failed", label: "失敗・対象外" },
]

export function ManualWorkHistory({ items, sources, historyError, running, updatingOutcome, onRefresh, onRetry, onCopy, onUpdateOutcome }: {
  items: ManualJapanEntryWorkRow[]
  sources: ManualLeadSourceCatalogRow[]
  historyError: string | null
  running: boolean
  updatingOutcome: string | null
  onRefresh: () => void
  onRetry: (item: ManualJapanEntryWorkRow) => void
  onCopy: (value: string, label: string) => void
  onUpdateOutcome: (item: ManualJapanEntryWorkRow, outcome: ManualWorkOutcome, value: boolean) => void
}) {
  const [filter, setFilter] = useState<ManualWorkHistoryFilter>("all")
  const [query, setQuery] = useState("")
  const sourceBySlug = useMemo(() => new Map(sources.map((source) => [source.slug, source])), [sources])
  const filteredItems = useMemo(() => filterManualWorkItems(items, filter, query), [filter, items, query])

  return (
    <section id="history" aria-labelledby="history-heading" className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Persistent workspace</p>
          <h2 id="history-heading" className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">解析履歴</h2>
          <p className="mt-1 text-sm text-slate-600">履歴・根拠・文面・成果イベントは専用DBに残り、リロードしても消えません。</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{filteredItems.length} / {items.length}件</span>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={running} aria-label="履歴を更新" className="rounded-lg bg-white"><RefreshCw className={running ? "animate-spin" : ""} />更新</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_14px_45px_-38px_rgba(15,23,42,0.5)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0" aria-label="履歴の状態絞り込み">
            <span className="grid size-9 shrink-0 place-items-center text-slate-400"><SlidersHorizontal className="size-4" /></span>
            {filters.map((option) => <button key={option.value} type="button" aria-pressed={filter === option.value} onClick={() => setFilter(option.value)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${filter === option.value ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}>{option.label}</button>)}
          </div>
          <label className="relative block w-full xl:w-72">
            <span className="sr-only">企業名またはドメインを検索</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="企業名・ドメインを検索" aria-label="企業名またはドメインを検索" className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-9 focus-visible:bg-white focus-visible:ring-slate-200" />
          </label>
        </div>
      </div>

      {historyError && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{historyError}</div>}
      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500"><Search className="size-5" /></div><p className="mt-4 font-semibold text-slate-700">まだ履歴はありません</p><p className="mt-1 text-sm text-slate-600">上の入力欄から最初の海外企業を解析してください。</p></div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><p className="font-semibold text-slate-700">条件に一致する履歴がありません</p><button type="button" onClick={() => { setFilter("all"); setQuery("") }} className="mt-2 text-sm font-semibold text-blue-700 hover:underline">絞り込みを解除</button></div>
      ) : (
        <div className="grid gap-4">{filteredItems.map((item) => <ManualWorkHistoryItem key={item.id} item={item} sourceBySlug={sourceBySlug} updatingOutcome={updatingOutcome} retrying={running} onRetry={onRetry} onCopy={onCopy} onUpdateOutcome={onUpdateOutcome} />)}</div>
      )}
    </section>
  )
}
