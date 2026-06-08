"use client"

import { useMemo, useState } from "react"
import { Check, Download, Filter, Loader2, Search, Trash2, UserPlus, Zap } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { DashboardCompany, SalesDashboardData } from "@/lib/sales/dashboard"
import { DASHBOARD_QUERY_KEY } from "./SalesDashboardShell"
import { STATUS_LABELS } from "./sales-panels-shared"
import { formatDate } from "./format-utils"

function BulkActionBar({ selected, onAction, busy }: { selected: DashboardCompany[]; onAction: (action: string, value?: string) => void; busy: boolean }) {
  const [showStatusPicker, setShowStatusPicker] = useState(false)
  return (
    <div className="flex items-center gap-3 border-t border-zinc-200 bg-zinc-50 px-4 py-2.5">
      <span className="text-xs font-bold text-zinc-600">{selected.length}件選択中</span>
      <div className="flex items-center gap-1.5">
        <button onClick={() => setShowStatusPicker(!showStatusPicker)} disabled={busy} className="inline-flex h-7 items-center gap-1 rounded-md bg-zinc-900 px-2.5 text-[11px] font-bold text-white hover:bg-zinc-800 disabled:opacity-50">
          ステータス変更
        </button>
        {showStatusPicker && (
          <select
            onChange={(e) => { onAction("change_status", e.target.value); setShowStatusPicker(false) }}
            className="h-7 rounded border border-zinc-300 bg-white px-2 text-[11px] font-medium outline-none"
            autoFocus
          >
            <option value="">選択...</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
        <button onClick={() => onAction("enrich")} disabled={busy} className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-600 px-2.5 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}一括エンリッチ
        </button>
        <button onClick={() => onAction("delete")} disabled={busy} className="inline-flex h-7 items-center gap-1 rounded-md bg-rose-600 px-2.5 text-[11px] font-bold text-white hover:bg-rose-700 disabled:opacity-50">
          <Trash2 className="h-3 w-3" />削除
        </button>
      </div>
      {busy && <span className="text-[11px] text-zinc-500">処理中...</span>}
    </div>
  )
}

function freshnessLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 60) return `${m}分前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}時間前`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}日前`
  if (d < 30) return `${Math.floor(d / 7)}週間前`
  return `${Math.floor(d / 30)}ヶ月前`
}

export function WorkspacePanel({ data }: { data: SalesDashboardData }) {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.companies.filter((c) => {
      const m = !q || c.companyName.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q) || (c.industry ?? "").toLowerCase().includes(q)
      return m && (status === "all" || c.pipelineStatus === status)
    })
  }, [data.companies, query, status])

  const selected = useMemo(() => filtered.filter((c) => selectedIds.has(c.id)), [filtered, selectedIds])

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => prev.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id)))
  }

  async function handleBulkAction(action: string, value?: string) {
    if (selected.length === 0) return
    setBulkBusy(true)
    try {
      const body: Record<string, unknown> = { companyIds: selected.map((c) => c.id), action }
      if (action === "change_status" && value) body.status = value
      const res = await fetch("/api/sales/companies/bulk", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Bulk operation failed")
      const label = action === "change_status" ? "ステータス変更" : action === "enrich" ? "エンリッチ開始" : "削除"
      toast.success(`${label}: ${json.succeeded ?? json.enriched ?? 0}件成功`)
      setSelectedIds(new Set())
      await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY })
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "一括操作に失敗しました")
    } finally {
      setBulkBusy(false)
    }
  }

  const scoreTierClass = (tier: string | null) => tier === "hot" ? "bg-rose-100 text-rose-700" : tier === "warm" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-500"
  const scoreTierLabel = (tier: string | null) => tier === "hot" ? "HOT" : tier === "warm" ? "WARM" : "-"

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950">リスト作業場</h2>
          <p className="mt-1 text-xs text-zinc-500">チェックボックスで複数選択→一括操作が可能です。</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative block flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-zinc-500 sm:w-72" placeholder="企業名・ドメイン検索" aria-label="企業名・ドメイン検索" />
          </label>
          <label className="relative block">
            <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} aria-hidden />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-md border border-zinc-200 bg-white pl-9 pr-8 text-sm outline-none focus:border-zinc-500" aria-label="パイプライン状態">
              <option value="all">すべて</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <a href={`/api/sales/companies/export?status=${status !== "all" ? status : ""}&search=${encodeURIComponent(query)}&limit=1000`}
             className="inline-flex h-9 items-center gap-1 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
             target="_blank" rel="noopener noreferrer"
          ><Download className="h-3.5 w-3.5" />CSV</a>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="w-10 px-2 py-3"><input type="checkbox" checked={filtered.length > 0 && selectedIds.size === filtered.length} onChange={toggleSelectAll} className="h-3.5 w-3.5 rounded border-zinc-300" /></th>
              <th className="px-4 py-3 font-medium">企業</th>
              <th className="px-4 py-3 font-medium">業種</th>
              <th className="px-4 py-3 font-medium">状態</th>
              <th className="px-4 py-3 font-medium">商談</th>
              <th className="px-4 py-3 text-right font-medium">速度</th>
              <th className="px-4 py-3 text-right font-medium">閲覧</th>
              <th className="px-4 py-3 font-medium">担当</th>
              <th className="px-4 py-3 text-right font-medium">鮮度</th>
              <th className="px-4 py-3 text-right font-medium">スコア</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={11} className="px-4 py-12 text-center text-sm text-zinc-500">条件に一致するリードはありません。</td></tr>
            ) : filtered.map((c) => (
              <tr key={c.id} className="border-t border-zinc-100 hover:bg-zinc-50">
                <td className="px-2 py-3"><input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} className="h-3.5 w-3.5 rounded border-zinc-300" /></td>
                <td className="min-w-[200px] px-4 py-3">
                  <a href={`https://${c.domain}`} target="_blank" rel="noopener noreferrer" className="font-medium text-zinc-950 underline-offset-2 hover:underline">{c.companyName}</a>
                  <div className="mt-1 text-xs text-zinc-500">{c.domain}</div>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-600">{c.industry ?? "-"}</td>
                <td className="px-4 py-3 text-xs text-zinc-600">{STATUS_LABELS[c.pipelineStatus] ?? c.pipelineStatus}</td>
                <td className="px-4 py-3 text-xs text-zinc-600">{c.dealStage}</td>
                <td className="px-4 py-3 text-right text-xs tabular-nums text-zinc-700">{c.pagespeedMobile ?? "-"}</td>
                <td className="px-4 py-3 text-right text-xs tabular-nums text-zinc-700">{c.reportViews}</td>
                <td className="px-4 py-3 text-xs text-zinc-600">{c.assignedTo ?? "-"}</td>
                <td className="px-4 py-3 text-right text-xs text-zinc-400" title={c.lastEnrichedAt ?? c.updatedAt}>{c.lastEnrichedAt ? freshnessLabel(c.lastEnrichedAt) : c.updatedAt ? freshnessLabel(c.updatedAt) : "-"}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${scoreTierClass(c.leadScoreTier)}`}>{scoreTierLabel(c.leadScoreTier)}</span>
                  {c.leadScore != null && <span className="ml-1 text-[10px] text-zinc-400">{c.leadScore}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected.length > 0 && <BulkActionBar selected={selected} onAction={handleBulkAction} busy={bulkBusy} />}
    </div>
  )
}
