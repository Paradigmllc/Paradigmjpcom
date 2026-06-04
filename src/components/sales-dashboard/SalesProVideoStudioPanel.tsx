"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Clapperboard, ExternalLink, Gauge, Play, RefreshCw, Rocket, Send, UploadCloud, WandSparkles } from "lucide-react"
import { toast } from "sonner"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import type { SalesVideoJob, VideoTargetPlatform } from "@/lib/sales/video-pipeline"
import {
  VIDEO_AVATAR_STYLES,
  VIDEO_CAPTION_STYLES,
  VIDEO_PRODUCTION_GENRES,
  VIDEO_QUALITY_TIERS,
  VIDEO_VOICE_STYLES,
  type VideoAvatarStyle,
  type VideoCaptionStyle,
  type VideoProductionGenre,
  type VideoQualityTier,
  type VideoVoiceStyle,
} from "@/lib/sales/video-production"
import { formatDate } from "./SalesCommandPanels"
import {
  AVATAR_LABELS,
  CAPTION_LABELS,
  GENRE_LABELS,
  JobBadge,
  PipelineCard,
  PromptPanel,
  QUALITY_LABELS,
  SelectField,
  VOICE_LABELS,
} from "./SalesVideoStudioKit"

type ListResponse = SalesDashboardData["videoPipeline"] & { ok?: boolean; error?: string }
type ActionResponse = { ok?: boolean; job?: SalesVideoJob; message?: string; error?: string }
type OrchestrateResponse = { ok?: boolean; job?: SalesVideoJob; steps?: Array<{ step: string; ok: boolean; error?: string }>; error?: string }

const PLATFORMS = [
  ["shorts_9_16", "Shorts / Reels 9:16"],
  ["customer_subscription", "月次納品セット"],
  ["youtube_16_9", "YouTube / LP 16:9"],
  ["linkedin_1_1", "LinkedIn 1:1"],
] as const

function isProVideo(job: SalesVideoJob) {
  return (
    job.job_type === "subscription_video" ||
    job.render_engine === "external" ||
    job.render_engine === "comfyui" ||
    ["shorts_9_16", "customer_subscription"].includes(job.target_platform)
  )
}

function toolUrl(data: SalesDashboardData, slug: string, fallback: string) {
  return data.toolConnections.find((tool) => tool.slug === slug)?.baseUrl ?? fallback
}

function displayJobError(message: string | null) {
  if (!message) return null
  const legacyN8nError = ["N8N_VIDEO_PIPELINE", "WEBHOOK_URL"].join("_")
  if (message.includes(legacyN8nError)) {
    return "旧n8nジョブのエラーです。Trigger.devへ再投入してください。"
  }
  return message
}

