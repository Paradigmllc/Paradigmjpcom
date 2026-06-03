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
  SlidersHorizontal,
} from "lucide-react"
import { toast } from "sonner"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import type { SalesVideoJob, VideoJobStatus, VideoLossInputs, VideoOfferAngle, VideoTargetSegment } from "@/lib/sales/video-pipeline"
import { VIDEO_PRODUCTION_GENRE_LABELS, VIDEO_QUALITY_TIER_LABELS } from "@/lib/sales/video-production"
import {
  VIDEO_OFFER_ANGLES,
  VIDEO_OFFER_ANGLE_LABELS,
  VIDEO_TARGET_SEGMENTS,
  VIDEO_SEGMENT_LABELS,
  buildVideoLossSimulation,
  defaultVideoLossInputs,
} from "@/lib/sales/video-strategy"
import { formatDate, statusTone } from "./SalesCommandPanels"
import { SalesVideoProductionControls, type SalesVideoProductionSelection } from "./SalesVideoProductionControls"

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

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
}

function boolTone(value: boolean): string {
  return value ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-amber-200"
}

function JobStatusBadge({ status }: { status: VideoJobStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusTone(status)}`}>{STATUS_LABELS[status]}</span>
}

function ConfigCard({ label, ready, note, url }: { label: string; ready: boolean; note: string; url?: string | null }) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 break-words text-sm font-semibold text-zinc-950">{label}</div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${boolTone(ready)}`}>
          {ready ? "接続可" : "未設定"}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-600">{note}</p>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-zinc-950 hover:underline">
          開く <ExternalLink size={12} aria-hidden />
        </a>
      ) : null}
    </div>
  )
}

function NumberInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  suffix?: string
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
      <span>{label}</span>
      <div className="flex h-10 items-center rounded-lg border border-zinc-300 bg-white px-2 focus-within:border-zinc-900">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="min-w-0 flex-1 bg-transparent text-sm text-zinc-950 outline-none"
        />
        {suffix ? <span className="ml-2 text-xs text-zinc-500">{suffix}</span> : null}
      </div>
    </label>
  )
}

function stageLabel(stage: string): string {
  return stage ? stage.replaceAll("_", " ") : "-"
}

