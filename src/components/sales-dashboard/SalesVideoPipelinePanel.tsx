"use client"

import { useMemo, useState } from "react"
import {
  CheckCircle2,
  Clapperboard,
  ExternalLink,
  Film,
  Play,
  RefreshCw,
  Rocket,
  Send,
  ShieldCheck,
  WandSparkles,
} from "lucide-react"
import { toast } from "sonner"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import type { SalesVideoJob, VideoJobStatus } from "@/lib/sales/video-pipeline"
import { formatDate, statusTone } from "./SalesCommandPanels"

type ApiListResponse = SalesDashboardData["videoPipeline"] & { ok?: boolean; error?: string }
type ApiActionResponse = { ok?: boolean; job?: SalesVideoJob; message?: string; error?: string }

const JOB_TYPE_LABELS = {
  sales_video: "営業動画",
  subscription_video: "動画サブスク納品",
} as const

const PLATFORM_OPTIONS = [
  ["sales_deck_embed", "営業資料に埋め込む 16:9"],
  ["report_page", "診断レポートに埋め込む 16:9"],
  ["shorts_9_16", "ショート動画 9:16"],
  ["youtube_16_9", "YouTube / LP 16:9"],
  ["linkedin_1_1", "LinkedIn 1:1"],
  ["customer_subscription", "顧客サブスク納品"],
] as const

const RENDER_OPTIONS = [
  ["hyperframes", "HyperFrames"],
  ["remotion", "Remotion"],
  ["openmontage", "OpenMontage"],
  ["comfyui", "ComfyUI"],
  ["external", "外部レンダー"],
] as const

const STATUS_LABELS: Record<VideoJobStatus, string> = {
  draft: "下書き",
  queued: "待機中",
  routing: "n8n投入中",
  waiting_render: "レンダー待ち",
  rendering: "レンダー中",
  review_required: "人間確認",
  completed: "完了",
  failed: "失敗",
  cancelled: "取消",
}

function boolTone(value: boolean): string {
  return value ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
}

function JobStatusBadge({ status }: { status: VideoJobStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusTone(status)}`}>{STATUS_LABELS[status]}</span>
}

function ConfigCard({
  label,
  ready,
  note,
  url,
}: {
  label: string
  ready: boolean
  note: string
  url?: string | null
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-zinc-950">{label}</div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] ${boolTone(ready)}`}>{ready ? "接続可" : "未設定"}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-600">{note}</p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-zinc-950 hover:underline"
        >
          開く <ExternalLink size={12} aria-hidden />
        </a>
      ) : null}
    </div>
  )
}

function stageLabel(stage: string): string {
  if (!stage) return "-"
  return stage.replaceAll("_", " ")
}

