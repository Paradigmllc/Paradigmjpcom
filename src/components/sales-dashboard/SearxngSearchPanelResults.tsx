"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, ExternalLink, Loader2, Play, Search } from "lucide-react"
import { toast } from "sonner"
import type { SalesDashboardData } from "@/lib/sales/dashboard"

export function SearxngSearchPanelResults({ data, targetCount }: { data: SalesDashboardData; targetCount: number }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [enriching, setEnriching] = useState(false)
  const [importingRun, setImportingRun] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const importExisting = async (runId: string) => {
    setImportingRun(runId)
    try {
      const res = await fetch(`/api/sales/searxng/runs/${runId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: targetCount, min_score: 50, enrich: true }),
      })
      const result = await res.json() as { ok: boolean; imported?: number; error?: string }
      if (result.ok) {
        toast.success(`${result.imported ?? 0}件をインポートしました`)
        window.location.reload()
      } else {
        toast.error(result.error ?? "インポートに失敗しました")
        setImportingRun(null)
      }
    } catch (e) {
      console.error("[SearxngSearchPanelResults] import failed:", e)
      toast.error("ネットワークエラー")
      setImportingRun(null)
    }
  }

  const runEnrichment = async () => {
    setEnriching(true)
    try {
      const res = await fetch("/api/sales/enrichment/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 3 }),
      })
      const result = await res.json() as { ok: boolean; processed: number; completed: number; failed: number; errors: string[] }
      if (result.ok) {
        toast.success(`エンリッチ完了: ${result.completed}件処理`)
        window.location.reload()
      } else {
        toast.error(result.errors?.[0] ?? "エンリッチ失敗")
      }
    } catch (e) {
      console.error("[SearxngSearchPanelResults] enrichment failed:", e)
      toast.error("ネットワークエラー")
    } finally {
      setEnriching(false)
    }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      running: "bg-blue-100 text-blue-700",
      importing: "bg-violet-100 text-violet-700",
      completed: "bg-emerald-100 text-emerald-700",
      failed: "bg-rose-100 text-rose-700",
      imported: "bg-violet-100 text-violet-700",
    }
    const labels: Record<string, string> = { running: "実行中", importing: "取込中", completed: "完了", failed: "失敗", imported: "取込済" }
    return <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${map[status] ?? "bg-zinc-100 text-zinc-600"}`}>{labels[status] ?? status}</span>
  }

  return (
    <>
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-bold text-zinc-800">エンリッチ実行</h3>
        <p className="mb-3 text-xs text-zinc-500">キューに溜まったエンリッチジョブを手動実行（Trigger.dev代替）</p>
        <button
          type="button"
          disabled={enriching}
          onClick={runEnrichment}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
        >
          {enriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          エンリッチを実行（最大3件）
        </button>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-zinc-800">
          過去の検索実行
          {data.searxngRuns.length > 0 && <span className="ml-1 font-normal text-zinc-400">({data.searxngRuns.length})</span>}
        </h3>
        {data.searxngRuns.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center text-sm text-zinc-400">
            まだ検索実行がありません。上のフォームから収集を開始してください。
          </p>
        ) : (
          <div className="space-y-2">
            {data.searxngRuns.map((run) => {
              const isExpanded = expanded.has(run.id)
              const isImporting = importingRun === run.id
              return (
                <div key={run.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  <button type="button" onClick={() => toggleExpand(run.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition-colors">
                    {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />}
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800">{run.query}</span>
                    <span className="shrink-0 text-xs text-zinc-500">{run.targetCountry}</span>
                    {statusBadge(run.status)}
                    <span className="shrink-0 text-xs text-zinc-400">{new Date(run.createdAt).toLocaleDateString("ja-JP")}</span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-zinc-100 px-4 py-3">
                      <div className="mb-3 grid grid-cols-4 gap-2 text-xs">
                        <div><span className="text-zinc-400">総結果</span><p className="font-bold">{run.totalResults}</p></div>
                        <div><span className="text-zinc-400">ユニーク</span><p className="font-bold">{run.uniqueDomains}</p></div>
                        <div><span className="text-zinc-400">有効</span><p className="font-bold text-emerald-600">{run.readyCount}</p></div>
                        <div><span className="text-zinc-400">重複/除外</span><p className="font-bold text-zinc-500">{run.duplicateCount}/{run.rejectedCount}</p></div>
                      </div>

                      {run.results.length > 0 && (
                        <div className="mb-3 max-h-64 overflow-y-auto rounded-lg border border-zinc-100">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-zinc-50">
                              <tr className="text-left text-zinc-500">
                                <th className="px-3 py-2 font-semibold">ドメイン</th>
                                <th className="px-3 py-2 font-semibold">タイトル</th>
                                <th className="px-3 py-2 font-semibold w-16">スコア</th>
                                <th className="px-3 py-2 font-semibold w-20">状態</th>
                              </tr>
                            </thead>
                            <tbody>
                              {run.results.map((r) => (
                                <tr key={r.id} className="border-t border-zinc-50 hover:bg-zinc-50/50">
                                  <td className="px-3 py-2 font-medium">
                                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline flex items-center gap-1">
                                      {r.domain} <ExternalLink className="h-3 w-3 shrink-0" />
                                    </a>
                                  </td>
                                  <td className="px-3 py-2 text-zinc-600 max-w-[300px] truncate">{r.title}</td>
                                  <td className="px-3 py-2 font-mono">{r.score}</td>
                                  <td className="px-3 py-2">
                                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                      r.status === "ready" ? "bg-emerald-50 text-emerald-600" :
                                      r.status === "imported" ? "bg-violet-50 text-violet-600" :
                                      "bg-zinc-50 text-zinc-500"
                                    }`}>{r.status}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {run.status === "completed" && (
                        <button type="button" disabled={isImporting}
                          onClick={() => importExisting(run.id)}
                          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40 transition-colors">
                          {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                          この結果をインポート
                        </button>
                      )}
                      {run.status === "imported" && run.batchId && (
                        <p className="text-xs text-zinc-500">バッチID: {run.batchId} / {run.importedCount}件取込済</p>
                      )}
                      {run.status === "failed" && run.errorMessage && (
                        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{run.errorMessage}</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