export function SalesVideoPipelinePanel({ data }: { data: SalesDashboardData }) {
  const [jobs, setJobs] = useState<SalesVideoJob[]>(data.videoPipeline.jobs)
  const [config, setConfig] = useState(data.videoPipeline.config)
  const [selectedCompany, setSelectedCompany] = useState(data.companies[0]?.id ?? "")
  const [jobType, setJobType] = useState<"sales_video" | "subscription_video">("sales_video")
  const [platform, setPlatform] = useState<(typeof PLATFORM_OPTIONS)[number][0]>("sales_deck_embed")
  const [renderer, setRenderer] = useState<(typeof RENDER_OPTIONS)[number][0]>("hyperframes")
  const [targetSegment, setTargetSegment] = useState<VideoTargetSegment>("agency_white_label")
  const [offerAngle, setOfferAngle] = useState<VideoOfferAngle>("lost_revenue")
  const [productionSelection, setProductionSelection] = useState<SalesVideoProductionSelection>({
    productionGenre: "executive_diagnostic",
    voiceStyle: "calm_consultant",
    avatarStyle: "none",
    captionStyle: "clean_lower_third",
    storyFramework: "problem_agitate_solve",
    qualityTier: "professional",
  })
  const [lossInputs, setLossInputs] = useState<Required<VideoLossInputs>>(defaultVideoLossInputs("agency_white_label"))
  const [priority, setPriority] = useState(60)
  const [busy, setBusy] = useState<string | null>(null)
  const [outputUrl, setOutputUrl] = useState("")

  const lossSimulation = useMemo(
    () => buildVideoLossSimulation({ segment: targetSegment, offerAngle, inputs: lossInputs }),
    [targetSegment, offerAngle, lossInputs],
  )

  const jobStats = useMemo(() => {
    const active = jobs.filter((job) => ["queued", "routing", "waiting_render", "rendering"].includes(job.status)).length
    const review = jobs.filter((job) => job.status === "review_required").length
    const completed = jobs.filter((job) => job.status === "completed").length
    return { active, review, completed }
  }, [jobs])

  const selectedCompanyRecord = useMemo(
    () => data.companies.find((company) => company.id === selectedCompany),
    [data.companies, selectedCompany],
  )

  function changeSegment(value: VideoTargetSegment) {
    setTargetSegment(value)
    setLossInputs(defaultVideoLossInputs(value))
  }

  function updateLossInput(key: keyof Required<VideoLossInputs>, value: number) {
    setLossInputs((current) => ({ ...current, [key]: Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0 }))
  }

  async function refreshJobs() {
    setBusy("refresh")
    try {
      const params = new URLSearchParams({ limit: "40", report_locale: data.scope.reportLocale })
      const res = await fetch(`/api/sales/video-pipeline/jobs?${params.toString()}`)
      const json = (await res.json()) as ApiListResponse
      if (!res.ok || json.ok === false) throw new Error(json.error ?? "動画ジョブを取得できませんでした")
      setJobs(json.jobs)
      setConfig(json.config)
      toast.success("動画スタジオを更新しました")
    } catch (error) {
      console.error("[sales-video-pipeline-ui] refresh failed:", error)
      toast.error(error instanceof Error ? error.message : "動画スタジオの更新に失敗しました")
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
          target_segment: targetSegment,
          offer_angle: offerAngle,
          production_genre: productionSelection.productionGenre,
          voice_style: productionSelection.voiceStyle,
          avatar_style: productionSelection.avatarStyle,
          caption_style: productionSelection.captionStyle,
          story_framework: productionSelection.storyFramework,
          quality_tier: productionSelection.qualityTier,
          loss_inputs: lossInputs,
          report_locale: data.scope.reportLocale,
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
    <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(440px,520px)_minmax(0,1fr)]">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                <Clapperboard size={15} aria-hidden />
                動画スタジオ
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">制作ジョブを組む</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                n8nは交通整理だけを担当します。Difyが構成と文面を決め、HyperFrames / Remotion / OpenMontage / ComfyUIが制作し、R2へ納品物を保存します。
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshJobs()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:border-zinc-400"
              aria-label="動画スタジオを再読み込み"
              disabled={busy === "refresh"}
            >
              <RefreshCw size={16} className={busy === "refresh" ? "animate-spin" : ""} aria-hidden />
            </button>
          </div>
        </div>

        <div className="grid min-w-0 gap-4 p-5">
          <label className="grid min-w-0 gap-1.5 text-xs font-medium text-zinc-600">
            <span>対象企業</span>
            <select value={selectedCompany} onChange={(event) => setSelectedCompany(event.target.value)} className="h-10 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900">
              {data.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.companyName} / {company.domain}
                </option>
              ))}
            </select>
          </label>

          <div className="grid min-w-0 grid-cols-2 gap-2">
            {Object.entries(JOB_TYPE_LABELS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setJobType(value as "sales_video" | "subscription_video")}
                className={`min-w-0 overflow-hidden rounded-lg border px-3 py-2 text-sm font-semibold leading-5 transition ${jobType === value ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"}`}
              >
                <span className="block truncate">{label}</span>
              </button>
            ))}
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <label className="grid min-w-0 gap-1.5 text-xs font-medium text-zinc-600">
              <span>セグメント</span>
              <select value={targetSegment} onChange={(event) => changeSegment(event.target.value as VideoTargetSegment)} className="h-10 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900">
                {VIDEO_TARGET_SEGMENTS.map((segment) => (
                  <option key={segment} value={segment}>{VIDEO_SEGMENT_LABELS[segment]}</option>
                ))}
              </select>
            </label>

            <label className="grid min-w-0 gap-1.5 text-xs font-medium text-zinc-600">
              <span>訴求軸</span>
              <select value={offerAngle} onChange={(event) => setOfferAngle(event.target.value as VideoOfferAngle)} className="h-10 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900">
                {VIDEO_OFFER_ANGLES.map((angle) => (
                  <option key={angle} value={angle}>{VIDEO_OFFER_ANGLE_LABELS[angle]}</option>
                ))}
              </select>
            </label>
          </div>

          <SalesVideoProductionControls
            value={productionSelection}
            onChange={setProductionSelection}
            locale={data.scope.reportLocale}
            companySlugOrDomain={selectedCompanyRecord?.slug ?? selectedCompanyRecord?.domain ?? selectedCompany}
            jobType={jobType}
          />

          <section className="border-t border-zinc-200 pt-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
              <SlidersHorizontal size={15} aria-hidden />
              損失シミュレーター
            </div>
            <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
              <NumberInput label="月間失注件数" value={lossInputs.monthlyRejectedProjects} onChange={(value) => updateLossInput("monthlyRejectedProjects", value)} suffix="件" />
              <NumberInput label="平均1件単価" value={lossInputs.averageProjectValueUsd} onChange={(value) => updateLossInput("averageProjectValueUsd", value)} suffix="USD" />
              <NumberInput label="月間動画予算" value={lossInputs.monthlyVideoBudgetUsd} onChange={(value) => updateLossInput("monthlyVideoBudgetUsd", value)} suffix="USD" />
              <NumberInput label="現在の動画本数" value={lossInputs.currentVideosPerMonth} onChange={(value) => updateLossInput("currentVideosPerMonth", value)} suffix="本/月" />
              <NumberInput label="競合の動画本数" value={lossInputs.competitorVideosPerMonth} onChange={(value) => updateLossInput("competitorVideosPerMonth", value)} suffix="本/月" />
              <NumberInput label="粗利率" value={lossInputs.grossMarginPercent} onChange={(value) => updateLossInput("grossMarginPercent", value)} suffix="%" />
            </div>
            <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-xs text-zinc-500">推定年間機会損失</div>
              <div className="mt-1 text-2xl font-semibold text-zinc-950">{formatUsd(lossSimulation.annual_loss_usd)}</div>
              <p className="mt-2 text-xs leading-5 text-zinc-600">{lossSimulation.customer_safe_summary_ja}</p>
            </div>
          </section>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <label className="grid min-w-0 gap-1.5 text-xs font-medium text-zinc-600">
              <span>用途</span>
              <select value={platform} onChange={(event) => setPlatform(event.target.value as (typeof PLATFORM_OPTIONS)[number][0])} className="h-10 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900">
                {PLATFORM_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="grid min-w-0 gap-1.5 text-xs font-medium text-zinc-600">
              <span>レンダー系</span>
              <select value={renderer} onChange={(event) => setRenderer(event.target.value as (typeof RENDER_OPTIONS)[number][0])} className="h-10 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900">
                {RENDER_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>

          <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
            <span>優先度 {priority}</span>
            <input type="range" min={0} max={100} value={priority} onChange={(event) => setPriority(Number(event.target.value))} className="w-full accent-zinc-950" />
          </label>

          <button type="button" onClick={() => void createJob()} disabled={busy === "create" || !selectedCompany} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            <Rocket size={16} aria-hidden />
            制作ジョブを作成
          </button>
        </div>
      </section>

      <section className="grid min-w-0 gap-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500"><Play size={14} aria-hidden />進行中</div>
            <div className="mt-2 text-2xl font-semibold">{jobStats.active}</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500"><ShieldCheck size={14} aria-hidden />承認待ち</div>
            <div className="mt-2 text-2xl font-semibold">{jobStats.review}</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500"><CheckCircle2 size={14} aria-hidden />完了</div>
            <div className="mt-2 text-2xl font-semibold">{jobStats.completed}</div>
          </div>
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ConfigCard label="n8n" ready={config.n8n.ready} note={config.n8n.note} url={config.n8n.url} />
          <ConfigCard label="Dify Cloud" ready={config.dify.ready} note={config.dify.note} />
          <ConfigCard label="ComfyUI" ready={config.comfyui.ready} note={config.comfyui.note} url={config.comfyui.url} />
          <ConfigCard label="Vast.ai" ready={config.vast.ready} note={config.vast.note} />
          <ConfigCard label="Cloudflare R2" ready={config.r2.ready} note={config.r2.note} url={config.r2.publicBaseUrl} />
          <ConfigCard label="Slack承認" ready={config.slack.ready} note={config.slack.note} />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
            <Clapperboard size={16} aria-hidden />
            制作レーン
          </div>
          <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {config.stages.map((stage, index) => (
              <div key={stage.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white">{index + 1}</span>
                  <span className="text-sm font-semibold text-zinc-950">{stage.label}</span>
                </div>
                <div className="mt-2 text-xs font-medium text-zinc-500">{stage.owner}</div>
                <p className="mt-2 text-xs leading-5 text-zinc-600">{stage.gate}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <Film size={16} aria-hidden />
                動画ジョブ
              </div>
              <p className="mt-1 text-xs text-zinc-500">n8n投入、承認、完了URL反映をここで操作します。</p>
            </div>
            <label className="grid gap-1.5 text-xs font-medium text-zinc-600 md:w-80">
              <span>完成URL / プレビューURL</span>
              <input value={outputUrl} onChange={(event) => setOutputUrl(event.target.value)} placeholder="https://..." className="h-10 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900" />
            </label>
          </div>

          <div className="mt-4 grid gap-3">
            {jobs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500">
                まだ動画ジョブがありません。左側で企業、セグメント、訴求軸を選んで制作ジョブを作成してください。
              </div>
            ) : (
              jobs.map((job) => (
                <article key={job.id} className="rounded-xl border border-zinc-200 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-zinc-950">{job.title}</h3>
                        <JobStatusBadge status={job.status} />
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">{JOB_TYPE_LABELS[job.job_type]}</span>
                      </div>
                      <p className="mt-2 text-xs text-zinc-600">
                        {job.sales_companies?.company_name ?? "企業未紐付け"} / {job.sales_companies?.domain ?? "-"} / {stageLabel(job.orchestration_stage)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">{VIDEO_SEGMENT_LABELS[job.target_segment] ?? job.target_segment}</span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">{VIDEO_OFFER_ANGLE_LABELS[job.offer_angle] ?? job.offer_angle}</span>
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">{VIDEO_PRODUCTION_GENRE_LABELS[job.production_genre] ?? job.production_genre}</span>
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">{VIDEO_QUALITY_TIER_LABELS[job.quality_tier] ?? job.quality_tier}</span>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700">{formatUsd(job.loss_simulation?.annual_loss_usd ?? 0)} / 年</span>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">作成 {formatDate(job.created_at)} / 更新 {formatDate(job.updated_at)}</p>
                      {job.error_message ? <p className="mt-2 text-xs text-rose-600">{job.error_message}</p> : null}
                      {job.preview_url || job.r2_output_url ? (
                        <a href={job.preview_url ?? job.r2_output_url ?? "#"} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-zinc-950 hover:underline">
                          成果物を開く <ExternalLink size={12} aria-hidden />
                        </a>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void runAction(job.id, "dispatch")} disabled={busy === `dispatch:${job.id}` || ["completed", "cancelled"].includes(job.status)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50">
                        <Send size={14} aria-hidden /> n8n投入
                      </button>
                      <button type="button" onClick={() => void runAction(job.id, "approve_render")} disabled={busy === `approve_render:${job.id}` || job.status === "completed"} className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50">
                        <ShieldCheck size={14} aria-hidden /> 承認
                      </button>
                      <button type="button" onClick={() => void runAction(job.id, "complete")} disabled={busy === `complete:${job.id}` || !outputUrl.trim()} className="inline-flex h-9 items-center gap-1 rounded-lg bg-zinc-950 px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                        <CheckCircle2 size={14} aria-hidden /> 完了
                      </button>
                      <button type="button" onClick={() => void runAction(job.id, "request_revision")} disabled={busy === `request_revision:${job.id}` || job.status === "completed"} className="inline-flex h-9 items-center rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50">
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
