"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { DatabaseZap, Globe2, Play, RefreshCw, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { chunkDemoBatch, DEMO_BATCH_MAX_ITEMS } from "@/lib/sales/demo-batch-wave"

interface DemoBatchJob {
  id: string
  status: string
  attempts: number
  max_attempts: number
  error_message: string | null
  result_payload: Record<string, unknown>
  created_at: string
  sales_companies?: { company_name?: string } | Array<{ company_name?: string }> | null
}

interface DemoBatchWaveSummary {
  total: number
  queued: number
  running: number
  completed: number
  failed: number
  cancelled: number
  qualityPassed: number
  finished: number
  progressPercent: number
}

interface BatchQualityReport {
  score: number
  passed: boolean
  hardBlockers: string[]
  warnings: string[]
  dimensions?: Record<string, number>
}

function readQualityReport(value: unknown): BatchQualityReport | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const report = value as Record<string, unknown>
  if (typeof report.score !== "number" || typeof report.passed !== "boolean") return null
  return {
    score: report.score,
    passed: report.passed,
    hardBlockers: Array.isArray(report.hardBlockers) ? report.hardBlockers.filter((item): item is string => typeof item === "string") : [],
    warnings: Array.isArray(report.warnings) ? report.warnings.filter((item): item is string => typeof item === "string") : [],
    dimensions: report.dimensions && typeof report.dimensions === "object" && !Array.isArray(report.dimensions)
      ? report.dimensions as Record<string, number>
      : undefined,
  }
}

const EXAMPLE = JSON.stringify({
  items: [{
    companyName: "サンプル事業者",
    industry: "restaurant",
    prefecture: "東京都",
    locale: "ja",
    manifest: {
      version: "2026-07-13.1",
      mode: "reviewed_manifest",
      collectionPolicy: "no_automated_fetch",
      assetStrategy: "reviewed_real_assets",
      sources: [{ id: "official", type: "official_profile_link", url: "https://www.instagram.com/example/", ownerLabel: "サンプル事業者", verifiedAt: new Date().toISOString(), fetchPolicy: "never" }],
      facts: [
        { key: "business_name", value: "サンプル事業者", sourceId: "official", verified: true },
        { key: "service", value: "焼菓子の製造販売", sourceId: "official", verified: true },
        { key: "hours", value: "営業日は公式投稿で案内", sourceId: "official", verified: true },
      ],
      assets: [1, 2, 3].map((number) => ({ id: `asset-${number}`, kind: "image", sourceUrl: `https://assets.example.com/photo-${number}.webp`, ownerLabel: "サンプル事業者", sourceAccount: "https://www.instagram.com/example/", useBasis: "generated", officialSource: true, peopleVisible: false, watermarkVisible: false, alt: `商品写真${number}` })),
    },
  }],
}, null, 2)

