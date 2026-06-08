"use client"

import { useState } from "react"
import { DatabaseZap, DownloadCloud, RefreshCw, Search, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { readSalesApiJson } from "@/lib/sales/client-api"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import type { SalesLeadBatchSummary } from "@/lib/sales/monthly-batch"
import type { SearxngRunSummary } from "@/lib/sales/searxng-source"
import { formatDate, formatNumber, statusTone } from "./SalesCommandPanels"

interface ApiRunsResult {
  ok?: boolean
  runs?: SearxngRunSummary[]
  run?: SearxngRunSummary
  error?: string
}

interface ImportResult {
  ok?: boolean
  imported?: number
  batch?: SalesLeadBatchSummary
  error?: string
}

const STATUS_LABELS: Record<string, string> = {
  running: "実行中",
  completed: "候補化済み",
  failed: "失敗",
  imported: "バッチ投入済み",
}

function RunMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-zinc-50 px-3 py-2">
      <p className="text-[11px] font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-950">{formatNumber(value)}</p>
    </div>
  )
}

function RunCard({
  run,
  importingId,
  onImport,
}: {
  run: SearxngRunSummary
  importingId: string | null
  onImport: (runId: string) => void
}) {
  const busy = importingId === run.id
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-zinc-950">{run.query}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusTone(run.status)}`}>
              {STATUS_LABELS[run.status] ?? run.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {run.targetCountry} / {run.language} / {run.engines.length > 0 ? run.engines.join(", ") : "既定エンジン"} / {formatDate(run.updatedAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onImport(run.id)}
          disabled={busy || run.readyCount === 0}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={`${run.query} の候補を月次バッチへ投入`}
        >
          {busy ? <RefreshCw size={15} className="animate-spin" aria-hidden /> : <DownloadCloud size={15} aria-hidden />}
          バッチ投入
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <RunMetric label="検索結果" value={run.totalResults} />
        <RunMetric label="ユニーク" value={run.uniqueDomains} />
        <RunMetric label="投入候補" value={run.readyCount} />
        <RunMetric label="重複" value={run.duplicateCount} />
        <RunMetric label="除外" value={run.rejectedCount} />
      </div>
      {run.errorMessage && (
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
          {run.errorMessage}
        </p>
      )}
      {run.results.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200">
          <div className="grid grid-cols-[1fr_72px] bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500">
            <span>上位候補</span>
            <span className="text-right">Score</span>
          </div>
          {run.results.slice(0, 5).map((result) => (
            <div key={result.id} className="grid grid-cols-[1fr_72px] border-t border-zinc-100 px-3 py-2 text-xs">
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-900">{result.title}</p>
                <p className="truncate text-zinc-500">{result.domain}</p>
              </div>
              <span className="text-right font-semibold tabular-nums text-zinc-950">{result.score}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

export function SalesSearxngSourcePanel({
  data,
  onImported,
}: {
  data: SalesDashboardData
  onImported?: () => Promise<void> | void
}) {
  const [query, setQuery] = useState('"powered by shopify" "contact us" "Los Angeles"')
  const [engines, setEngines] = useState("google,bing,duckduckgo")
  const [categories, setCategories] = useState("general")
  const [language, setLanguage] = useState<string>(data.scope.reportLocale === "ja" ? "en" : data.scope.reportLocale)
  const [pages, setPages] = useState(1)
  const [minScore, setMinScore] = useState(58)
  const [limit, setLimit] = useState(100)
  const [busy, setBusy] = useState(false)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [runs, setRuns] = useState<SearxngRunSummary[]>(data.searxngRuns)

  async function refresh() {
    const res = await fetch(`/api/sales/searxng/runs?locale=${data.scope.reportLocale}&limit=8`, { credentials: "include" })
    const json = await readSalesApiJson<ApiRunsResult>(res)
    if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
    setRuns(json.runs ?? [])
  }

  async function autoRun() {
    const cleanQuery = query.trim()
    if (!cleanQuery) { toast.error("検索クエリを入力してください"); return }
    setBusy(true)
    try {
      // Step 1: execute search
      const searchRes = await fetch("/api/sales/searxng/runs", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleanQuery, engines, categories, language, pages, safesearch: 1, report_locale: data.scope.reportLocale, target_country: data.scope.targetCountry }),
      })
      const searchJson = await readSalesApiJson<ApiRunsResult>(searchRes)
      if (!searchRes.ok || !searchJson.ok) throw new Error(searchJson.error ?? "Search failed")
      const runId = searchJson.run?.id
      if (!runId) throw new Error("No run ID returned")

      // Step 2: immediately import to batch (enrichment auto-fires)
      const importRes = await fetch(`/api/sales/searxng/runs/${runId}/import`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ min_score: minScore, limit, enrich: true, max_outreach_ready: 300 }),
      })
      const importJson = await readSalesApiJson<ImportResult>(importRes)
      if (!importRes.ok || !importJson.ok) throw new Error(importJson.error ?? "Import failed")

      toast.success(`全自動実行完了: ${formatNumber(searchJson.run?.readyCount ?? 0)}件検出 → ${formatNumber(importJson.imported ?? 0)}件エンリッチメント開始`)
      await refresh()
      await onImported?.()
    } catch (error) {
      console.error("[sales-searxng-ui] auto-run failed:", error)
      toast.error(error instanceof Error ? error.message : "全自動実行に失敗しました")
    } finally {
      setBusy(false)
    }
  }

  async function runSearch() {
    const cleanQuery = query.trim()
    if (!cleanQuery) {
      toast.error("検索クエリを入力してください")
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/sales/searxng/runs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: cleanQuery,
          engines,
          categories,
          language,
          pages,
          safesearch: 1,
          report_locale: data.scope.reportLocale,
          target_country: data.scope.targetCountry,
        }),
      })
      const json = await readSalesApiJson<ApiRunsResult>(res)
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      toast.success(`SearxNG検索を保存しました: ${formatNumber(json.run?.readyCount ?? 0)}件が投入候補`)
      await refresh()
    } catch (error) {
      console.error("[sales-searxng-ui] search failed:", error)
      toast.error(error instanceof Error ? error.message : "SearxNG検索に失敗しました")
    } finally {
      setBusy(false)
    }
  }

  async function importRun(runId: string) {
    setImportingId(runId)
    try {
      const res = await fetch(`/api/sales/searxng/runs/${runId}/import`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ min_score: minScore, limit, enrich: true, max_outreach_ready: 300 }),
      })
      const json = await readSalesApiJson<ImportResult>(res)
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      toast.success(`月次バッチへ投入しました: ${formatNumber(json.imported ?? 0)}件`)
      await refresh()
      await onImported?.()
    } catch (error) {
      console.error("[sales-searxng-ui] import failed:", error)
      toast.error(error instanceof Error ? error.message : "SearxNG候補の投入に失敗しました")
    } finally {
      setImportingId(null)
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">SearxNG Lead Source</p>
          <h2 className="mt-1 text-base font-semibold text-zinc-950">検索水源から月次バッチを作る</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-500">
            フットプリント検索の結果をDBへ保存し、重複・SNS/検索ポータル除外・簡易スコアリング後に、Wappalyzer/企業カルテ生成キューへ投入します。
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <ShieldCheck size={14} aria-hidden />
          検索→即エンリッチメント
        </span>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_150px_100px_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-500"
          placeholder='"powered by shopify" "contact us" "Los Angeles"'
          aria-label="SearxNG検索クエリ"
        />
        <input value={engines} onChange={(event) => setEngines(event.target.value)} className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-500" aria-label="検索エンジン" />
        <input value={categories} onChange={(event) => setCategories(event.target.value)} className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-500" aria-label="検索カテゴリ" />
        <input type="number" min={1} max={5} value={pages} onChange={(event) => setPages(Number(event.target.value))} className="h-10 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-500" aria-label="検索ページ数" />
        <button type="button" onClick={autoRun} disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 hover:bg-emerald-700" aria-label="全自動実行: 検索→インポート→エンリッチ">
          {busy ? <RefreshCw size={16} className="animate-spin" aria-hidden /> : <DatabaseZap size={16} aria-hidden />}
          全自動
        </button>
        <button type="button" onClick={runSearch} disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" aria-label="SearxNG検索のみ実行">
          {busy ? <RefreshCw size={16} className="animate-spin" aria-hidden /> : <Search size={16} aria-hidden />}
          検索保存
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1"><DatabaseZap size={12} aria-hidden />{runs.length} runs</span>
        <label className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-2 py-1">
          score
          <input type="number" min={0} max={100} value={minScore} onChange={(event) => setMinScore(Number(event.target.value))} className="w-14 bg-transparent text-xs font-semibold outline-none" aria-label="インポート最小スコア" />
        </label>
        <label className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-2 py-1">
          limit
          <input type="number" min={1} max={1000} value={limit} onChange={(event) => setLimit(Number(event.target.value))} className="w-16 bg-transparent text-xs font-semibold outline-none" aria-label="インポート上限" />
        </label>
        <label className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-2 py-1">
          lang
          <input value={language} onChange={(event) => setLanguage(event.target.value)} className="w-16 bg-transparent text-xs font-semibold outline-none" aria-label="検索言語" />
        </label>
      </div>
      <div className="mt-4 space-y-3">
        {runs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
            SearxNG検索履歴はまだありません。検索クエリを保存すると、候補URLがDBに残ります。
          </div>
        ) : (
          runs.map((run) => <RunCard key={run.id} run={run} importingId={importingId} onImport={importRun} />)
        )}
      </div>
    </section>
  )
}