export function SalesVideoPipelinePanel({ data }: { data: SalesDashboardData }) {
  const [jobs, setJobs] = useState<SalesVideoJob[]>(data.videoPipeline.jobs)
  const [config, setConfig] = useState(data.videoPipeline.config)
  const [selectedCompany, setSelectedCompany] = useState(data.companies[0]?.id ?? "")
  const [jobType, setJobType] = useState<"sales_video" | "subscription_video">("sales_video")
  const [platform, setPlatform] = useState<(typeof PLATFORM_OPTIONS)[number][0]>("sales_deck_embed")
  const [renderer, setRenderer] = useState<(typeof RENDER_OPTIONS)[number][0]>("hyperframes")
  const [priority, setPriority] = useState(60)
  const [busy, setBusy] = useState<string | null>(null)
  const [outputUrl, setOutputUrl] = useState("")

  const jobStats = useMemo(() => {
    const active = jobs.filter((job) => ["queued", "routing", "waiting_render", "rendering"].includes(job.status)).length
    const review = jobs.filter((job) => job.status === "review_required").length
    const completed = jobs.filter((job) => job.status === "completed").length
    return { active, review, completed }
  }, [jobs])

  async function refreshJobs() {
    setBusy("refresh")
    try {
      const res = await fetch("/api/sales/video-pipeline/jobs?limit=40")
      const json = (await res.json()) as ApiListResponse
      if (!res.ok || json.ok === false) throw new Error(json.error ?? "動画ジョブを取得できませんでした")
      setJobs(json.jobs)
      setConfig(json.config)
      toast.success("動画制作ラインを更新しました")
    } catch (error) {
      console.error("[sales-video-pipeline-ui] refresh failed:", error)
      toast.error(error instanceof Error ? error.message : "動画制作ラインの更新に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  async function createJob() {
    if (!selectedCompany) {
      toast.error("先に対象企業を選択してください")
      return
    }
    setBusy("create")
    try {
      const res = await fetch("/api/sales/video-pipeline/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id_or_domain: selectedCompany,
          job_type: jobType,
          target_platform: platform,
          render_engine: renderer,
          priority,
        }),
      })
      const json = (await res.json()) as ApiActionResponse
      if (!res.ok || !json.ok || !json.job) throw new Error(json.error ?? "動画ジョブを作成できませんでした")
      setJobs((rows) => [json.job as SalesVideoJob, ...rows])
      toast.success("動画ジョブを作成しました")
    } catch (error) {
      console.error("[sales-video-pipeline-ui] create failed:", error)
      toast.error(error instanceof Error ? error.message : "動画ジョブ作成に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  async function runAction(jobId: string, action: string) {
    setBusy(`${action}:${jobId}`)
    try {
      const res = await fetch(`/api/sales/video-pipeline/jobs/${jobId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, output_url: outputUrl.trim() || null }),
      })
      const json = (await res.json()) as ApiActionResponse
      if (!res.ok || !json.ok || !json.job) throw new Error(json.error ?? "動画ジョブの更新に失敗しました")
      setJobs((rows) => rows.map((job) => (job.id === jobId ? (json.job as SalesVideoJob) : job)))
      toast.success(json.message ?? "動画ジョブを更新しました")
    } catch (error) {
      console.error("[sales-video-pipeline-ui] action failed:", error)
      toast.error(error instanceof Error ? error.message : "動画ジョブの操作に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
              <Clapperboard size={15} aria-hidden />
              n8nは交通整理、レンダーは専門エンジン
            </div>
            <h2 className="mt-2 text-lg font-semibold text-zinc-950">動画制作ライン</h2>
            <p className="mt-2 text-xs leading-6 text-zinc-600">
              営業動画はHyperFrames/Remotion中心、動画サブスクはOpenMontage + ComfyUI + Vast.ai + R2まで使います。
              初回納品と高コストGPU起動は人間承認を挟みます。
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshJobs()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 hover:border-zinc-400"
            aria-label="動画制作ラインを再読み込み"
            disabled={busy === "refresh"}
          >
            <RefreshCw size={16} className={busy === "refresh" ? "animate-spin" : ""} aria-hidden />
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-xs font-medium text-zinc-600">
            <span>対象企業</span>
            <select
              value={selectedCompany}
              onChange={(event) => setSelectedCompany(event.target.value)}
              className="h-10 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-950 outline-none focus:border-zinc-500"
            >
              {data.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.companyName} / {company.domain}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setJobType("sales_video")}
              className={`h-10 rounded-md border text-sm font-medium ${jobType === "sales_video" ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-700"}`}
            >
              営業動画
            </button>
            <button
              type="button"
              onClick={() => setJobType("subscription_video")}
              className={`h-10 rounded-md border text-sm font-medium ${jobType === "subscription_video" ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-700"}`}
            >
              動画サブスク
            </button>
          </div>

          <label className="grid gap-1 text-xs font-medium text-zinc-600">
            <span>用途</span>
            <select value={platform} onChange={(event) => setPlatform(event.target.value as typeof platform)} className="h-10 rounded-md border border-zinc-200 bg-white px-2 text-sm">
              {PLATFORM_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-zinc-600">
            <span>優先レンダー</span>
            <select value={renderer} onChange={(event) => setRenderer(event.target.value as typeof renderer)} className="h-10 rounded-md border border-zinc-200 bg-white px-2 text-sm">
              {RENDER_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-zinc-600">
            <span>優先度: {priority}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={priority}
              onChange={(event) => setPriority(Number(event.target.value))}
              className="w-full"
            />
          </label>
          <button
            type="button"
            onClick={() => void createJob()}
            disabled={busy === "create" || data.companies.length === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <WandSparkles size={16} aria-hidden />
            制作ジョブを作成
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-zinc-50 p-3">
            <div className="text-xs text-zinc-500">進行中</div>
            <div className="mt-1 text-xl font-semibold text-zinc-950">{jobStats.active}</div>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3">
            <div className="text-xs text-zinc-500">確認待ち</div>
            <div className="mt-1 text-xl font-semibold text-zinc-950">{jobStats.review}</div>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3">
            <div className="text-xs text-zinc-500">完了</div>
            <div className="mt-1 text-xl font-semibold text-zinc-950">{jobStats.completed}</div>
          </div>
        </div>
      </section>

      <div className="grid gap-4">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ConfigCard label="n8n" ready={config.n8n.ready} note={config.n8n.note} url={config.n8n.url} />
          <ConfigCard label="Dify Cloud" ready={config.dify.ready} note={config.dify.note} />
          <ConfigCard label="ComfyUI" ready={config.comfyui.ready} note={config.comfyui.note} url={config.comfyui.url} />
          <ConfigCard label="Vast.ai / R2" ready={config.vast.ready && config.r2.ready} note={`${config.vast.note} ${config.r2.note}`} url={config.r2.publicBaseUrl} />
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">制作ステージ</h3>
              <p className="mt-1 text-xs text-zinc-500">n8nが各ツールへ渡す順番と、人間承認の境界です。</p>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              <ShieldCheck size={14} aria-hidden />
              初回納品・GPU起動・契約前送信は承認制
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {config.stages.map((stage, index) => (
              <div key={stage.id} className="rounded-lg border border-zinc-200 p-3">
                <div className="text-xs font-semibold text-zinc-400">STEP {index + 1}</div>
                <div className="mt-1 text-sm font-semibold text-zinc-950">{stage.label}</div>
                <div className="mt-2 text-xs text-zinc-500">{stage.owner}</div>
                <div className="mt-2 text-xs leading-5 text-zinc-600">{stage.gate}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">動画ジョブ一覧</h3>
              <p className="mt-1 text-xs text-zinc-500">作成後はn8n投入、承認、完了URL記録までここから操作します。</p>
            </div>
            <input
              value={outputUrl}
              onChange={(event) => setOutputUrl(event.target.value)}
              placeholder="完了時のR2/動画URL"
              className="h-10 min-w-0 rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-500 lg:w-[360px]"
            />
          </div>
          <div className="divide-y divide-zinc-100">
            {jobs.length === 0 ? (
              <div className="p-6 text-sm text-zinc-500">まだ動画ジョブがありません。左のフォームから作成してください。</div>
            ) : (
              jobs.map((job) => (
                <article key={job.id} className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Film size={16} className="text-zinc-500" aria-hidden />
                      <h4 className="font-semibold text-zinc-950">{job.title}</h4>
                      <JobStatusBadge status={job.status} />
                    </div>
                    <div className="mt-2 text-xs text-zinc-500">
                      {JOB_TYPE_LABELS[job.job_type]} / {job.render_engine} / {job.target_platform} / 優先度 {job.priority}
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-zinc-600 md:grid-cols-3">
                      <div>企業: {job.sales_companies?.company_name ?? job.company_id ?? "-"}</div>
                      <div>段階: {stageLabel(job.orchestration_stage)}</div>
                      <div>作成: {formatDate(job.created_at)}</div>
                    </div>
                    {job.error_message ? <p className="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-800">{job.error_message}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {job.preview_url ? (
                        <a href={job.preview_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-200 px-2 text-xs font-medium text-zinc-800 hover:border-zinc-400">
                          プレビュー <ExternalLink size={12} aria-hidden />
                        </a>
                      ) : null}
                      {job.r2_output_url ? (
                        <a href={job.r2_output_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-200 px-2 text-xs font-medium text-zinc-800 hover:border-zinc-400">
                          納品URL <ExternalLink size={12} aria-hidden />
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
                    <button type="button" onClick={() => void runAction(job.id, "dispatch")} className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-zinc-950 px-2 text-xs font-semibold text-white">
                      <Send size={13} aria-hidden /> n8n投入
                    </button>
                    <button type="button" onClick={() => void runAction(job.id, "approve_render")} className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-zinc-200 px-2 text-xs font-semibold text-zinc-800">
                      <Rocket size={13} aria-hidden /> 承認
                    </button>
                    <button type="button" onClick={() => void runAction(job.id, "complete")} className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-zinc-200 px-2 text-xs font-semibold text-zinc-800">
                      <CheckCircle2 size={13} aria-hidden /> 完了
                    </button>
                    <button type="button" onClick={() => void runAction(job.id, "request_revision")} className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-zinc-200 px-2 text-xs font-semibold text-zinc-800">
                      <Play size={13} aria-hidden /> 修正
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
