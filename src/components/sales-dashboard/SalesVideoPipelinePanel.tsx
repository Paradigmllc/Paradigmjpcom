"use client"

import { useMemo, useState } from "react"
import {
  Boxes,
  CheckCircle2,
  Clapperboard,
  Copy,
  ExternalLink,
  FileVideo,
  Gauge,
  Mic2,
  Play,
  RefreshCw,
  Rocket,
  Send,
  ShieldCheck,
  UploadCloud,
  WandSparkles,
} from "lucide-react"
import { toast } from "sonner"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import {
  VIDEO_AVATAR_STYLES,
  VIDEO_CAPTION_STYLES,
  VIDEO_PRODUCTION_GENRES,
  VIDEO_QUALITY_TIERS,
  VIDEO_STORY_FRAMEWORKS,
  VIDEO_VOICE_STYLES,
  type VideoAvatarStyle,
  type VideoCaptionStyle,
  type VideoProductionGenre,
  type VideoQualityTier,
  type VideoStoryFramework,
  type VideoVoiceStyle,
} from "@/lib/sales/video-production"
import {
  VIDEO_OFFER_ANGLES,
  VIDEO_TARGET_SEGMENTS,
  buildVideoLossSimulation,
  defaultVideoLossInputs,
  type VideoLossInputs,
  type VideoOfferAngle,
  type VideoTargetSegment,
} from "@/lib/sales/video-strategy"
import type { SalesVideoJob, VideoJobStatus } from "@/lib/sales/video-pipeline"
import { formatDate } from "./SalesCommandPanels"
import {
  ANGLE_LABELS,
  AVATAR_LABELS,
  CAPTION_LABELS,
  GENRE_LABELS,
  JobBadge,
  PipelineCard,
  PromptPanel,
  QUALITY_LABELS,
  SEGMENT_LABELS,
  STORY_LABELS,
  SelectField,
  VOICE_LABELS,
  currency,
} from "./SalesVideoStudioKit"

type ListResponse = SalesDashboardData["videoPipeline"] & { ok?: boolean; error?: string }
type ActionResponse = { ok?: boolean; job?: SalesVideoJob; message?: string; error?: string }
type OrchestrateResponse = { ok?: boolean; job?: SalesVideoJob; steps?: Array<{ step: string; ok: boolean; error?: string }>; error?: string }

const JOB_TYPES = [
  ["sales_video", "営業・診断動画"],
  ["subscription_video", "納品・運用動画"],
] as const

const PLATFORMS = [
  ["youtube_16_9", "YouTube / LP 16:9"],
  ["sales_deck_embed", "営業資料埋め込み 16:9"],
  ["report_page", "診断レポート埋め込み 16:9"],
  ["shorts_9_16", "Shorts / Reels 9:16"],
  ["linkedin_1_1", "LinkedIn 1:1"],
  ["customer_subscription", "月次納品セット"],
] as const

const RENDERERS = [
  ["openmontage", "OpenMontage"],
  ["hyperframes", "HyperFrames"],
  ["comfyui", "ComfyUI API"],
  ["remotion", "Remotion"],
  ["external", "OSSレンダー統合"],
] as const

const OSS_RENDERERS = [
  ["openmontage", "OpenMontage"],
  ["moviepy", "MoviePy"],
  ["editly", "Editly"],
  ["ffcreator", "FFCreator"],
  ["short_video_maker", "Short Video Maker"],
] as const

