"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, FileVideo, Play, RefreshCw, Send, UploadCloud } from "lucide-react"
import { toast } from "sonner"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import type { SalesVideoJob } from "@/lib/sales/video-pipeline"
import {
  VIDEO_QUALITY_TIERS,
  VIDEO_STORY_FRAMEWORKS,
  VIDEO_VOICE_STYLES,
  type VideoQualityTier,
  type VideoStoryFramework,
  type VideoVoiceStyle,
} from "@/lib/sales/video-production"
import { formatDate } from "./SalesCommandPanels"
import { JobBadge, PipelineCard, QUALITY_LABELS, SelectField, STORY_LABELS, VOICE_LABELS } from "./SalesVideoStudioKit"

type ListResponse = SalesDashboardData["videoPipeline"] & { ok?: boolean; error?: string }
type ActionResponse = { ok?: boolean; job?: SalesVideoJob; message?: string; error?: string }

function isReportVideo(job: SalesVideoJob) {
  return job.job_type === "sales_video" && ["report_page", "sales_deck_embed", "youtube_16_9"].includes(job.target_platform)
}

function displayJobError(message: string | null) {
  if (!message) return null
  const legacyN8nError = ["N8N_VIDEO_PIPELINE", "WEBHOOK_URL"].join("_")
  if (message.includes(legacyN8nError)) {
    return "旧n8nジョブのエラーです。必要ならプロ動画スタジオからTrigger.devへ再投入してください。"
  }
  return message
}

