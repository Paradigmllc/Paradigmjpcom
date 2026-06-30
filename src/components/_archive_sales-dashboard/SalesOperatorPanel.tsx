"use client"

import { useState } from "react"
import { ExternalLink } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import { DASHBOARD_QUERY_KEY } from "./SalesDashboardShell"
import { externalUrlForCompany } from "./sales-panels-shared"

export function OperatorPanel({ data }: { data: SalesDashboardData }) {
  const queryClient = useQueryClient()
  const followUps = data.companies.filter((company) => company.pipelineStatus === "manual_queue" || company.followUpDate).slice(0, 8)
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function resolveQueue(id: string, action: "approve" | "reject") {
    setResolvingId(id);
    try {
      const res = await fetch(`/api/sales/operator-queue/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to resolve");
      toast.success(action === "approve" ? "承認しました" : "除外しました");
      await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY })
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "操作に失敗しました");
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-950">Appsmith作業キュー</h2>
        <div className="mt-4 divide-y divide-zinc-100">
          {data.operatorQueue.length === 0 ? <p className="py-8 text-sm text-zinc-500">現在の手動作業キューは空です。</p> : data.operatorQueue.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="text-sm font-medium text-zinc-950">{item.companyName ?? "未紐付け"}</div>
                <div className="mt-1 text-xs text-zinc-500">{item.queueType} / {item.sourceTool ?? "system"} {"->"} {item.targetTool ?? "operator"}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">P{item.priority}</span>
                <button 
                  onClick={() => resolveQueue(item.id, "approve")}
                  disabled={resolvingId === item.id}
                  className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-md hover:bg-emerald-100 disabled:opacity-50"
                >
                  承認
                </button>
                <button 
                  onClick={() => resolveQueue(item.id, "reject")}
                  disabled={resolvingId === item.id}
                  className="px-2 py-1 text-xs font-medium text-zinc-600 bg-zinc-100 rounded-md hover:bg-zinc-200 disabled:opacity-50"
                >
                  除外
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-950">即時対応候補</h2>
        <div className="mt-4 space-y-3">
          {followUps.length === 0 ? <p className="py-8 text-sm text-zinc-500">次回対応候補はありません。</p> : followUps.map((company) => (
            <a key={company.id} href={externalUrlForCompany(company)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-md border border-zinc-100 p-3 hover:bg-zinc-50">
              <span>
                <span className="block text-sm font-medium text-zinc-950">{company.companyName}</span>
                <span className="text-xs text-zinc-500">次回: {company.followUpDate ?? "-"}</span>
              </span>
              <ExternalLink size={14} aria-hidden />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