export function DemoBatchQueueConsole() {
  const [json, setJson] = useState(EXAMPLE)
  const [jobs, setJobs] = useState<DemoBatchJob[]>([])
  const [issuedUrls, setIssuedUrls] = useState<string[]>([])
  const [waveId, setWaveId] = useState<string | null>(null)
  const [summary, setSummary] = useState<DemoBatchWaveSummary | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async (targetWaveId?: string | null) => {
    try {
      const query = targetWaveId ? `?waveId=${encodeURIComponent(targetWaveId)}` : ""
      const response = await fetch(`/api/sales/demo-site/batch${query}`, { cache: "no-store" })
      const payload = await response.json() as { ok?: boolean; jobs?: DemoBatchJob[]; summary?: DemoBatchWaveSummary; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "取得に失敗しました")
      setJobs(payload.jobs ?? [])
      setSummary(payload.summary ?? null)
    } catch (error) {
      console.error("[demo-batch-console] refresh failed:", error)
      toast.error(error instanceof Error ? error.message : "取得に失敗しました")
    }
  }, [])

  useEffect(() => {
    if (!waveId || !summary || summary.queued + summary.running === 0) return
    const timer = window.setInterval(() => { void refresh(waveId) }, 15_000)
    return () => window.clearInterval(timer)
  }, [refresh, summary, waveId])

  async function enqueue() {
    setBusy(true)
    try {
      const body = JSON.parse(json) as unknown
      const response = await fetch("/api/sales/demo-site/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const payload = await response.json() as { queued?: number; reused?: number; rejected?: number; waveId?: string; error?: string }
      if (!response.ok && !payload.queued) throw new Error(payload.error ?? "キュー投入に失敗しました")
      if (!payload.waveId) throw new Error("wave IDを取得できませんでした")
      setWaveId(payload.waveId)
      toast.success(`${payload.queued ?? 0}社を自動生成へ追加、既存再利用${payload.reused ?? 0}社${payload.rejected ? `、拒否${payload.rejected}社` : ""}`)
      await refresh(payload.waveId)
    } catch (error) {
      console.error("[demo-batch-console] enqueue failed:", error)
      toast.error(error instanceof Error ? error.message : "キュー投入に失敗しました")
    } finally {
      setBusy(false)
    }
  }

  async function issueCompleted() {
    const jobIds = jobs.filter((job) => job.status === "completed" && readQualityReport(job.result_payload.quality_report)?.passed === true).map((job) => job.id)
    if (jobIds.length === 0) return toast.error("発行できる完了ジョブがありません")
    setBusy(true)
    try {
      const urls: string[] = []
      for (const jobIdChunk of chunkDemoBatch(jobIds, 100)) {
        const response = await fetch("/api/sales/demo-site/batch", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobIds: jobIdChunk, ttlDays: 7 }) })
        const payload = await response.json() as { ok?: boolean; issued?: Array<{ ok?: boolean; previewUrl?: string }>; error?: string }
        if (!response.ok || !payload.ok) throw new Error(payload.error ?? "URL発行に失敗しました")
        urls.push(...(payload.issued ?? []).flatMap((item) => item.ok && item.previewUrl ? [item.previewUrl] : []))
      }
      setIssuedUrls(urls)
      toast.success(`${urls.length}件の7日限定URLを発行しました`)
    } catch (error) {
      console.error("[demo-batch-console] issue failed:", error)
      toast.error(error instanceof Error ? error.message : "URL発行に失敗しました")
    } finally {
      setBusy(false)
    }
  }

  async function runWaveAction(action: "drain" | "retry_failed") {
    if (action === "retry_failed" && !waveId) return toast.error("対象waveがありません")
    setBusy(true)
    try {
      const response = await fetch("/api/sales/demo-site/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, waveId: waveId ?? undefined, limit: 3 }),
      })
      const payload = await response.json() as { ok?: boolean; recovered?: number; status?: string; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "生成waveの操作に失敗しました")
      toast.success(action === "retry_failed" ? `失敗${payload.recovered ?? 0}件を再試行へ戻しました` : "生成drainを再開しました")
      await refresh(waveId)
    } catch (error) {
      console.error("[demo-batch-console] wave action failed:", error)
      toast.error(error instanceof Error ? error.message : "生成waveの操作に失敗しました")
    } finally {
      setBusy(false)
    }
  }

  const progress = useMemo(() => summary?.progressPercent ?? 0, [summary])

  return (
    <section className="mx-auto mt-8 max-w-6xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div><p className="text-xs font-bold uppercase tracking-[.22em] text-indigo-700">Sustainable batch</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">スクレイピングなしの一括生成</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">確認済み事実と保存済み素材だけを最大{DEMO_BATCH_MAX_ITEMS}社のwaveとして投入します。Google検索、Google Maps UI、SNS本文・画像の自動巡回は行いません。</p></div>
        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-xs leading-6 text-slate-700">LLMは1社1回。最大3社を並列処理し、キュー末尾まで自動継続。同一manifestは既存結果を再利用します。</div>
      </div>
      <label className="mt-6 block text-sm font-semibold" htmlFor="demo-batch-json">審査済みmanifest JSON（最大{DEMO_BATCH_MAX_ITEMS}社）</label>
      <textarea id="demo-batch-json" value={json} onChange={(event) => setJson(event.target.value)} className="mt-2 min-h-80 w-full rounded-2xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100 outline-none focus:border-indigo-500" spellCheck={false} />
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={enqueue} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-700 px-5 text-sm font-bold text-white disabled:opacity-50"><DatabaseZap className="h-4 w-4" />キューへ追加</button>
        <button type="button" disabled={busy} onClick={() => void refresh(waveId)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-bold disabled:opacity-50"><RefreshCw className="h-4 w-4" />状態を更新</button>
        <button type="button" disabled={busy} onClick={() => void runWaveAction("drain")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-indigo-300 bg-indigo-50 px-5 text-sm font-bold text-indigo-900 disabled:opacity-50"><Play className="h-4 w-4" />停止中なら再開</button>
        <button type="button" disabled={busy || !waveId || !summary?.failed} onClick={() => void runWaveAction("retry_failed")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 text-sm font-bold text-amber-950 disabled:opacity-50"><RotateCcw className="h-4 w-4" />失敗分を再試行</button>
        <button type="button" disabled={busy} onClick={issueCompleted} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-5 text-sm font-bold text-emerald-900 disabled:opacity-50"><Globe2 className="h-4 w-4" />完了分の7日限定URL発行</button>
      </div>
      {summary && <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4" aria-live="polite">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><p className="text-sm font-bold text-indigo-950">生成wave {waveId ? waveId.slice(0, 8) : "直近"}</p><p className="text-xs text-indigo-900">{summary.finished}/{summary.total}処理済み・品質合格{summary.qualityPassed}・失敗{summary.failed}</p></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-indigo-700 transition-[width] duration-500" style={{ width: `${progress}%` }} /></div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-5"><WaveMetric label="待機" value={summary.queued} /><WaveMetric label="生成中" value={summary.running} /><WaveMetric label="完了" value={summary.completed} /><WaveMetric label="品質合格" value={summary.qualityPassed} /><WaveMetric label="失敗" value={summary.failed} /></div>
      </div>}
      {issuedUrls.length > 0 && <div className="mt-5 rounded-2xl bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-950">今回発行した期限付き未公開URL（企業名のみ・7日で失効）</p><textarea readOnly value={issuedUrls.join("\n")} className="mt-3 min-h-28 w-full rounded-xl border border-emerald-200 bg-white p-3 text-xs leading-6 text-emerald-950" /></div>}
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
        {jobs.length === 0 ? <p className="p-6 text-sm text-slate-500">「状態を更新」で直近の生成ジョブを表示します。</p> : jobs.map((job) => {
          const company = Array.isArray(job.sales_companies) ? job.sales_companies[0] : job.sales_companies
          const quality = readQualityReport(job.result_payload.quality_report)
          return <div key={job.id} className="grid gap-3 border-b border-slate-100 p-4 text-sm last:border-b-0 sm:grid-cols-[1fr_auto]"><div><p className="font-semibold">{company?.company_name ?? job.id}</p><p className="mt-1 text-xs text-slate-500">{new Date(job.created_at).toLocaleString("ja-JP")} / 試行 {job.attempts}/{job.max_attempts}</p>{quality && <><p className="mt-2 text-[11px] font-semibold text-amber-700">構造・文章・素材の自動事前検査（最終の実画面合格ではありません）</p><div className="mt-3 flex flex-wrap gap-2">{Object.entries(quality.dimensions ?? {}).map(([label, score]) => <span key={label} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-700">{label} {score}/25</span>)}</div></>}{quality?.hardBlockers.map((blocker) => <p key={blocker} className="mt-2 text-xs font-semibold text-red-700">公開停止: {blocker}</p>)}{job.error_message && <p className="mt-2 text-xs text-red-700">{job.error_message}</p>}</div><div className="flex items-start gap-2"><span className={`h-fit rounded-full px-3 py-1 text-xs font-bold ${quality?.passed ? "bg-emerald-100 text-emerald-800" : "bg-slate-100"}`}>{quality ? `事前検査 ${quality.score}/100` : job.status}</span></div></div>
        })}
      </div>
    </section>
  )
}

function WaveMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-white px-3 py-2 text-indigo-950"><strong className="block text-lg">{value}</strong><span>{label}</span></div>
}
