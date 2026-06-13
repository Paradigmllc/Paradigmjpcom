"use client"

import { useCallback, useState } from "react"
import { CheckCircle2, ChevronDown, ChevronRight, ExternalLink, Loader2, Play, Search, XCircle } from "lucide-react"
import { toast } from "sonner"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import type { SearxngRunSummary, SearxngTimeRange } from "@/lib/sales/searxng-source"

const ENGINES = ["google", "bing", "duckduckgo", "brave", "yahoo", "qwant", "startpage"]

const INDUSTRIES: { label: string; keywords: string }[] = [
  { label: "製造業", keywords: "製造業 工場 メーカー" },
  { label: "建設業", keywords: "建設 工務店 リフォーム" },
  { label: "小売・EC", keywords: "EC 通販 ネットショップ" },
  { label: "美容・サロン", keywords: "美容室 サロン エステ" },
  { label: "飲食店", keywords: "飲食店 レストラン カフェ" },
  { label: "歯科・医療", keywords: "歯科 クリニック 医院" },
  { label: "会計・税理士", keywords: "税理士 会計事務所" },
  { label: "清掃業", keywords: "清掃 ハウスクリーニング" },
  { label: "IT・DX", keywords: "IT DX システム開発" },
  { label: "コンサル", keywords: "コンサルティング 経営相談" },
  { label: "カスタム", keywords: "" },
]

const TECH_STACKS = [
  "WordPress", "Shopify", "Wix", "EC-CUBE", "MakeShop", "BASE",
  "Next.js", "React", "Vue.js", "Laravel", "Django", "Ruby on Rails",
  "Google Analytics", "GTM", "HubSpot", "Klaviyo", "Stripe",
]

const TIME_RANGES: { label: string; value: SearxngTimeRange | "" }[] = [
  { label: "指定なし", value: "" },
  { label: "24時間", value: "day" },
  { label: "1ヶ月", value: "month" },
  { label: "1年", value: "year" },
]

const COUNTRIES = ["JP", "US", "GB", "DE", "FR", "KR", "CN", "TW", "VN", "TH", "ID", "SG", "AU"]

type Step = "idle" | "searching" | "importing" | "done" | "error"

