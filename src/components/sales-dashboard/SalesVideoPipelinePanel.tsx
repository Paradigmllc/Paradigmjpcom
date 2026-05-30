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
  ["external", "外部レンダラー"],
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
            {Object.entries(JOB_TYPE_LABELS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setJobType(value as "sales_video" | "subscription_video")}
                className={`h-10 rounded-md border text-sm font-medium ${jobType === value ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-700"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="grid gap-1 text-xs font-medium text-zinc-600">
            <span>用途</span>
            <select
              value={platform}
              onChange={(event) => setPlatform(event.target.value as (typeof PLATFORM_OPTIONS)[number][0])}
              className="h-10 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-950 outline-none focus:border-zinc-500"
            >
              {PLATFORM_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-xs font-medium text-zinc-600">
            <span>レンダー系</span>
            <select
              value={renderer}
              onChange={(event) => setRenderer(event.target.value as (typeof RENDER_OPTIONS)[number][0])}
              className="h-10 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-950 outline-none focus:border-zinc-500"
            >
              {RENDER_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-xs font-medium text-zinc-600">
            <span>優先度 {priority}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={priority}
              onChange={(event) => setPriority(Number(event.target.value))}
              className="w-full accent-zinc-950"
            />
          </label>

          <button
            type="button"
            onClick={() => void createJob()}
            disabled={busy === "create" || !selectedCompany}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Rocket size={16} aria-hidden />
            制作ジョブを作成
          </button>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Play size={14} aria-hidden />
              進行中
            </div>
            <div className="mt-2 text-2xl font-semibold text-zinc-950">{jobStats.active}</div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <ShieldCheck size={14} aria-hidden />
              承認待ち
            </div>
            <div className="mt-2 text-2xl font-semibold text-zinc-950">{jobStats.review}</div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <CheckCircle2 size={14} aria-hidden />
              完了
            </div>
            <div className="mt-2 text-2xl font-semibold text-zinc-950">{jobStats.completed}</div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <ConfigCard label="n8n" ready={config.n8n.ready} note={config.n8n.note} url={config.n8n.url} />
          <ConfigCard label="Dify Cloud" ready={config.dify.ready} note={config.dify.note} />
          <ConfigCard label="ComfyUI" ready={config.comfyui.ready} note={config.comfyui.note} url={config.comfyui.url} />
          <ConfigCard label="Vast.ai" ready={config.vast.ready} note={config.vast.note} />
          <ConfigCard label="Cloudflare R2" ready={config.r2.ready} note={config.r2.note} url={config.r2.publicBaseUrl} />
          <ConfigCard label="Slack承認" ready={config.slack.ready} note={config.slack.note} />
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
            <WandSparkles size={16} aria-hidden />
            制作ステージ
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {config.stages.map((stage) => (
              <div key={stage.id} className="rounded-lg border border-zinc-200 p-3">
                <div className="text-sm font-semibold text-zinc-950">{stage.label}</div>
                <div className="mt-1 text-xs text-zinc-500">{stage.owner}</div>
                <p className="mt-2 text-xs leading-5 text-zinc-600">{stage.gate}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <Film size={16} aria-hidden />
                動画ジョブ
              </div>
              <p className="mt-1 text-xs text-zinc-600">n8n投入、承認、完了URL反映をここで操作します。</p>
            </div>
            <label className="grid gap-1 text-xs font-medium text-zinc-600 md:w-80">
              <span>完成URL / プレビューURL</span>
              <input
                value={outputUrl}
                onChange={(event) => setOutputUrl(event.target.value)}
                placeholder="https://..."
                className="h-10 rounded-md border border-zinc-200 px-3 text-sm text-zinc-950 outline-none focus:border-zinc-500"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-3">
            {jobs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
                まだ動画ジョブはありません。左側で企業と用途を選び、制作ジョブを作成してください。
              </div>
            ) : (
              jobs.map((job) => (
                <article key={job.id} className="rounded-lg border border-zinc-200 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-zinc-950">{job.title}</h3>
                        <JobStatusBadge status={job.status} />
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">{JOB_TYPE_LABELS[job.job_type]}</span>
                      </div>
                      <p className="mt-2 text-xs text-zinc-600">
                        {job.sales_companies?.company_name ?? "企業未紐付け"} / {job.sales_companies?.domain ?? "-"} / {stageLabel(job.orchestration_stage)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">作成 {formatDate(job.created_at)} / 更新 {formatDate(job.updated_at)}</p>
                      {job.error_message ? <p className="mt-2 text-xs text-rose-600">{job.error_message}</p> : null}
                      {job.preview_url || job.r2_output_url ? (
                        <a
                          href={job.preview_url ?? job.r2_output_url ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-zinc-950 hover:underline"
                        >
                          成果物を開く <ExternalLink size={12} aria-hidden />
                        </a>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void runAction(job.id, "dispatch")}
                        disabled={busy === `dispatch:${job.id}` || ["completed", "cancelled"].includes(job.status)}
                        className="inline-flex h-9 items-center gap-1 rounded-md border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Send size={14} aria-hidden />
                        n8n投入
                      </button>
                      <button
                        type="button"
                        onClick={() => void runAction(job.id, "approve_render")}
                        disabled={busy === `approve_render:${job.id}` || job.status === "completed"}
                        className="inline-flex h-9 items-center gap-1 rounded-md border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ShieldCheck size={14} aria-hidden />
                        承認
                      </button>
                      <button
                        type="button"
                        onClick={() => void runAction(job.id, "complete")}
                        disabled={busy === `complete:${job.id}` || !outputUrl.trim()}
                        className="inline-flex h-9 items-center gap-1 rounded-md bg-zinc-950 px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} aria-hidden />
                        完了
                      </button>
                      <button
                        type="button"
                        onClick={() => void runAction(job.id, "request_revision")}
                        disabled={busy === `request_revision:${job.id}` || job.status === "completed"}
                        className="inline-flex h-9 items-center rounded-md border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        修正
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
