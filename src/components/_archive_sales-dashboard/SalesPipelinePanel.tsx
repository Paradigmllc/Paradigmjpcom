"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Clock3, Play, RefreshCw, Route, Send, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import type { SalesPipelineRun, SalesPipelineStep } from "@/lib/sales/sales-pipeline"

type PipelineActionResult = {
  ok?: boolean
  run?: SalesPipelineRun
  createdRun?: SalesPipelineRun
  error?: string
  message?: string
}

function statusTone(status: string): string {
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (status === "running" || status === "queued" || status === "waiting_external") return "border-amber-200 bg-amber-50 text-amber-800"
  if (status === "skipped") return "border-slate-200 bg-slate-50 text-slate-700"
  return "border-rose-200 bg-rose-50 text-rose-800"
}

function statusIcon(status: string) {
  if (status === "completed") return <CheckCircle2 size={15} className="text-emerald-600" aria-hidden />
  if (status === "failed" || status === "needs_review") return <TriangleAlert size={15} className="text-rose-600" aria-hidden />
  return <Clock3 size={15} className="text-amber-600" aria-hidden />
}

function companyNameForRun(run: SalesPipelineRun): string {
  return run.sales_companies?.company_name ?? run.company_id
}

function sortedSteps(run: SalesPipelineRun): SalesPipelineStep[] {
  return [...(run.steps ?? [])].sort((a, b) => a.position - b.position)
}

export function SalesPipelinePanel({ data }: { data: SalesDashboardData }) {
  const [companyId, setCompanyId] = useState(data.companies[0]?.id ?? "")
  const [requireVideo, setRequireVideo] = useState(false)
  const [autoSync, setAutoSync] = useState(true)
  const [allowLiveOutreach, setAllowLiveOutreach] = useState(false)
  const [first5Approval, setFirst5Approval] = useState(true)
  const [dispatchMode, setDispatchMode] = useState<"local" | "dispatch">("local")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<PipelineActionResult | null>(null)

  const latestRuns = data.salesPipeline.runs.slice(0, 5)
  const selectedCompany = useMemo(
    () => data.companies.find((company) => company.id === companyId) ?? null,
    [companyId, data.companies],
  )

  async function startPipeline() {
    if (!companyId) {
      toast.error("企業を選択してください")
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/sales/pipeline-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          source: "sales_os",
          require_video: requireVideo,
          auto_sync_external_studios: autoSync,
          requested_by: "sales-command-center",
          payload: {
            allow_live_outreach: allowLiveOutreach,
            first5_approval: first5Approval,
          },
          mode: dispatchMode,
        }),
      })
      const json = (await res.json()) as PipelineActionResult
      if (!res.ok || json.error) throw new Error(json.error ?? "Sales pipeline failed")
      setResult(json)
      if (json.ok) toast.success(dispatchMode === "dispatch" ? "Trigger.devへ投入しました" : "営業OSフローを実行しました")
      else toast.error(json.message ?? "営業OSフローは確認待ちです")
    } catch (error) {
      console.error("[sales-pipeline-panel] start failed:", error)
      const message = error instanceof Error ? error.message : "営業OSフローの開始に失敗しました"
      setResult({ ok: false, error: message })
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  async function rerun(runId: string, action: "run_local" | "dispatch") {
    setBusy(true)
    try {
      const res = await fetch(`/api/sales/pipeline-runs/${runId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const json = (await res.json()) as PipelineActionResult
      if (!res.ok || json.error) throw new Error(json.error ?? "Pipeline action failed")
      setResult(json)
      toast.success(action === "dispatch" ? "Trigger.devへ再投入しました" : "ローカル実行を再開しました")
    } catch (error) {
      console.error("[sales-pipeline-panel] action failed:", error)
      toast.error(error instanceof Error ? error.message : "営業OSフロー操作に失敗しました")
    } finally {
      setBusy(false)
    }
  }

  const activeRun = result?.run ?? latestRuns[0] ?? null

  return (
    <section className="grid min-w-0 gap-4 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Route size={18} className="text-zinc-900" aria-hidden />
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">SALES OS PIPELINE</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">Supabase SSOT 一気通貫フロー</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
            Twenty/CSV投入からカルテ、レポート、動画、R2、Directus/Keystatic、Twenty納品URL書き戻しまでを1つのrunとして記録します。
          </p>
        </div>
        {data.salesPipeline.error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            migration未適用: {data.salesPipeline.error}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
          <span>対象企業</span>
          <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700">
            <input type="checkbox" checked={allowLiveOutreach} onChange={(event) => setAllowLiveOutreach(event.target.checked)} />
            ライブ送信
          </label>
          <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700">
            <input type="checkbox" checked={first5Approval} onChange={(event) => setFirst5Approval(event.target.checked)} />
            初回承認
          </label>
          <select
            value={companyId}
            onChange={(event) => setCompanyId(event.target.value)}
            className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
          >
            {data.companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.companyName} / {company.domain}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700">
            <input type="checkbox" checked={requireVideo} onChange={(event) => setRequireVideo(event.target.checked)} />
            動画も生成
          </label>
          <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700">
            <input type="checkbox" checked={autoSync} onChange={(event) => setAutoSync(event.target.checked)} />
            外部CMS同期
          </label>
          <select
            value={dispatchMode}
            onChange={(event) => setDispatchMode(event.target.value === "dispatch" ? "dispatch" : "local")}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700"
            aria-label="実行方式"
          >
            <option value="local">ローカル実行</option>
            <option value="dispatch">Trigger.dev投入</option>
          </select>
          <button
            type="button"
            onClick={() => void startPipeline()}
            disabled={busy || !companyId}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? <RefreshCw size={16} className="animate-spin" aria-hidden /> : <Play size={16} aria-hidden />}
            開始
          </button>
        </div>
      </div>

      {selectedCompany ? (
        <div className="grid gap-2 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 sm:grid-cols-4">
          <div><span className="font-semibold text-zinc-800">企業:</span> {selectedCompany.companyName}</div>
          <div><span className="font-semibold text-zinc-800">状態:</span> {selectedCompany.pipelineStatus}</div>
          <div><span className="font-semibold text-zinc-800">レポート:</span> {selectedCompany.reportUrl ?? "未生成"}</div>
          <div><span className="font-semibold text-zinc-800">言語:</span> {selectedCompany.reportLocale ?? "-"}</div>
        </div>
      ) : null}

      {activeRun ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                {statusIcon(activeRun.status)}
                {companyNameForRun(activeRun)} / {activeRun.status}
              </div>
              <p className="mt-1 text-xs text-zinc-500">run: {activeRun.id}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void rerun(activeRun.id, "run_local")}
                disabled={busy}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 disabled:opacity-50"
              >
                <RefreshCw size={14} aria-hidden />
                再開
              </button>
              <button
                type="button"
                onClick={() => void rerun(activeRun.id, "dispatch")}
                disabled={busy}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 disabled:opacity-50"
              >
                <Send size={14} aria-hidden />
                Trigger.dev
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {sortedSteps(activeRun).map((step) => (
              <div key={step.id} className={`min-w-0 rounded-lg border p-3 text-xs ${statusTone(step.status)}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{step.step_key}</span>
                  <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5">{step.status}</span>
                </div>
                <p className="mt-2 truncate opacity-80">{step.owner_tool}</p>
                {step.error_message ? <p className="mt-2 line-clamp-2 font-medium">{step.error_message}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500">
          pipeline run はまだありません。対象企業を選んで開始してください。
        </div>
      )}
    </section>
  )
}