export function SalesReportVideoStudioPanel({ data }: { data: SalesDashboardData }) {
  const [jobs, setJobs] = useState<SalesVideoJob[]>(data.videoPipeline.jobs.filter(isReportVideo))
  const [config, setConfig] = useState(data.videoPipeline.config)
  const [company, setCompany] = useState(data.companies[0]?.id ?? "")
  const [quality, setQuality] = useState<VideoQualityTier>("professional")
  const [voice, setVoice] = useState<VideoVoiceStyle>("calm_consultant")
  const [story, setStory] = useState<VideoStoryFramework>("problem_agitate_solve")
  const [duration, setDuration] = useState("60秒")
  const [cta, setCta] = useState("診断レポートを見ながら30分で改善優先度を確認")
  const [outputUrl, setOutputUrl] = useState("")
  const [busy, setBusy] = useState<string | null>(null)

  const selectedCompany = useMemo(() => data.companies.find((row) => row.id === company), [company, data.companies])

  async function refreshJobs() {
    setBusy("refresh")
    try {
      const params = new URLSearchParams({ limit: "40", report_locale: data.scope.reportLocale })
      const res = await fetch(`/api/sales/video-pipeline/jobs?${params.toString()}`)
      const json = (await res.json()) as ListResponse
      if (!res.ok || json.ok === false) throw new Error(json.error ?? "動画ジョブを取得できませんでした")
      setJobs(json.jobs.filter(isReportVideo))
      setConfig(json.config)
      toast.success("レポート動画スタジオを更新しました")
    } catch (error) {
      console.error("[report-video-studio] refresh failed:", error)
      toast.error(error instanceof Error ? error.message : "更新に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  async function createJob(renderAfterCreate = false) {
    if (!company) {
      toast.error("対象企業を選択してください")
      return
    }
    setBusy(renderAfterCreate ? "create-render" : "create")
    try {
      const res = await fetch("/api/sales/video-pipeline/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id_or_domain: company,
          job_type: "sales_video",
          target_platform: "report_page",
          render_engine: "hyperframes",
          target_segment: "agency_white_label",
          offer_angle: "lost_revenue",
          production_genre: "executive_diagnostic",
          voice_style: voice,
          avatar_style: "none",
          caption_style: "burned_in_bilingual",
          story_framework: story,
          quality_tier: quality,
          report_locale: data.scope.reportLocale,
          priority: quality === "premium" ? 85 : 65,
          creative_brief: {
            narrativePrompt: `${duration}で診断レポートの要点、機会損失、改善優先度、CTAを説明。CTA: ${cta}`,
            visualPrompt: "clean diagnostic dashboard, evidence cards, Japanese business report, readable captions",
            negativePrompt: "unverified legal claims, unreadable text, distorted charts, watermark",
          },
        }),
      })
      const json = (await res.json()) as ActionResponse
      if (!res.ok || !json.ok || !json.job) throw new Error(json.error ?? "レポート動画ジョブを作成できませんでした")
      setJobs((rows) => [json.job as SalesVideoJob, ...rows])
      toast.success("レポート動画ブリーフを保存しました")
      if (renderAfterCreate) await renderJob(json.job.id)
    } catch (error) {
      console.error("[report-video-studio] create failed:", error)
      toast.error(error instanceof Error ? error.message : "作成に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  async function renderJob(jobId: string) {
    setBusy(`render:${jobId}`)
    try {
      const res = await fetch("/api/sales/video-pipeline/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, quality: quality === "premium" ? "high" : "draft" }),
      })
      const json = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !json.ok) throw new Error(json.error ?? "HyperFramesレンダーに失敗しました")
      toast.success("GPUなしのレポート動画を生成しました")
      await refreshJobs()
    } catch (error) {
      console.error("[report-video-studio] render failed:", error)
      toast.error(error instanceof Error ? error.message : "レンダーに失敗しました")
    } finally {
      setBusy(null)
    }
  }

  async function completeJob(jobId: string) {
    setBusy(`complete:${jobId}`)
    try {
      const res = await fetch(`/api/sales/video-pipeline/jobs/${jobId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", output_url: outputUrl.trim() || null }),
      })
      const json = (await res.json()) as ActionResponse
      if (!res.ok || !json.ok || !json.job) throw new Error(json.error ?? "完了登録に失敗しました")
      setJobs((rows) => rows.map((job) => (job.id === jobId ? (json.job as SalesVideoJob) : job)))
      toast.success("納品URLを登録しました")
    } catch (error) {
      console.error("[report-video-studio] complete failed:", error)
      toast.error(error instanceof Error ? error.message : "完了登録に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid min-w-0 gap-5 overflow-hidden bg-zinc-50 p-4 lg:p-5 2xl:grid-cols-[minmax(340px,440px)_minmax(0,1fr)]">
      <section className="min-w-0 rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-zinc-500">
                <FileVideo size={15} aria-hidden /> Report Video Studio
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">レポート用動画スタジオ</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                診断レポート解説に特化したGPU不要ラインです。HyperFramesで数字カード、根拠、CTAを安定生成します。
              </p>
            </div>
            <button type="button" onClick={() => void refreshJobs()} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200" aria-label="レポート動画を更新">
              <RefreshCw size={16} className={busy === "refresh" ? "animate-spin" : ""} aria-hidden />
            </button>
          </div>
        </div>
        <div className="grid gap-4 p-5">
          <label className="grid min-w-0 gap-1.5 text-xs font-medium text-zinc-600">
            <span>対象企業</span>
            <select value={company} onChange={(event) => setCompany(event.target.value)} className="h-10 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900">
              {data.companies.map((row) => <option key={row.id} value={row.id}>{row.companyName} / {row.domain}</option>)}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="品質" value={quality} options={VIDEO_QUALITY_TIERS} labels={QUALITY_LABELS} onChange={setQuality} />
            <SelectField label="音声" value={voice} options={VIDEO_VOICE_STYLES} labels={VOICE_LABELS} onChange={setVoice} />
            <SelectField label="ストーリー" value={story} options={VIDEO_STORY_FRAMEWORKS} labels={STORY_LABELS} onChange={setStory} />
            <label className="grid min-w-0 gap-1.5 text-xs font-medium text-zinc-600">
              <span>尺</span>
              <input value={duration} onChange={(event) => setDuration(event.target.value)} className="h-10 min-w-0 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900" />
            </label>
          </div>
          <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
            <span>CTA</span>
            <textarea value={cta} onChange={(event) => setCta(event.target.value)} rows={3} className="min-h-20 rounded-lg border border-zinc-300 px-3 py-2 text-sm leading-6 text-zinc-950 outline-none focus:border-zinc-900" />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => void createJob(false)} disabled={busy !== null || !company} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 disabled:opacity-50">
              <Send size={16} aria-hidden /> ブリーフ保存
            </button>
            <button type="button" onClick={() => void createJob(true)} disabled={busy !== null || !company} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-semibold text-white disabled:opacity-50">
              <Play size={16} aria-hidden /> 保存して生成
            </button>
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-5">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <PipelineCard name="HyperFrames" ready={config.renderers.hyperframes} note="診断レポートの解説、数字カード、CTAをGPUなしでレンダーします。" icon={FileVideo} />
          <PipelineCard name="Cloudflare R2" ready={config.r2.ready} note="承認後のMP4、字幕、サムネイル、メタデータを保存します。" icon={UploadCloud} />
          <PipelineCard name="GPUなし" ready={true} note="このスタジオではVast.ai/ComfyUIを使いません。速度と再現性を優先します。" icon={CheckCircle2} />
        </div>
        <div className="min-w-0 rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950"><Play size={16} aria-hidden /> レポート動画ジョブ</div>
              <p className="mt-1 text-xs text-zinc-500">対象: {selectedCompany?.companyName ?? "未選択"}。旧全部入りスタジオはアーカイブ済みです。</p>
            </div>
            <label className="grid min-w-0 gap-1.5 text-xs font-medium text-zinc-600 lg:w-96">
              <span>R2納品URL</span>
              <input value={outputUrl} onChange={(event) => setOutputUrl(event.target.value)} placeholder="https://..." className="h-10 min-w-0 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900" />
            </label>
          </div>
          <div className="mt-4 grid min-w-0 gap-3">
            {jobs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-sm text-zinc-500">まだレポート動画ジョブがありません。</div>
            ) : jobs.map((job) => {
              const visibleError = displayJobError(job.error_message)
              return (
                <article key={job.id} className="min-w-0 rounded-xl border border-zinc-200 p-4">
                  <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h3 className="min-w-0 break-words text-sm font-semibold text-zinc-950">{job.title}</h3>
                        <JobBadge status={job.status} />
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">{job.render_engine}</span>
                      </div>
                      <div className="mt-3 grid min-w-0 gap-2 text-xs text-zinc-600 md:grid-cols-2">
                        <div className="rounded-lg bg-zinc-50 p-2">工程: {job.orchestration_stage}</div>
                        <div className="break-all rounded-lg bg-zinc-50 p-2">R2: {job.r2_asset_prefix ?? "未発行"}</div>
                        <div className="rounded-lg bg-zinc-50 p-2">作成: {formatDate(job.created_at)}</div>
                        <div className="rounded-lg bg-zinc-50 p-2">更新: {formatDate(job.updated_at)}</div>
                      </div>
                      {visibleError ? <p className="mt-2 break-words text-xs font-medium text-rose-600">{visibleError}</p> : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button type="button" onClick={() => void renderJob(job.id)} disabled={busy === `render:${job.id}` || job.status === "completed"} className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 disabled:opacity-50">
                        <FileVideo size={14} aria-hidden /> HyperFrames
                      </button>
                      <button type="button" onClick={() => void completeJob(job.id)} disabled={busy === `complete:${job.id}` || !outputUrl.trim()} className="inline-flex h-9 items-center gap-1 rounded-lg bg-zinc-950 px-3 text-xs font-semibold text-white disabled:opacity-50">
                        <CheckCircle2 size={14} aria-hidden /> 完了
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
