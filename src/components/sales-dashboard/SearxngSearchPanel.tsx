"use client"

import { useCallback, useState } from "react"
import { CheckCircle2, Loader2, Search, XCircle } from "lucide-react"
import { toast } from "sonner"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import type { SearxngRunSummary, SearxngTimeRange } from "@/lib/sales/searxng-source"
import { SearxngSearchPanelResults } from "./SearxngSearchPanelResults"

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
  "Shopify", "WordPress", "Wix", "Webflow", "WooCommerce", "Magento",
  "PrestaShop", "Squarespace", "Drupal", "Joomla", "Ghost", "Jimdo",
  "TYPO3", "HubSpot CMS", "EC-CUBE", "MakeShop", "BASE (EC)", "STORES.jp",
  "Next.js", "React", "Vue.js", "Laravel", "Django",
  "Stripe", "Klarna", "PayPal", "GooglePay",
  "Google Analytics", "GTM", "Klaviyo", "HubSpot", "Hotjar",
  "Intercom", "Mailchimp", "Calendly", "Typeform", "Zendesk",
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

  const buildQuery = useCallback(() => {
    const parts: string[] = []
    if (industry && industry !== "カスタム") {
      const found = INDUSTRIES.find((i) => i.label === industry)
      if (found?.keywords) parts.push(found.keywords)
    }
    if (customQuery.trim()) parts.push(customQuery.trim())
    if (parts.length === 0 && techStacks.length > 0) {
      parts.push(targetCountry === "JP" ? "企業 問い合わせ" : "business contact")
    }
    return parts.join(" ") || industry
  }, [industry, customQuery, techStacks, targetCountry])

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
          tech_stacks: techStacks.length > 0 ? techStacks : null,
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
      let importedCount = importResult.imported ?? 0
      for (let attempt = 0; importedCount === 0 && attempt < 15; attempt++) {
        await new Promise(r => setTimeout(r, 2000))
        try {
          const params = new URLSearchParams({
            limit: "3",
            report_locale: data.scope.reportLocale,
            target_country: targetCountry,
          })
          const pollRes = await fetch(`/api/sales/searxng/runs?${params.toString()}`)
          const pollData = await pollRes.json()
          const updatedRun = pollData.runs?.find((r: { id: string }) => r.id === run.id)
          if (updatedRun?.status === "imported") {
            importedCount = updatedRun.importedCount
            break
          }
        } catch (e) {
          console.warn("[SearxngSearchPanel] poll failed:", e)
        }
      }

      setStep("done")
      setLastRun(run)
      toast.success(`${importedCount || "?"}件を収集・インポートしました`)
      window.location.reload()
    } catch (e) {
      setStep("error")
      const msg = e instanceof Error ? e.message : "ネットワークエラー"
      console.error("[SearxngSearchPanel] pipeline failed:", e)
      setStepError(msg)
      toast.error(msg)
    }
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
            <label className="mb-1 block text-xs font-semibold text-zinc-600">技術スタック（CMS痕跡で高精度検索。選択すると検索クエリにCMS固有フットプリントを追加）</label>
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

      <SearxngSearchPanelResults data={data} targetCount={targetCount} />
    </div>
  )
}
