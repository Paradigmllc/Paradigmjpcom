"use client"

import { useState } from "react"
import { Loader2, Play, Search, Download, ExternalLink, ChevronDown, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import type { SearxngRunSummary, SearxngTimeRange } from "@/lib/sales/searxng-source"

const ENGINES = ["google", "bing", "duckduckgo", "brave", "yahoo", "qwant", "startpage"]
const TIME_RANGES: { label: string; value: SearxngTimeRange | "" }[] = [
  { label: "指定なし", value: "" },
  { label: "24時間", value: "day" },
  { label: "1ヶ月", value: "month" },
  { label: "1年", value: "year" },
]

export function SearxngSearchPanel({ data }: { data: SalesDashboardData }) {
  const [query, setQuery] = useState("")
  const [engines, setEngines] = useState<string[]>(["google"])
  const [pages, setPages] = useState(1)
  const [timeRange, setTimeRange] = useState<SearxngTimeRange | "">("")
  const [running, setRunning] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleEngine = (engine: string) => {
    setEngines((prev) => prev.includes(engine) ? prev.filter((e) => e !== engine) : [...prev, engine])
  }

  const runSearch = async () => {
    if (!query.trim()) {
      toast.error("検索クエリを入力してください")
      return
    }
    setRunning(true)
    try {
      const res = await fetch("/api/sales/searxng/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          engines: engines.length > 0 ? engines : null,
          pages,
          time_range: timeRange || null,
          target_country: data.scope.targetCountry,
          report_locale: data.scope.reportLocale,
        }),
      })
      const result = await res.json() as { ok: boolean; run?: SearxngRunSummary; error?: string }
      if (result.ok && result.run) {
        toast.success(`検索完了: ${result.run.totalResults}件 / ${result.run.uniqueDomains}ドメイン`)
        setQuery("")
        window.location.reload()
      } else {
        toast.error(result.error ?? "検索に失敗しました")
      }
    } catch (e) {
      toast.error("ネットワークエラー")
    } finally {
      setRunning(false)
    }
  }

  const importRun = async (runId: string) => {
    setImporting(runId)
    try {
      const res = await fetch(`/api/sales/searxng/runs/${runId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50, min_score: 58, enrich: true }),
      })
      const result = await res.json() as { ok: boolean; imported: number; error?: string }
      if (result.ok) {
        toast.success(`${result.imported}件をリードバッチにインポートしました`)
        window.location.reload()
      } else {
        toast.error(result.error ?? "インポートに失敗しました")
      }
    } catch (e) {
      toast.error("ネットワークエラー")
    } finally {
      setImporting(null)
    }
  }

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

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      running: "bg-blue-100 text-blue-700",
      completed: "bg-emerald-100 text-emerald-700",
      failed: "bg-rose-100 text-rose-700",
      imported: "bg-violet-100 text-violet-700",
    }
    const labels: Record<string, string> = {
      running: "実行中",
      completed: "完了",
      failed: "失敗",
      imported: "取込済",
    }
    return <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${map[status] ?? "bg-zinc-100 text-zinc-600"}`}>{labels[status] ?? status}</span>
  }

  return (
    <div className="p-6">
      <div className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50/50 p-5">
        <h3 className="mb-4 text-sm font-bold text-zinc-800">SearXNG 検索実行</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">検索クエリ</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value.slice(0, 400))}
              placeholder="例: 製造業 DX 導入 事例"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              onKeyDown={(e) => { if (e.key === "Enter") runSearch() }}
            />
            <p className="mt-1 text-[10px] text-zinc-400">{query.length}/400</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">検索エンジン</label>
            <div className="flex flex-wrap gap-1.5">
              {ENGINES.map((engine) => (
                <button
                  key={engine}
                  type="button"
                  onClick={() => toggleEngine(engine)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    engines.includes(engine)
                      ? "bg-violet-100 text-violet-700 border border-violet-200"
                      : "bg-white text-zinc-500 border border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  {engine}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">ページ数</label>
              <select
                value={pages}
                onChange={(e) => setPages(Number(e.target.value))}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500"
              >
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}ページ</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">期間</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as SearxngTimeRange | "")}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500"
              >
                {TIME_RANGES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={running || !query.trim()}
            onClick={runSearch}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            検索実行
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-zinc-800">過去の検索実行 ({data.searxngRuns.length})</h3>
        {data.searxngRuns.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center text-sm text-zinc-400">
            まだ検索実行がありません。上のフォームから検索を開始してください。
          </p>
        ) : (
          <div className="space-y-2">
            {data.searxngRuns.map((run) => {
              const isExpanded = expanded.has(run.id)
              return (
                <div key={run.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  <button
                    type="button"
                    onClick={() => toggleExpand(run.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
                  >
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
                        <div><span className="text-zinc-400">Ready</span><p className="font-bold text-emerald-600">{run.readyCount}</p></div>
                        <div><span className="text-zinc-400">重複/除外</span><p className="font-bold text-zinc-500">{run.duplicateCount}/{run.rejectedCount}</p></div>
                      </div>

                      {run.results.length > 0 && (
                        <div className="mb-3 max-h-64 overflow-y-auto rounded-lg border border-zinc-100">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-zinc-50">
                              <tr className="text-left text-zinc-500">
                                <th className="px-3 py-2 font-semibold">ドメイン</th>
                                <th className="px-3 py-2 font-semibold">タイトル</th>
                                <th className="px-3 py-2 font-semibold">スコア</th>
                                <th className="px-3 py-2 font-semibold">ステータス</th>
                              </tr>
                            </thead>
                            <tbody>
                              {run.results.map((r) => (
                                <tr key={r.id} className="border-t border-zinc-50 hover:bg-zinc-50/50">
                                  <td className="px-3 py-2 font-medium">
                                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline flex items-center gap-1">
                                      {r.domain} <ExternalLink className="h-3 w-3" />
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

                      {(run.status === "completed") && (
                        <button
                          type="button"
                          disabled={importing === run.id}
                          onClick={() => importRun(run.id)}
                          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {importing === run.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          リードバッチにインポート
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
    </div>
  )
}