export function SalesProVideoStudioPanel({ data }: { data: SalesDashboardData }) {
  const [jobs, setJobs] = useState<SalesVideoJob[]>(data.videoPipeline.jobs.filter(isProVideo))
  const [config, setConfig] = useState(data.videoPipeline.config)
  const [company, setCompany] = useState(data.companies[0]?.id ?? "")
  const [platform, setPlatform] = useState<VideoTargetPlatform>("shorts_9_16")
  const [genre, setGenre] = useState<VideoProductionGenre>("shorts_reel")
  const [quality, setQuality] = useState<VideoQualityTier>("professional")
  const [voice, setVoice] = useState<VideoVoiceStyle>("premium_narrator")
  const [avatar, setAvatar] = useState<VideoAvatarStyle>("studio_avatar")
  const [caption, setCaption] = useState<VideoCaptionStyle>("social_safe_area")
  const [generateAssets, setGenerateAssets] = useState({ background: true, avatar: true, broll: true, thumbnail: true, video: true })
  const [narrativePrompt, setNarrativePrompt] = useState("")
  const [visualPrompt, setVisualPrompt] = useState("")
  const [negativePrompt, setNegativePrompt] = useState("low quality, blurry, distorted, watermark, unreadable text")
  const [outputUrl, setOutputUrl] = useState("")
  const [busy, setBusy] = useState<string | null>(null)

  const selectedCompany = useMemo(() => data.companies.find((row) => row.id === company), [company, data.companies])
  const creativeBrief = {
    narrativePrompt: narrativePrompt.trim() || null,
    visualPrompt: visualPrompt.trim() || null,
    negativePrompt: negativePrompt.trim() || null,
  }

  async function refreshJobs() {
    setBusy("refresh")
    try {
      const params = new URLSearchParams({ limit: "40", report_locale: data.scope.reportLocale })
      const res = await fetch(`/api/sales/video-pipeline/jobs?${params.toString()}`)
      const json = (await res.json()) as ListResponse
      if (!res.ok || json.ok === false) throw new Error(json.error ?? "動画ジョブを取得できませんでした")
      setJobs(json.jobs.filter(isProVideo))
      setConfig(json.config)
      toast.success("プロ級動画スタジオを更新しました")
    } catch (error) {
      console.error("[pro-video-studio] refresh failed:", error)
      toast.error(error instanceof Error ? error.message : "更新に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  async function createBrief(dispatch = false) {
    if (!company) {
      toast.error("対象企業を選択してください")
      return
    }
    setBusy(dispatch ? "create-dispatch" : "create")
    try {
      const res = await fetch("/api/sales/video-pipeline/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id_or_domain: company,
          job_type: "subscription_video",
          target_platform: platform,
          render_engine: "external",
          target_segment: "agency_white_label",
          offer_angle: "production_cost",
          production_genre: genre,
          voice_style: voice,
          avatar_style: avatar,
          caption_style: caption,
          story_framework: "aida",
          quality_tier: quality,
          report_locale: data.scope.reportLocale,
          priority: quality === "premium" ? 95 : 80,
          creative_brief: creativeBrief,
        }),
      })
      const json = (await res.json()) as ActionResponse
      if (!res.ok || !json.ok || !json.job) throw new Error(json.error ?? "プロ級動画ジョブを作成できませんでした")
      setJobs((rows) => [json.job as SalesVideoJob, ...rows])
      toast.success("プロ級動画ブリーフを保存しました")
      if (dispatch) await dispatchJob(json.job.id)
    } catch (error) {
      console.error("[pro-video-studio] create failed:", error)
      toast.error(error instanceof Error ? error.message : "作成に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  async function runHeadlessStudio() {
    if (!company) {
      toast.error("対象企業を選択してください")
      return
    }
    setBusy("headless")
    try {
      const res = await fetch("/api/sales/video-pipeline/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id_or_domain: company,
          job_type: "subscription_video",
          target_platform: platform,
          render_engine: "external",
          oss_renderer: "openmontage",
          generate_background: generateAssets.background,
          generate_avatar: generateAssets.avatar,
          generate_broll: generateAssets.broll,
          generate_thumbnail: generateAssets.thumbnail,
          generate_video: generateAssets.video,
          creative_brief: creativeBrief,
          skip_tts: false,
          skip_oss_render: false,
          skip_dispatch: false,
          priority: quality === "premium" ? 98 : 85,
        }),
      })
      const json = (await res.json()) as OrchestrateResponse
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Vast.ai / ComfyUIヘッドレス実行に失敗しました")
      if (json.job) setJobs((rows) => [json.job as SalesVideoJob, ...rows.filter((job) => job.id !== json.job?.id)])
      toast.success("プロ級動画のヘッドレス実行を開始しました")
      await refreshJobs()
    } catch (error) {
      console.error("[pro-video-studio] orchestrate failed:", error)
      toast.error(error instanceof Error ? error.message : "ヘッドレス実行に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  async function dispatchJob(jobId: string) {
    setBusy(`dispatch:${jobId}`)
    try {
      const res = await fetch(`/api/sales/video-pipeline/jobs/${jobId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dispatch" }),
      })
      const json = (await res.json()) as ActionResponse
      if (!res.ok || !json.ok || !json.job) throw new Error(json.error ?? "Trigger.dev投入に失敗しました")
      setJobs((rows) => rows.map((job) => (job.id === jobId ? (json.job as SalesVideoJob) : job)))
      toast.success(json.message ?? "Trigger.devへ投入しました")
    } catch (error) {
      console.error("[pro-video-studio] dispatch failed:", error)
      toast.error(error instanceof Error ? error.message : "Trigger.dev投入に失敗しました")
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
      console.error("[pro-video-studio] complete failed:", error)
      toast.error(error instanceof Error ? error.message : "完了登録に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  const studioLinks = [
    { label: "ComfyUI", url: config.comfyui.url ?? "https://comfyui.paradigmjp.com" },
    { label: "Trigger.dev", url: config.orchestrator.dashboardUrl ?? "https://cloud.trigger.dev" },
    { label: "OpenMontage", url: process.env.NEXT_PUBLIC_OPENMONTAGE_STUDIO_URL?.trim() || "https://github.com/calesthio/OpenMontage" },
  ]

  return (
    <div className="grid min-w-0 gap-5 overflow-hidden bg-zinc-50 p-4 lg:p-5 2xl:grid-cols-[minmax(360px,480px)_minmax(0,1fr)]">
      <section className="min-w-0 rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-zinc-500">
                <Clapperboard size={15} aria-hidden /> Pro Video Studio
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">プロ級動画スタジオ</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                顧客納品・ショート・アバター・B-roll向けのGPUありラインです。指示はRevenue OSで入力し、Trigger.devがVast.ai、ComfyUI API、OpenMontageをヘッドレス実行します。
              </p>
            </div>
            <button type="button" onClick={() => void refreshJobs()} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200" aria-label="プロ級動画を更新">
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
            <SelectField label="納品形式" value={platform} options={PLATFORMS.map(([value]) => value)} labels={Object.fromEntries(PLATFORMS) as Record<VideoTargetPlatform, string>} onChange={setPlatform} />
            <SelectField label="ジャンル" value={genre} options={VIDEO_PRODUCTION_GENRES} labels={GENRE_LABELS} onChange={setGenre} />
            <SelectField label="品質" value={quality} options={VIDEO_QUALITY_TIERS} labels={QUALITY_LABELS} onChange={setQuality} />
            <SelectField label="音声" value={voice} options={VIDEO_VOICE_STYLES} labels={VOICE_LABELS} onChange={setVoice} />
            <SelectField label="アバター" value={avatar} options={VIDEO_AVATAR_STYLES} labels={AVATAR_LABELS} onChange={setAvatar} />
            <SelectField label="字幕" value={caption} options={VIDEO_CAPTION_STYLES} labels={CAPTION_LABELS} onChange={setCaption} />
          </div>
          <PromptPanel
            narrativePrompt={narrativePrompt}
            visualPrompt={visualPrompt}
            negativePrompt={negativePrompt}
            onNarrativePromptChange={setNarrativePrompt}
            onVisualPromptChange={setVisualPrompt}
            onNegativePromptChange={setNegativePrompt}
          />
          <div className="grid gap-2 rounded-xl border border-zinc-200 p-4">
            <div className="text-sm font-semibold text-zinc-950">ComfyUIで生成する素材</div>
            {([
              ["background", "背景"],
              ["avatar", "アバター"],
              ["broll", "B-roll"],
              ["thumbnail", "サムネイル"],
              ["video", "動画素材"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 text-sm text-zinc-700">
                <span>{label}</span>
                <input type="checkbox" checked={generateAssets[key]} onChange={(event) => setGenerateAssets((current) => ({ ...current, [key]: event.target.checked }))} className="h-4 w-4 accent-zinc-950" />
              </label>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => void createBrief(false)} disabled={busy !== null || !company} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 disabled:opacity-50">
              <Send size={16} aria-hidden /> ブリーフ保存
            </button>
            <button type="button" onClick={() => void createBrief(true)} disabled={busy !== null || !company} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-semibold text-white disabled:opacity-50">
              <Send size={16} aria-hidden /> Trigger.devへ投入
            </button>
          </div>
          <button type="button" onClick={() => void runHeadlessStudio()} disabled={busy !== null || !company} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-semibold text-white disabled:opacity-50">
            <Rocket size={17} aria-hidden /> Vast.ai + ComfyUIヘッドレス実行
          </button>
        </div>
      </section>

      <section className="grid min-w-0 gap-5">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <PipelineCard name="Vast.ai API" ready={config.vast.ready} note="GPUはVast.ai固定。必要な時だけ起動し、成果物はR2へ退避します。" icon={Gauge} />
          <PipelineCard name="ComfyUI API" ready={config.comfyui.ready} note="GUIはworkflow開発用。本番生成はAPIでヘッドレス実行します。" icon={WandSparkles} />
          <PipelineCard name="Trigger.dev" ready={config.orchestrator.ready} note={config.orchestrator.note} icon={Rocket} />
          <PipelineCard name="OpenMontage" ready={config.renderers.openmontage} note="ComfyUI素材、音声、字幕、ロゴを納品動画へ組み立てます。" icon={Clapperboard} />
          <PipelineCard name="Cloudflare R2" ready={config.r2.ready} note="入力素材、生成素材、下書き、最終納品物を保存します。" icon={UploadCloud} />
        </div>
        <div className="min-w-0 rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950"><Play size={16} aria-hidden /> プロ級動画ジョブ</div>
              <p className="mt-1 text-xs text-zinc-500">対象: {selectedCompany?.companyName ?? "未選択"}。細かいworkflow調整はOSS標準GUIで行い、量産はAPIで実行します。</p>
            </div>
            <label className="grid min-w-0 gap-1.5 text-xs font-medium text-zinc-600 lg:w-96">
              <span>R2納品URL</span>
              <input value={outputUrl} onChange={(event) => setOutputUrl(event.target.value)} placeholder="https://..." className="h-10 min-w-0 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900" />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {studioLinks.map((link) => (
              <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-700">
                {link.label} <ExternalLink size={12} aria-hidden />
              </a>
            ))}
          </div>
          <div className="mt-4 grid min-w-0 gap-3">
            {jobs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-sm text-zinc-500">まだプロ級動画ジョブがありません。</div>
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
                      <button type="button" onClick={() => void dispatchJob(job.id)} disabled={busy === `dispatch:${job.id}` || job.status === "completed"} className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 disabled:opacity-50">
                        <Send size={14} aria-hidden /> Trigger.dev
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
