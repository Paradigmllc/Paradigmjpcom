"use client"

import { useCallback, useEffect, useState } from "react"
import { Boxes, Loader2, Play, RefreshCw, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface InventoryRun {
  id: string
  status: "queued" | "running" | "completed" | "partial" | "failed" | "cancelled"
  source_count: number
  completed_source_count: number
  ingested_count: number
  eligible_count: number
  retryable_count: number
  rejected_count: number
  failure_count: number
  send_count: number
  twenty_sync_count: number
  error_message: string | null
  heartbeat_at: string
  created_at: string
}

export function LeadInventoryScaleConsole({ operatorName }: { operatorName: string }) {
  const [runs, setRuns] = useState<InventoryRun[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    setLoadError(null)
    try {
      const response = await fetch("/api/sales/lead-inventory/runs?limit=10", { cache: "no-store" })
      const payload = await response.json() as { ok?: boolean; runs?: InventoryRun[]; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "検証済み在庫ランを取得できませんでした")
      setRuns(payload.runs ?? [])
    } catch (error) {
      console.error("[lead-inventory-scale-console] refresh failed:", error)
      const message = error instanceof Error ? error.message : "検証済み在庫ランを取得できませんでした"
      setLoadError(message)
      if (!quiet) toast.error(message)
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    if (!runs.some((run) => run.status === "queued" || run.status === "running")) return
    const timer = window.setTimeout(() => { void refresh(true) }, 4_000)
    return () => window.clearTimeout(timer)
  }, [refresh, runs])

  async function start(resumeRunId?: string) {
    if (!operatorName.trim()) return toast.error("操作者名を入力してください")
    setStarting(true)
    try {
      const response = await fetch("/api/sales/lead-inventory/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatorName: operatorName.trim(), ...(resumeRunId ? { resumeRunId } : {}) }),
      })
      const payload = await response.json() as { ok?: boolean; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "検証済み在庫ランを開始できませんでした")
      toast.success(resumeRunId ? "中断ランを再開しました" : "承認済みsource packの自動取込・全件サイト検査を開始しました")
      await refresh(true)
    } catch (error) {
      console.error("[lead-inventory-scale-console] start failed:", error)
      toast.error(error instanceof Error ? error.message : "検証済み在庫ランを開始できませんでした")
    } finally {
      setStarting(false)
    }
  }

  const latest = runs[0]
  const progress = latest ? Math.round((latest.completed_source_count / Math.max(latest.source_count, 1)) * 100) : 0

  return <section className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4" aria-labelledby="inventory-scale-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 id="inventory-scale-title" className="flex items-center gap-2 font-semibold text-slate-950"><Boxes className="h-4 w-4" />数千件・検証済み在庫ラン</h3>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">承認済みの公式source packを順番に取り込み、公開DNS・HTTPS・実在サイトまで全件検査します。結果はDBへ逐次保存され、合格企業だけが後段の品質ゲートへ進めます。</p>
      </div>
      <div className="flex flex-wrap gap-2"><Badge variant="outline" className="border-emerald-300 bg-white">外部送信 0</Badge><Badge variant="outline" className="border-emerald-300 bg-white">Twenty同期 0</Badge></div>
    </div>

    {loading ? <p className="text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />在庫ランを読み込み中...</p>
      : loadError ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loadError}</p>
        : latest ? <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">最新ラン · {latest.status}</p><Badge variant={latest.status === "completed" ? "default" : latest.status === "failed" ? "destructive" : "secondary"}>{latest.completed_source_count}/{latest.source_count}収集元</Badge></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="検証済み在庫ラン進捗" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} /></div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-5"><span>取込 {latest.ingested_count}</span><span className="font-semibold text-emerald-800">サイト利用可 {latest.eligible_count}</span><span>除外 {latest.rejected_count}</span><span>一時障害 {latest.retryable_count}</span><span>収集元失敗 {latest.failure_count}</span></div>
          {(latest.send_count !== 0 || latest.twenty_sync_count !== 0) && <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-800">安全制約違反を検出しました。処理を停止して確認してください。</p>}
          {latest.error_message && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{latest.error_message}</p>}
          {latest.status === "running" && <Button className="mt-3" size="sm" variant="outline" disabled={starting} onClick={() => void start(latest.id)}><RefreshCw className="h-4 w-4" />実行確認・中断時は再開</Button>}
        </div> : <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">まだ在庫ランはありません。source packの規約確認・preview・承認後に開始できます。</p>}

    <Button disabled={starting || latest?.status === "queued" || latest?.status === "running"} onClick={() => void start()}>{starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}承認済みsource packを自動取込・全件検査</Button>
    <p className="flex items-start gap-2 text-xs leading-5 text-slate-600"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />このランは候補在庫作成専用です。パーソナライズ文面、診断レポート、Twenty、フォーム送信はコード上もDB制約上も起動しません。</p>
  </section>
}