export function SalesVideoPipelinePanel({ data }: { data: SalesDashboardData }) {
  const [jobs, setJobs] = useState<SalesVideoJob[]>(data.videoPipeline.jobs)
  const [config, setConfig] = useState(data.videoPipeline.config)
  const [company, setCompany] = useState(data.companies[0]?.id ?? "")
  const [jobType, setJobType] = useState<(typeof JOB_TYPES)[number][0]>("sales_video")
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number][0]>("youtube_16_9")
  const [renderer, setRenderer] = useState<(typeof RENDERERS)[number][0]>("openmontage")
  const [ossRenderer, setOssRenderer] = useState<(typeof OSS_RENDERERS)[number][0]>("openmontage")
  const [segment, setSegment] = useState<VideoTargetSegment>("agency_white_label")
  const [angle, setAngle] = useState<VideoOfferAngle>("lost_revenue")
  const [genre, setGenre] = useState<VideoProductionGenre>("executive_diagnostic")
  const [voice, setVoice] = useState<VideoVoiceStyle>("calm_consultant")
  const [avatar, setAvatar] = useState<VideoAvatarStyle>("studio_avatar")
  const [caption, setCaption] = useState<VideoCaptionStyle>("burned_in_bilingual")
  const [story, setStory] = useState<VideoStoryFramework>("problem_agitate_solve")
  const [quality, setQuality] = useState<VideoQualityTier>("professional")
  const [lossInputs, setLossInputs] = useState<Required<VideoLossInputs>>(defaultVideoLossInputs("agency_white_label"))
  const [generateAssets, setGenerateAssets] = useState({ background: true, avatar: true, broll: true, thumbnail: true, video: false })
  const [skipTts, setSkipTts] = useState(false)
  const [skipRender, setSkipRender] = useState(false)
  const [outputUrl, setOutputUrl] = useState("")
  const [narrativePrompt, setNarrativePrompt] = useState("")
  const [visualPrompt, setVisualPrompt] = useState("")
  const [negativePrompt, setNegativePrompt] = useState("low quality, blurry, distorted, watermark, unreadable text")
  const [busy, setBusy] = useState<string | null>(null)

  const selectedCompany = useMemo(() => data.companies.find((row) => row.id === company), [company, data.companies])
  const loss = useMemo(() => buildVideoLossSimulation({ segment, offerAngle: angle, inputs: lossInputs }), [segment, angle, lossInputs])
  const stats = useMemo(() => ({
    active: jobs.filter((job) => ["queued", "routing", "waiting_render", "rendering"].includes(job.status)).length,
    review: jobs.filter((job) => job.status === "review_required").length,
    done: jobs.filter((job) => job.status === "completed").length,
  }), [jobs])

  function updateSegment(next: VideoTargetSegment) {
    setSegment(next)
    setLossInputs(defaultVideoLossInputs(next))
  }

  function updateLoss(key: keyof Required<VideoLossInputs>, value: number) {
    setLossInputs((current) => ({ ...current, [key]: Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0 }))
  }

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
      setJobs(json.jobs)
      setConfig(json.config)
      toast.success("動画スタジオを更新しました")
    } catch (error) {
      console.error("[video-studio] refresh failed:", error)
      toast.error(error instanceof Error ? error.message : "動画スタジオの更新に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  async function createJob(dispatch = false) {
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
          job_type: jobType,
          target_platform: platform,
          render_engine: renderer,
          target_segment: segment,
          offer_angle: angle,
          production_genre: genre,
          voice_style: voice,
          avatar_style: avatar,
          caption_style: caption,
          story_framework: story,
          quality_tier: quality,
          loss_inputs: lossInputs,
          creative_brief: creativeBrief,
          report_locale: data.scope.reportLocale,
          priority: quality === "premium" ? 90 : 70,
        }),
      })
      const json = (await res.json()) as ActionResponse
      if (!res.ok || !json.ok || !json.job) throw new Error(json.error ?? "制作ジョブを作成できませんでした")
      setJobs((rows) => [json.job as SalesVideoJob, ...rows])
      toast.success(dispatch ? "制作ジョブを作成しました。続けて投入します。" : "制作ジョブを作成しました")
      if (dispatch) await runAction(json.job.id, "dispatch")
    } catch (error) {
      console.error("[video-studio] create failed:", error)
      toast.error(error instanceof Error ? error.message : "制作ジョブの作成に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  async function runStudio() {
    if (!company) {
      toast.error("対象企業を選択してください")
      return
    }
    setBusy("studio")
    try {
      const res = await fetch("/api/sales/video-pipeline/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id_or_domain: company,
          job_type: jobType,
          target_platform: platform,
          render_engine: renderer,
          oss_renderer: ossRenderer,
          generate_background: generateAssets.background,
          generate_avatar: generateAssets.avatar,
          generate_broll: generateAssets.broll,
          generate_thumbnail: generateAssets.thumbnail,
          generate_video: generateAssets.video,
          creative_brief: creativeBrief,
          skip_tts: skipTts,
          skip_oss_render: skipRender,
          priority: quality === "premium" ? 95 : 75,
        }),
      })
      const json = (await res.json()) as OrchestrateResponse
      if (!res.ok || !json.ok) throw new Error(json.error ?? "統合スタジオ実行に失敗しました")
      if (json.job) setJobs((rows) => [json.job as SalesVideoJob, ...rows.filter((job) => job.id !== json.job?.id)])
      const failed = json.steps?.filter((step) => !step.ok).length ?? 0
      toast.success(failed > 0 ? `スタジオ実行完了。一部工程 ${failed} 件を確認してください。` : "スタジオ実行が完了しました")
      await refreshJobs()
    } catch (error) {
      console.error("[video-studio] orchestrate failed:", error)
      toast.error(error instanceof Error ? error.message : "統合スタジオ実行に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  async function runAction(jobId: string, action: "dispatch" | "approve_render" | "request_revision" | "complete") {
    setBusy(`${action}:${jobId}`)
    try {
      const res = await fetch(`/api/sales/video-pipeline/jobs/${jobId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, output_url: outputUrl.trim() || null }),
      })
      const json = (await res.json()) as ActionResponse
      if (!res.ok || !json.ok || !json.job) throw new Error(json.error ?? "制作ジョブを更新できませんでした")
      setJobs((rows) => rows.map((job) => (job.id === jobId ? (json.job as SalesVideoJob) : job)))
      toast.success(json.message ?? "制作ジョブを更新しました")
    } catch (error) {
      console.error("[video-studio] action failed:", error)
      toast.error(error instanceof Error ? error.message : "制作ジョブの操作に失敗しました")
    } finally {
      setBusy(null)
    }
  }

  async function renderNow(jobId: string) {
    setBusy(`render:${jobId}`)
    try {
      const res = await fetch("/api/sales/video-pipeline/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, quality: quality === "premium" ? "high" : "draft" }),
      })
      const json = (await res.json()) as { ok?: boolean; error?: string; previewUrl?: string }
      if (!res.ok || !json.ok) throw new Error(json.error ?? "HyperFramesレンダーに失敗しました")
      toast.success("ローカルレンダーが完了しました")
      await refreshJobs()
    } catch (error) {
      console.error("[video-studio] render failed:", error)
      toast.error(error instanceof Error ? error.message : "レンダーに失敗しました")
    } finally {
      setBusy(null)
    }
  }

  async function copyManifest(job: SalesVideoJob) {
    const manifest = {
      job_id: job.id,
      renderer: job.render_engine,
      company: job.sales_companies,
      storyboard: job.storyboard,
      production_plan: job.production_plan,
      asset_manifest: job.asset_manifest,
      r2: { bucket: job.r2_bucket, prefix: job.r2_asset_prefix, output_url: job.r2_output_url },
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(manifest, null, 2))
      toast.success("制作マニフェストをコピーしました")
    } catch (error) {
      console.error("[video-studio] clipboard failed:", error)
      toast.error("クリップボードへコピーできませんでした")
    }
  }

  const engineCards = [
    { name: "OpenMontage", ready: config.renderers.openmontage, note: "複数素材をつなぐ納品動画オーケストレーション。n8nから同一ジョブIDで投入します。", icon: Clapperboard },
    { name: "HyperFrames", ready: config.renderers.hyperframes, note: "HTMLをソースに営業動画を決定論的にレンダーします。軽量な診断動画の第一候補です。", icon: FileVideo },
    { name: "ComfyUI API", ready: config.comfyui.ready, note: config.comfyui.note, icon: WandSparkles },
    { name: "Vast.ai API", ready: config.vast.ready, note: config.vast.note, icon: Gauge },
    { name: "LiveKit", ready: data.toolConnections.some((tool) => tool.slug === "livekit" && ["connected", "ready", "online", "active"].includes(tool.status)), note: "AIヒアリング、音声確認、議事録回収を同じ案件の活動ログへ戻します。", icon: Mic2 },
    { name: "Cloudflare R2", ready: config.r2.ready, note: config.r2.note, icon: UploadCloud },
  ]

  return (
    <div className="grid min-w-0 gap-5 bg-zinc-50 p-5 xl:grid-cols-[minmax(420px,500px)_minmax(0,1fr)]">
      <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                <Clapperboard size={15} aria-hidden /> OSS Video Studio
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">プロ動画スタジオ</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Supabaseの営業レコードを正本に、Difyの構成、ComfyUI素材、Vast GPU、OpenMontage/HyperFramesレンダー、LiveKit面談、R2納品を1つの制作案件として動かします。
              </p>
            </div>
            <button type="button" onClick={() => void refreshJobs()} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200" aria-label="動画スタジオを更新">
              <RefreshCw size={16} className={busy === "refresh" ? "animate-spin" : ""} aria-hidden />
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-5">
          <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
            <span>対象企業</span>
            <select value={company} onChange={(event) => setCompany(event.target.value)} className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900">
              {data.companies.map((row) => <option key={row.id} value={row.id}>{row.companyName} / {row.domain}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            {JOB_TYPES.map(([value, label]) => (
              <button key={value} type="button" onClick={() => setJobType(value)} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${jobType === value ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-700"}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="配信面" value={platform} options={PLATFORMS.map(([value]) => value)} labels={Object.fromEntries(PLATFORMS) as Record<(typeof PLATFORMS)[number][0], string>} onChange={setPlatform} />
            <SelectField label="主レンダー" value={renderer} options={RENDERERS.map(([value]) => value)} labels={Object.fromEntries(RENDERERS) as Record<(typeof RENDERERS)[number][0], string>} onChange={setRenderer} />
            <SelectField label="OSSレンダー" value={ossRenderer} options={OSS_RENDERERS.map(([value]) => value)} labels={Object.fromEntries(OSS_RENDERERS) as Record<(typeof OSS_RENDERERS)[number][0], string>} onChange={setOssRenderer} />
            <SelectField label="品質" value={quality} options={VIDEO_QUALITY_TIERS} labels={QUALITY_LABELS} onChange={setQuality} />
            <SelectField label="セグメント" value={segment} options={VIDEO_TARGET_SEGMENTS} labels={SEGMENT_LABELS} onChange={updateSegment} />
            <SelectField label="訴求軸" value={angle} options={VIDEO_OFFER_ANGLES} labels={ANGLE_LABELS} onChange={setAngle} />
            <SelectField label="ジャンル" value={genre} options={VIDEO_PRODUCTION_GENRES} labels={GENRE_LABELS} onChange={setGenre} />
            <SelectField label="音声" value={voice} options={VIDEO_VOICE_STYLES} labels={VOICE_LABELS} onChange={setVoice} />
            <SelectField label="アバター" value={avatar} options={VIDEO_AVATAR_STYLES} labels={AVATAR_LABELS} onChange={setAvatar} />
            <SelectField label="字幕" value={caption} options={VIDEO_CAPTION_STYLES} labels={CAPTION_LABELS} onChange={setCaption} />
            <SelectField label="ストーリー" value={story} options={VIDEO_STORY_FRAMEWORKS} labels={STORY_LABELS} onChange={setStory} />
          </div>

          <PromptPanel
            narrativePrompt={narrativePrompt}
            visualPrompt={visualPrompt}
            negativePrompt={negativePrompt}
            onNarrativePromptChange={setNarrativePrompt}
            onVisualPromptChange={setVisualPrompt}
            onNegativePromptChange={setNegativePrompt}
          />

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-semibold text-zinc-500">推定機会損失</div>
            <div className="mt-1 text-2xl font-semibold text-zinc-950">{currency.format(loss.annual_loss_usd)} / 年</div>
            <p className="mt-2 text-xs leading-5 text-zinc-600">{loss.customer_safe_summary_ja}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input type="number" value={lossInputs.monthlyRejectedProjects} onChange={(event) => updateLoss("monthlyRejectedProjects", Number(event.target.value))} className="h-9 rounded-lg border border-zinc-300 px-2 text-xs" aria-label="月間失注件数" />
              <input type="number" value={lossInputs.averageProjectValueUsd} onChange={(event) => updateLoss("averageProjectValueUsd", Number(event.target.value))} className="h-9 rounded-lg border border-zinc-300 px-2 text-xs" aria-label="平均案件単価USD" />
            </div>
          </div>

          <div className="grid gap-2 rounded-xl border border-zinc-200 p-4">
            <div className="text-sm font-semibold text-zinc-950">生成する素材</div>
            {([
              ["background", "背景"],
              ["avatar", "アバター"],
              ["broll", "B-roll"],
              ["thumbnail", "サムネイル"],
              ["video", "ComfyUI動画素材"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 text-sm text-zinc-700">
                <span>{label}</span>
                <input type="checkbox" checked={generateAssets[key]} onChange={(event) => setGenerateAssets((current) => ({ ...current, [key]: event.target.checked }))} className="h-4 w-4 accent-zinc-950" />
              </label>
            ))}
            <label className="flex items-center justify-between gap-3 text-sm text-zinc-700">
              <span>TTSをスキップ</span>
              <input type="checkbox" checked={skipTts} onChange={(event) => setSkipTts(event.target.checked)} className="h-4 w-4 accent-zinc-950" />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm text-zinc-700">
              <span>OSSレンダーをスキップ</span>
              <input type="checkbox" checked={skipRender} onChange={(event) => setSkipRender(event.target.checked)} className="h-4 w-4 accent-zinc-950" />
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => void createJob(false)} disabled={busy !== null || !company} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 disabled:opacity-50">
              <Boxes size={16} aria-hidden /> ブリーフ保存
            </button>
            <button type="button" onClick={() => void createJob(true)} disabled={busy !== null || !company} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-semibold text-white disabled:opacity-50">
              <Send size={16} aria-hidden /> n8nへ投入
            </button>
          </div>
          <button type="button" onClick={() => void runStudio()} disabled={busy !== null || !company} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-700 to-zinc-950 px-3 text-sm font-semibold text-white disabled:opacity-50">
            <Rocket size={17} aria-hidden /> OpenMontage統合スタジオを実行
          </button>
        </div>
      </section>

      <section className="grid min-w-0 gap-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4"><div className="text-xs text-zinc-500">進行中</div><div className="mt-1 text-2xl font-semibold">{stats.active}</div></div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4"><div className="text-xs text-zinc-500">承認待ち</div><div className="mt-1 text-2xl font-semibold">{stats.review}</div></div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4"><div className="text-xs text-zinc-500">完了</div><div className="mt-1 text-2xl font-semibold">{stats.done}</div></div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {engineCards.map((card) => <PipelineCard key={card.name} {...card} />)}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950"><Play size={16} aria-hidden /> 制作ジョブ</div>
              <p className="mt-1 text-xs text-zinc-500">台本、素材、GPU、レンダー、R2納品URLを同じジョブIDで追跡します。</p>
            </div>
            <label className="grid gap-1.5 text-xs font-medium text-zinc-600 lg:w-96">
              <span>完成URL / R2納品URL</span>
              <input value={outputUrl} onChange={(event) => setOutputUrl(event.target.value)} placeholder="https://..." className="h-10 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900" />
            </label>
          </div>

          <div className="mt-4 grid gap-3">
            {jobs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-sm text-zinc-500">まだ制作ジョブがありません。左のスタジオでブリーフを保存するか、統合スタジオを実行してください。</div>
            ) : jobs.map((job) => (
              <article key={job.id} className="rounded-xl border border-zinc-200 p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-zinc-950">{job.title}</h3>
                      <JobBadge status={job.status} />
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">{job.render_engine}</span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-600">{job.sales_companies?.company_name ?? selectedCompany?.companyName ?? "対象企業"} / {job.sales_companies?.domain ?? selectedCompany?.domain ?? "-"}</p>
                    <div className="mt-3 grid gap-2 text-xs text-zinc-600 md:grid-cols-2">
                      <div className="rounded-lg bg-zinc-50 p-2">工程: {job.orchestration_stage}</div>
                      <div className="rounded-lg bg-zinc-50 p-2">R2: {job.r2_asset_prefix ?? "未発行"}</div>
                      <div className="rounded-lg bg-zinc-50 p-2">作成: {formatDate(job.created_at)}</div>
                      <div className="rounded-lg bg-zinc-50 p-2">更新: {formatDate(job.updated_at)}</div>
                    </div>
                    {job.error_message ? <p className="mt-2 text-xs font-medium text-rose-600">{job.error_message}</p> : null}
                    {job.preview_url || job.r2_output_url ? (
                      <a href={job.r2_output_url ?? job.preview_url ?? "#"} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-zinc-950 hover:underline">
                        成果物を開く <ExternalLink size={12} aria-hidden />
                      </a>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void copyManifest(job)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-700">
                      <Copy size={14} aria-hidden /> 指示書
                    </button>
                    <button type="button" onClick={() => void runAction(job.id, "dispatch")} disabled={busy === `dispatch:${job.id}` || job.status === "completed"} className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 disabled:opacity-50">
                      <Send size={14} aria-hidden /> n8n
                    </button>
                    <button type="button" onClick={() => void renderNow(job.id)} disabled={busy === `render:${job.id}` || job.status === "completed"} className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 disabled:opacity-50">
                      <FileVideo size={14} aria-hidden /> HyperFrames
                    </button>
                    <button type="button" onClick={() => void runAction(job.id, "approve_render")} disabled={busy === `approve_render:${job.id}` || job.status === "completed"} className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 disabled:opacity-50">
                      <ShieldCheck size={14} aria-hidden /> 承認
                    </button>
                    <button type="button" onClick={() => void runAction(job.id, "complete")} disabled={busy === `complete:${job.id}` || !outputUrl.trim()} className="inline-flex h-9 items-center gap-1 rounded-lg bg-zinc-950 px-3 text-xs font-semibold text-white disabled:opacity-50">
                      <CheckCircle2 size={14} aria-hidden /> 完了
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
