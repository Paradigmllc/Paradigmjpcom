"use client"

import { useMemo, useState } from "react"
import { ArrowDownAZ, Download, MessageSquarePlus, Search } from "lucide-react"
import type { QuoteRecoveryDashboardData } from "@/lib/quote-recovery/dashboard"

export type DashboardQuote = QuoteRecoveryDashboardData["quotes"][number]

type Props = {
  quotes: DashboardQuote[]
  compact?: boolean
  onActivity: (quote: DashboardQuote) => void
}

function yen(value: number): string {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value)
}

function PriorityBadge({ value }: { value: string }) {
  const style = value === "urgent" ? "bg-rose-50 text-rose-700" : value === "high" ? "bg-amber-50 text-amber-700" : value === "closed" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
  const label = value === "urgent" ? "緊急" : value === "high" ? "優先" : value === "closed" ? "完了" : "確認"
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>{label}</span>
}

function statusLabel(status: string): string {
  if (status === "won") return "受注"
  if (status === "lost") return "失注"
  return "進行中"
}

export function QuoteRecoveryQuotesPanel({ quotes, compact = false, onActivity }: Props) {
  const [query, setQuery] = useState("")
  const [priority, setPriority] = useState("all")
  const [status, setStatus] = useState("open")
  const [sort, setSort] = useState("score")
  const [limit, setLimit] = useState(50)

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return quotes
      .filter((quote) => !normalizedQuery || quote.customerName.toLowerCase().includes(normalizedQuery) || quote.externalQuoteId.toLowerCase().includes(normalizedQuery) || (quote.ownerName ?? "").toLowerCase().includes(normalizedQuery))
      .filter((quote) => priority === "all" || quote.recoveryPriority === priority)
      .filter((quote) => status === "all" || quote.status === status)
      .sort((left, right) => {
        if (sort === "amount") return right.amount - left.amount
        if (sort === "next") return (left.nextActionDate ?? "9999-12-31").localeCompare(right.nextActionDate ?? "9999-12-31")
        if (sort === "updated") return right.updatedAt.localeCompare(left.updatedAt)
        return right.recoveryScore - left.recoveryScore
      })
  }, [priority, query, quotes, sort, status])

  const visible = compact ? filtered.slice(0, 8) : filtered.slice(0, limit)

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-bold">優先見積案件</h2><p className="mt-1 text-xs text-slate-500">金額・経過日数・未設定項目から判定</p></div>
          {!compact && <a href="/api/quote-recovery/app/export" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:border-violet-300 hover:text-violet-700"><Download className="size-4" aria-hidden="true" />CSV出力</a>}
        </div>
        {!compact && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_150px_130px_160px]">
            <label className="relative"><span className="sr-only">案件を検索</span><Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" aria-hidden="true" /><input value={query} onChange={(event) => { setQuery(event.target.value); setLimit(50) }} placeholder="顧客名・見積番号・担当者で検索" className="h-10 w-full rounded-xl border border-slate-300 pl-9 pr-3 text-sm" /></label>
            <label><span className="sr-only">優先度で絞り込み</span><select value={priority} onChange={(event) => { setPriority(event.target.value); setLimit(50) }} className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"><option value="all">すべての優先度</option><option value="urgent">緊急</option><option value="high">優先</option><option value="watch">確認</option><option value="closed">完了</option></select></label>
            <label><span className="sr-only">状態で絞り込み</span><select value={status} onChange={(event) => { setStatus(event.target.value); setLimit(50) }} className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"><option value="all">全状態</option><option value="open">進行中</option><option value="won">受注</option><option value="lost">失注</option></select></label>
            <label className="relative"><span className="sr-only">並び順</span><ArrowDownAZ className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" aria-hidden="true" /><select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 w-full rounded-xl border border-slate-300 pl-9 pr-3 text-sm"><option value="score">優先スコア順</option><option value="amount">金額が高い順</option><option value="next">次回予定が近い順</option><option value="updated">更新が新しい順</option></select></label>
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="px-6 py-16 text-center text-sm text-slate-500">{quotes.length === 0 ? "見積CSVを取り込むと案件が表示されます。" : "条件に一致する案件はありません。"}</div>
      ) : (
        <>
          <div className="divide-y divide-slate-100 lg:hidden">
            {visible.map((quote) => <article key={quote.id} className="p-5"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><PriorityBadge value={quote.recoveryPriority} /><h3 className="mt-3 truncate font-bold">{quote.customerName}</h3><p className="mt-1 text-xs text-slate-500">{quote.externalQuoteId}・{statusLabel(quote.status)}</p></div><p className="shrink-0 font-bold">{yen(quote.amount)}</p></div><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs"><div><p className="text-slate-500">担当者</p><p className="mt-1 font-semibold">{quote.ownerName ?? "未設定"}</p></div><div><p className="text-slate-500">次回予定</p><p className="mt-1 font-semibold">{quote.nextActionDate ?? "未設定"}</p></div></div><p className="mt-3 text-xs leading-5 text-slate-600">{quote.recoveryReasons.join(" / ") || "確認済み"}</p>{!compact && <button type="button" onClick={() => onActivity(quote)} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-bold hover:border-violet-300 hover:text-violet-700"><MessageSquarePlus className="size-4" />更新・活動履歴</button>}</article>)}
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">優先度</th><th className="px-5 py-3">顧客 / 見積番号</th><th className="px-5 py-3">金額</th><th className="px-5 py-3">担当者</th><th className="px-5 py-3">次回予定</th><th className="px-5 py-3">理由</th>{!compact && <th className="px-5 py-3">操作</th>}</tr></thead><tbody className="divide-y divide-slate-100">{visible.map((quote) => <tr key={quote.id} className="hover:bg-slate-50"><td className="px-5 py-4"><PriorityBadge value={quote.recoveryPriority} /></td><td className="px-5 py-4"><p className="font-bold">{quote.customerName}</p><p className="mt-1 text-xs text-slate-500">{quote.externalQuoteId}・{statusLabel(quote.status)}</p></td><td className="px-5 py-4 font-semibold">{yen(quote.amount)}</td><td className="px-5 py-4 text-slate-600">{quote.ownerName ?? "未設定"}</td><td className="px-5 py-4 text-slate-600">{quote.nextActionDate ?? "未設定"}</td><td className="max-w-xs px-5 py-4 text-xs leading-5 text-slate-600">{quote.recoveryReasons.join(" / ") || "確認済み"}</td>{!compact && <td className="px-5 py-4"><button type="button" onClick={() => onActivity(quote)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold hover:border-violet-300 hover:text-violet-700"><MessageSquarePlus className="size-4" />更新</button></td>}</tr>)}</tbody></table>
          </div>
          {!compact && filtered.length > visible.length && <div className="border-t border-slate-100 p-4 text-center"><button type="button" onClick={() => setLimit((current) => current + 50)} className="min-h-10 rounded-xl border border-slate-200 px-5 text-xs font-bold hover:border-violet-300">さらに50件表示</button></div>}
        </>
      )}
    </section>
  )
}