export function SearxngSearchPanel({ data }: { data: SalesDashboardData }) {
  const [industry, setIndustry] = useState("")
  const [customQuery, setCustomQuery] = useState("")
  const [techStacks, setTechStacks] = useState<string[]>([])
  const [engines, setEngines] = useState<string[]>(["google"])
  const [targetCount, setTargetCount] = useState(10)
  const [timeRange, setTimeRange] = useState<SearxngTimeRange | "">("")
  const [targetCountry, setTargetCountry] = useState(data.scope.targetCountry ?? "JP")
  const [step, setStep] = useState<Step>("idle")
  const [stepError, setStepError] = useState("")
  const [lastRun, setLastRun] = useState<SearxngRunSummary | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [enriching, setEnriching] = useState(false)

  const buildQuery = useCallback(() => {
    const parts: string[] = []
    if (industry && industry !== "カスタム") {
      const found = INDUSTRIES.find((i) => i.label === industry)
      if (found?.keywords) parts.push(found.keywords)
    }
    if (customQuery.trim()) parts.push(customQuery.trim())
    // Tech stacks are detected by Wappalyzer AFTER search, NOT used as search keywords
    // Adding them to search keywords returns garbage (pages about the tech, not businesses using it)
    return parts.join(" ") || industry
  }, [industry, customQuery, techStacks])

  const pages = Math.max(1, Math.min(5, Math.ceil(targetCount / 10)))

  const toggleEngine = (engine: string) => {
    setEngines((prev) => prev.includes(engine) ? prev.filter((e) => e !== engine) : [...prev, engine])
  }

  const toggleTech = (tech: string) => {
    setTechStacks((prev) => prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech])
  }

  const runPipeline = async () => {
    const query = buildQuery()
    if (!query) {
      toast.error("業種または検索キーワードを指定してください")
      return
    }

    setStep("searching")
    setStepError("")
    setLastRun(null)

    try {
      // Step 1: Search
      const searchRes = await fetch("/api/sales/searxng/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          engines: engines.length > 0 ? engines : null,
          pages,
          time_range: timeRange || null,
          language: targetCountry === "JP" ? "ja" : "en",
          target_country: targetCountry,
          report_locale: data.scope.reportLocale,
        }),
      })
      const searchResult = await searchRes.json() as { ok: boolean; run?: SearxngRunSummary; error?: string }
      if (!searchResult.ok || !searchResult.run) {
        setStep("error")
        setStepError(searchResult.error ?? "検索に失敗しました")
        toast.error(searchResult.error ?? "検索に失敗しました")
        return
      }
      const run = searchResult.run
      if (run.readyCount === 0) {
        setStep("error")
        setStepError("有効な検索結果が0件です。キーワードを変えて再試行してください。")
        toast.error("有効な結果が0件です")
        return
      }

      // Step 2: Import (async - poll for completion)
      setStep("importing")
      const importRes = await fetch(`/api/sales/searxng/runs/${run.id}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: targetCount, min_score: 50, enrich: true }),
      })
      const importResult = await importRes.json() as { ok: boolean; status?: string; imported?: number; error?: string }
      if (!importResult.ok) {
        setStep("error")
        setStepError(importResult.error ?? "インポートに失敗しました")
        toast.error(importResult.error ?? "インポート失敗")
        return
      }

      // Poll for completion
      let importedCount = 0
      for (let attempt = 0; attempt < 15; attempt++) {
        await new Promise(r => setTimeout(r, 2000))
        try {
          const pollRes = await fetch(`/api/sales/searxng/runs?limit=1`)
          const pollData = await pollRes.json()
          const updatedRun = pollData.runs?.find((r: { id: string }) => r.id === run.id)
          if (updatedRun?.status === "imported") {
            importedCount = updatedRun.importedCount
            break
          }
        } catch { /* continue polling */ }
      }

      setStep("done")
      setLastRun(run)
      toast.success(`${importedCount || "?"}件を収集・インポートしました`)
      window.location.reload()
    } catch (e) {
      setStep("error")
      const msg = e instanceof Error ? e.message : "ネットワークエラー"
      setStepError(msg)
      toast.error(msg)
    }
  }

  const importExisting = async (runId: string) => {
    setStep("importing")
    setStepError("")
    try {
      const res = await fetch(`/api/sales/searxng/runs/${runId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: targetCount, min_score: 50, enrich: true }),
      })
      const result = await res.json() as { ok: boolean; imported: number; error?: string }
      if (result.ok) {
        toast.success(`${result.imported}件をインポートしました`)
        setStep("idle")
        window.location.reload()
      } else {
        toast.error(result.error ?? "インポートに失敗しました")
        setStep("idle")
      }
    } catch (e) {
      toast.error("ネットワークエラー")
      setStep("idle")
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
      toast.error("ネットワークエラー")
    } finally {
      setEnriching(false)
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
    const labels: Record<string, string> = { running: "実行中", completed: "完了", failed: "失敗", imported: "取込済" }
    return <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${map[status] ?? "bg-zinc-100 text-zinc-600"}`}>{labels[status] ?? status}</span>
  }

  const isRunning = step === "searching" || step === "importing"
  const queryPreview = buildQuery()

  return (
    <div className="p-6">
      {/* Search Form */}
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-bold text-zinc-800">リードリスト収集</h3>
        <p className="mb-4 text-xs text-zinc-500">SearXNGメタ検索で条件に合う企業ドメインを収集し、自動エンリッチ→Twenty連携まで一括実行</p>

        {/* Step Indicator */}
        {step !== "idle" && (
          <div className="mb-4 rounded-lg border p-3">
            {step === "searching" && (
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <div>
                  <p className="text-sm font-bold text-blue-700">SearXNG 検索実行中...</p>
                  <p className="text-xs text-blue-500">{queryPreview}</p>
                </div>
              </div>
            )}
            {step === "importing" && (
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                <div>
                  <p className="text-sm font-bold text-violet-700">LLMフィルタ＋リードバッチにインポート中...</p>
                  <p className="text-xs text-violet-500">DeepSeekで品質チェック後、エンリッチを予約します</p>
                </div>
              </div>
            )}
            {step === "done" && (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-bold text-emerald-700">収集完了</p>
                  <p className="text-xs text-emerald-600">{lastRun ? `${lastRun.uniqueDomains}ドメインをインポートしました` : ""}</p>
                </div>
              </div>
            )}
            {step === "error" && (
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-rose-700">エラー</p>
                  <p className="text-xs text-rose-600">{stepError}</p>
                  <button type="button" onClick={() => setStep("idle")} className="mt-2 text-xs font-bold text-rose-600 underline">閉じる</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {/* Row 1: Industry + Country + Target Count */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">業種</label>
              <select
                value={industry}
                onChange={(e) => { setIndustry(e.target.value); if (e.target.value && e.target.value !== "カスタム") setCustomQuery("") }}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                disabled={isRunning}
              >
                <option value="">選択してください</option>
                {INDUSTRIES.map((ind) => <option key={ind.label} value={ind.label}>{ind.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">対象国</label>
              <select
                value={targetCountry}
                onChange={(e) => setTargetCountry(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                disabled={isRunning}
              >
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">目標収集件数</label>
              <select
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                disabled={isRunning}
              >
                {[10, 20, 50, 100, 200, 500].map((n) => <option key={n} value={n}>{n}件</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: Custom Keywords */}
          {(!industry || industry === "カスタム") && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">検索キーワード（業種未選択時は必須）</label>
              <input
                type="text"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value.slice(0, 200))}
                placeholder="例: 製造業 DX 工場 IoT"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                disabled={isRunning}
              />
              <p className="mt-1 text-[10px] text-zinc-400">{customQuery.length}/200</p>
            </div>
          )}

          {/* Row 3: Tech Stack */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">技術スタック（指定すると検索キーワードに追加）</label>
            <div className="flex flex-wrap gap-1.5">
              {TECH_STACKS.map((tech) => (
                <button
                  key={tech}
                  type="button"
                  disabled={isRunning}
                  onClick={() => toggleTech(tech)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                    techStacks.includes(tech)
                      ? "bg-violet-100 text-violet-700 border border-violet-200"
                      : "bg-white text-zinc-500 border border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  {tech}
                </button>
              ))}
            </div>
          </div>

          {/* Row 4: Advanced */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-zinc-500 hover:text-zinc-700 select-none">詳細設定</summary>
            <div className="mt-3 space-y-3 pl-1">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">検索エンジン</label>
                <div className="flex flex-wrap gap-1.5">
                  {ENGINES.map((engine) => (
                    <button key={engine} type="button" disabled={isRunning} onClick={() => toggleEngine(engine)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                        engines.includes(engine) ? "bg-zinc-200 text-zinc-800 border border-zinc-300" : "bg-white text-zinc-500 border border-zinc-200 hover:bg-zinc-50"
                      }`}>
                      {engine}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">検索ページ数</label>
                  <select value={pages} onChange={(e) => setTargetCount(Number(e.target.value) * 10)}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500" disabled={isRunning}>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}ページ（約{n * 10}件）</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">期間</label>
                  <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as SearxngTimeRange | "")}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500" disabled={isRunning}>
                    {TIME_RANGES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </details>

          {/* Preview */}
          {queryPreview && (
            <div className="rounded-lg bg-zinc-50 px-3 py-2">
              <p className="text-[10px] font-semibold text-zinc-400 uppercase">検索クエリプレビュー</p>
              <p className="text-sm font-medium text-zinc-700">{queryPreview}</p>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            disabled={isRunning || !queryPreview}
            onClick={runPipeline}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {isRunning ? "処理中..." : "収集を開始（検索 → インポート → エンリッチ予約）"}
          </button>
        </div>
      </div>

      {/* Enrichment Runner */}
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

      {/* Past Runs */}
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
                        <button type="button" disabled={step === "importing"}
                          onClick={() => importExisting(run.id)}
                          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40 transition-colors">
                          {step === "importing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
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
    </div>
  )
}
