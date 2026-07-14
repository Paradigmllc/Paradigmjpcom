"use client"

import { useState } from "react"
import { DatabaseZap, Globe2, RefreshCw } from "lucide-react"
import { toast } from "sonner"

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
  const [busy, setBusy] = useState(false)

  async function enqueue() {
    setBusy(true)
    try {
      const body = JSON.parse(json) as unknown
      const response = await fetch("/api/sales/demo-site/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const payload = await response.json() as { queued?: number; reused?: number; rejected?: number; error?: string }
      if (!response.ok && !payload.queued) throw new Error(payload.error ?? "キュー投入に失敗しました")
      toast.success(`${payload.queued ?? 0}社を自動生成へ追加、既存再利用${payload.reused ?? 0}社${payload.rejected ? `、拒否${payload.rejected}社` : ""}`)
      await refresh()
    } catch (error) {
      console.error("[demo-batch-console] enqueue failed:", error)
      toast.error(error instanceof Error ? error.message : "キュー投入に失敗しました")
    } finally {
      setBusy(false)
    }
  }

  async function refresh() {
    try {
      const response = await fetch("/api/sales/demo-site/batch", { cache: "no-store" })
      const payload = await response.json() as { ok?: boolean; jobs?: DemoBatchJob[]; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "取得に失敗しました")
      setJobs(payload.jobs ?? [])
    } catch (error) {
      console.error("[demo-batch-console] refresh failed:", error)
      toast.error(error instanceof Error ? error.message : "取得に失敗しました")
    }
  }

  async function issueCompleted() {
    const jobIds = jobs.filter((job) => job.status === "completed" && readQualityReport(job.result_payload.quality_report)?.passed === true).map((job) => job.id)
    if (jobIds.length === 0) return toast.error("発行できる完了ジョブがありません")
    setBusy(true)
    try {
      const response = await fetch("/api/sales/demo-site/batch", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobIds, ttlDays: 7 }) })
      const payload = await response.json() as { ok?: boolean; issued?: Array<{ ok?: boolean; previewUrl?: string }>; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "URL発行に失敗しました")
      const urls = (payload.issued ?? []).flatMap((item) => item.ok && item.previewUrl ? [item.previewUrl] : [])
      setIssuedUrls(urls)
      toast.success(`${urls.length}件の7日限定URLを発行しました`)
    } catch (error) {
      console.error("[demo-batch-console] issue failed:", error)
      toast.error(error instanceof Error ? error.message : "URL発行に失敗しました")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto mt-8 max-w-6xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div><p className="text-xs font-bold uppercase tracking-[.22em] text-indigo-700">Sustainable batch</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">スクレイピングなしの一括生成</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">確認済み事実とR2等へ保存済みの素材だけを最大100社ずつ投入します。Google検索、Google Maps UI、SNS本文・画像の自動巡回は行いません。</p></div>
        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-xs leading-6 text-slate-700">LLMは1社1回。最大3社を並列処理し、キュー末尾まで自動継続。同一manifestは既存結果を再利用します。</div>
      </div>
      <label className="mt-6 block text-sm font-semibold" htmlFor="demo-batch-json">審査済みmanifest JSON（最大100社）</label>
      <textarea id="demo-batch-json" value={json} onChange={(event) => setJson(event.target.value)} className="mt-2 min-h-80 w-full rounded-2xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100 outline-none focus:border-indigo-500" spellCheck={false} />
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={enqueue} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-700 px-5 text-sm font-bold text-white disabled:opacity-50"><DatabaseZap className="h-4 w-4" />キューへ追加</button>
        <button type="button" disabled={busy} onClick={refresh} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-bold disabled:opacity-50"><RefreshCw className="h-4 w-4" />状態を更新</button>
        <button type="button" disabled={busy} onClick={issueCompleted} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-5 text-sm font-bold text-emerald-900 disabled:opacity-50"><Globe2 className="h-4 w-4" />完了分の7日限定URL発行</button>
      </div>
      {issuedUrls.length > 0 && <div className="mt-5 rounded-2xl bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-950">今回発行した期限付き未公開URL（企業名のみ・7日で失効）</p><textarea readOnly value={issuedUrls.join("\n")} className="mt-3 min-h-28 w-full rounded-xl border border-emerald-200 bg-white p-3 text-xs leading-6 text-emerald-950" /></div>}
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
        {jobs.length === 0 ? <p className="p-6 text-sm text-slate-500">「状態を更新」で直近の生成ジョブを表示します。</p> : jobs.map((job) => {
          const company = Array.isArray(job.sales_companies) ? job.sales_companies[0] : job.sales_companies
          const quality = readQualityReport(job.result_payload.quality_report)
          return <div key={job.id} className="grid gap-3 border-b border-slate-100 p-4 text-sm last:border-b-0 sm:grid-cols-[1fr_auto]"><div><p className="font-semibold">{company?.company_name ?? job.id}</p><p className="mt-1 text-xs text-slate-500">{new Date(job.created_at).toLocaleString("ja-JP")} / 試行 {job.attempts}/{job.max_attempts}</p>{quality && <div className="mt-3 flex flex-wrap gap-2">{Object.entries(quality.dimensions ?? {}).map(([label, score]) => <span key={label} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-700">{label} {score}/25</span>)}</div>}{quality?.hardBlockers.map((blocker) => <p key={blocker} className="mt-2 text-xs font-semibold text-red-700">公開停止: {blocker}</p>)}{job.error_message && <p className="mt-2 text-xs text-red-700">{job.error_message}</p>}</div><div className="flex items-start gap-2"><span className={`h-fit rounded-full px-3 py-1 text-xs font-bold ${quality?.passed ? "bg-emerald-100 text-emerald-800" : "bg-slate-100"}`}>{quality ? `${quality.score}/100` : job.status}</span></div></div>
        })}
      </div>
    </section>
  )
}
