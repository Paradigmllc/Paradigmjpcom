"use client"

import { useMemo, useState } from "react"
import { Filter, Search } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import { DASHBOARD_QUERY_KEY } from "./SalesDashboardShell"
import { STATUS_LABELS, CompanyRow } from "./sales-panels-shared"

export function WorkspacePanel({ data }: { data: SalesDashboardData }) {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  async function changePipelineStatus(companyId: string, newStatus: string) {
    setUpdatingId(companyId);
    try {
      const res = await fetch(`/api/sales/companies/${companyId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to update status");
      toast.success("ステータスを更新しました");
      await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY })
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "更新に失敗しました");
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.companies.filter((company) => {
      const matchesQuery = !q || company.companyName.toLowerCase().includes(q) || company.domain.toLowerCase().includes(q) || (company.industry ?? "").toLowerCase().includes(q)
      return matchesQuery && (status === "all" || company.pipelineStatus === status)
    })
  }, [data.companies, query, status])

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950">リスト作業場</h2>
          <p className="mt-1 text-xs text-zinc-500">NocoDBで一括編集する前後の営業ビューです。正本は常にSupabaseです。</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} aria-hidden />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-zinc-500 sm:w-72" placeholder="企業名・ドメイン検索" aria-label="企業名・ドメイン検索" />
          </label>
          <label className="relative block">
            <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} aria-hidden />
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-md border border-zinc-200 bg-white pl-9 pr-8 text-sm outline-none focus:border-zinc-500" aria-label="パイプライン状態">
              <option value="all">すべて</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
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
              <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-zinc-500">条件に一致するリードはありません。</td></tr>
            ) : filtered.map((company) => <CompanyRow key={company.id} company={company} updating={updatingId === company.id} onChangeStatus={changePipelineStatus} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
