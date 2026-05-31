import { getServiceSalesSupabase } from "@/lib/supabase"
import { findCompanyByDomain, findCompanyById, findCompanyBySlug } from "./companies"
import { fetchDiagnosticReport } from "./diagnostic"
import { normalizeReportLocale } from "./routing"
import { INDUSTRIES, localeToRegion, type Industry } from "./types"
import { buildProfessionalProductionPlan, buildProfessionalStoryboard, buildR2AssetPrefix, buildVideoAssetManifest, normalizeVideoProductionProfile, type VideoAvatarStyle, type VideoCaptionStyle, type VideoProductionGenre, type VideoQualityTier, type VideoStoryFramework, type VideoVoiceStyle } from "./video-production"
import {
  VIDEO_PIPELINE_STAGES,
  buildVideoClaimGuard,
  buildVideoLossSimulation,
  isVideoOfferAngle,
  isVideoTargetSegment,
  type VideoClaimGuard,
  type VideoLossInputs,
  type VideoLossSimulation,
  type VideoOfferAngle,
  type VideoTargetSegment,
} from "./video-strategy"

export { VIDEO_PIPELINE_STAGES }
export type { VideoClaimGuard, VideoLossInputs, VideoLossSimulation, VideoOfferAngle, VideoTargetSegment }
export type { VideoAvatarStyle, VideoCaptionStyle, VideoProductionGenre, VideoQualityTier, VideoStoryFramework, VideoVoiceStyle } from "./video-production"
export type VideoJobType = "sales_video" | "subscription_video"
export type VideoJobStatus =
  | "draft"
  | "queued"
  | "routing"
  | "waiting_render"
  | "rendering"
  | "review_required"
  | "completed"
  | "failed"
  | "cancelled"
export type VideoRenderEngine = "hyperframes" | "remotion" | "openmontage" | "comfyui" | "external"
export type VideoTargetPlatform =
  | "sales_deck_embed"
  | "report_page"
  | "shorts_9_16"
  | "youtube_16_9"
  | "linkedin_1_1"
  | "customer_subscription"

export interface SalesVideoJob {
  id: string
  company_id: string | null
  job_type: VideoJobType
  status: VideoJobStatus
  priority: number
  title: string
  locale: string
  target_platform: VideoTargetPlatform
  render_engine: VideoRenderEngine
  target_segment: VideoTargetSegment
  offer_angle: VideoOfferAngle
  production_genre: VideoProductionGenre
  voice_style: VideoVoiceStyle
  avatar_style: VideoAvatarStyle
  caption_style: VideoCaptionStyle
  story_framework: VideoStoryFramework
  quality_tier: VideoQualityTier
  orchestration_stage: string
  n8n_workflow_url: string | null
  n8n_execution_id: string | null
  vast_instance_id: string | null
  r2_output_url: string | null
  r2_bucket: string | null
  r2_asset_prefix: string | null
  preview_url: string | null
  storyboard: Record<string, unknown>
  production_plan: Record<string, unknown>
  loss_simulation: VideoLossSimulation
  claim_guard: VideoClaimGuard
  asset_manifest: Record<string, unknown>
  delivery_formats: Array<Record<string, unknown>>
  input_assets: Record<string, unknown>
  render_outputs: Record<string, unknown>
  approvals: Record<string, unknown>
  error_message: string | null
  requested_by: string
  created_at: string
  updated_at: string
  sales_companies?: { company_name?: string | null; domain?: string | null; slug?: string | null } | null
}

export interface VideoPipelineConfig {
  n8n: { ready: boolean; url: string | null; note: string }
  dify: { ready: boolean; note: string }
  comfyui: { ready: boolean; url: string | null; note: string }
  vast: { ready: boolean; note: string }
  renderers: { hyperframes: boolean; remotion: boolean; openmontage: boolean }
  r2: { ready: boolean; publicBaseUrl: string | null; note: string }
  slack: { ready: boolean; note: string }
  stages: Array<{ id: string; label: string; owner: string; gate: string }>
}

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

function optionalEnv(name: string): string | null {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function envReady(...names: string[]): boolean {
  return names.some((name) => optionalEnv(name) !== null)
}

function normalizeIndustry(value: string | null | undefined): Industry | null {
  return typeof value === "string" && (INDUSTRIES as readonly string[]).includes(value) ? (value as Industry) : null
}

function pipelineConfig(): VideoPipelineConfig {
  const n8nBaseUrl = optionalEnv("N8N_BASE_URL")
  const n8nUrl =
    optionalEnv("N8N_VIDEO_PIPELINE_WEBHOOK_URL") ??
    (n8nBaseUrl ? `${n8nBaseUrl.replace(/\/+$/, "")}/webhook/sales-video-pipeline` : null)
  const comfyUrl = optionalEnv("COMFYUI_API_URL")
  const r2Base = optionalEnv("CLOUDFLARE_R2_PUBLIC_BASE_URL") ?? optionalEnv("R2_PUBLIC_BASE_URL")

  return {
    n8n: {
      ready: n8nUrl !== null && envReady("N8N_WEBHOOK_SECRET"),
      url: n8nUrl,
      note: n8nUrl ? "n8nへ動画ジョブを投入できます。" : "n8n未設定時はジョブ作成と手動コピーまで行います。",
    },
    dify: {
      ready: envReady(
        "DIFY_API_KEY",
        "DIFY_API_KEY_JA",
        "DIFY_API_KEY_EN",
        "DIFY_VIDEO_WORKFLOW_API_KEY",
        "DIFY_FORM_MESSAGE_KEY",
        "DIFY_KARTE_TO_REPORT_KEY",
        "DIFY_KARTE_TO_SALES_MATERIAL_KEY",
        "DIFY_TEMPLATE_PICKER_KEY",
      ),
      note: "文面、構成、テンプレ判定はDify Cloudを優先します。未検証の断定は禁止です。",
    },
    comfyui: {
      ready: comfyUrl !== null,
      url: comfyUrl,
      note: "営業動画の背景素材と動画サブスク用の生成素材に使います。",
    },
    vast: {
      ready: envReady("VAST_API_KEY"),
      note: "GPU起動は動画サブスクや重いComfyUI生成だけに限定します。",
    },
    renderers: {
      hyperframes: envReady("HYPERFRAMES_RENDERER_URL", "HYPERFRAMES_API_URL"),
      remotion: envReady("REMOTION_RENDER_URL", "REMOTION_RENDERER_URL"),
      openmontage: envReady("OPENMONTAGE_API_URL"),
    },
    r2: {
      ready: r2Base !== null,
      publicBaseUrl: r2Base,
      note: "完成MP4、字幕、サムネイル、素材を配信する置き場です。",
    },
    slack: {
      ready: envReady("SLACK_WEBHOOK_URL") || (envReady("SLACK_BOT_TOKEN") && envReady("SLACK_CHANNEL", "SLACK_CHANNEL_ID")),
      note: "人間承認が必要なジョブを通知します。",
    },
    stages: [...VIDEO_PIPELINE_STAGES],
  }
}

export function getVideoPipelineConfig(): VideoPipelineConfig {
  return pipelineConfig()
}

function safeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

async function resolveCompany(idOrSlugOrDomain: string, reportLocale?: string | null) {
  const requestedLocale = reportLocale ? normalizeReportLocale(reportLocale, "jp") : null
  const requestedRegion = requestedLocale ? localeToRegion(requestedLocale) : "jp"
  if (isUuid(idOrSlugOrDomain)) return findCompanyById(idOrSlugOrDomain)
  if (idOrSlugOrDomain.includes(".")) return findCompanyByDomain(idOrSlugOrDomain)
  return findCompanyBySlug(idOrSlugOrDomain, requestedRegion)
}

export async function listVideoJobs(
  limit = 40,
  filters: { locale?: string | null } = {},
): Promise<{ ok: true; jobs: SalesVideoJob[]; config: VideoPipelineConfig } | { ok: false; error: string; jobs: SalesVideoJob[]; config: VideoPipelineConfig }> {
  const sb = getServiceSalesSupabase()
  const config = pipelineConfig()
  if (!sb) return { ok: false, error: "Supabase is not configured", jobs: [], config }

  let query = sb
    .from("sales_video_jobs")
    .select("*, sales_companies(company_name, domain, slug)")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (filters.locale) query = query.eq("locale", filters.locale)

  const { data, error } = await query

  if (error) {
    console.error("[sales-video-pipeline] list failed:", error.message)
    return { ok: false, error: error.message, jobs: [], config }
  }
  return { ok: true, jobs: (data ?? []) as SalesVideoJob[], config }
}

export async function createVideoJob(input: {
  companyIdOrSlugOrDomain: string
  jobType: VideoJobType
  targetPlatform: VideoTargetPlatform
  renderEngine: VideoRenderEngine
  targetSegment?: VideoTargetSegment
  offerAngle?: VideoOfferAngle
  productionGenre?: VideoProductionGenre
  voiceStyle?: VideoVoiceStyle
  avatarStyle?: VideoAvatarStyle
  captionStyle?: VideoCaptionStyle
  storyFramework?: VideoStoryFramework
  qualityTier?: VideoQualityTier
  lossInputs?: VideoLossInputs
  reportLocale?: string | null
  priority?: number
  requestedBy?: string
}): Promise<{ ok: boolean; job?: SalesVideoJob; config: VideoPipelineConfig; error?: string }> {
  const sb = getServiceSalesSupabase()
  const config = pipelineConfig()
  if (!sb) return { ok: false, config, error: "Supabase is not configured" }

  const requestedLocale = input.reportLocale ? normalizeReportLocale(input.reportLocale, "jp") : null
  const company = await resolveCompany(input.companyIdOrSlugOrDomain, requestedLocale)
  if (!company) return { ok: false, config, error: "company not found" }

  const targetSegment = isVideoTargetSegment(input.targetSegment) ? input.targetSegment : "agency_white_label"
  const offerAngle = isVideoOfferAngle(input.offerAngle) ? input.offerAngle : "lost_revenue"
  const productionProfile = normalizeVideoProductionProfile({
    productionGenre: input.productionGenre,
    voiceStyle: input.voiceStyle,
    avatarStyle: input.avatarStyle,
    captionStyle: input.captionStyle,
    storyFramework: input.storyFramework,
    qualityTier: input.qualityTier,
  })
  const lossSimulation = buildVideoLossSimulation({ segment: targetSegment, offerAngle, inputs: input.lossInputs })
  const claimGuard = buildVideoClaimGuard()
  const report = await fetchDiagnosticReport({
    companyId: company.id,
    reportLocale: requestedLocale ?? company.report_locale ?? undefined,
  })
  const locale = report?.report_locale ?? company.report_locale ?? "ja"
  const reportUrl = report?.report_url ?? company.report_url ?? null
  const previewUrl = reportUrl ? `${reportUrl.replace(/\/$/, "")}/video` : null
  const title = `${company.company_name} ${input.jobType === "subscription_video" ? "動画サブスク納品" : "営業診断動画"}`
  const r2Bucket = optionalEnv("CLOUDFLARE_R2_BUCKET") ?? optionalEnv("R2_BUCKET")
  const r2AssetPrefix = buildR2AssetPrefix({
    locale,
    companySlug: company.slug,
    domain: company.domain,
    jobType: input.jobType,
    productionGenre: productionProfile.productionGenre,
  })
  const assetManifest = buildVideoAssetManifest({
    r2Bucket,
    r2AssetPrefix,
    platform: input.targetPlatform,
    profile: productionProfile,
  })
  const deliveryFormats = Array.isArray(assetManifest.formats)
    ? (assetManifest.formats as Array<Record<string, unknown>>)
    : []
  const storyboard = buildProfessionalStoryboard({
    companyName: company.company_name,
    domain: company.domain,
    locale,
    platform: input.targetPlatform,
    jobType: input.jobType,
    hook: report?.hook ?? `${company.company_name}のWebと営業導線を公開データから診断します。`,
    totalLoss: report?.total_loss ?? "未算出",
    reportUrl,
    demoUrl: report?.demo_url ?? null,
    lossSimulation,
    claimGuard,
    profile: productionProfile,
  })
  const productionPlan = buildProfessionalProductionPlan({
    companyName: company.company_name,
    domain: company.domain,
    locale,
    platform: input.targetPlatform,
    jobType: input.jobType,
    renderEngine: input.renderEngine,
    industry: normalizeIndustry(company.industry),
    lossSimulation,
    claimGuard,
    profile: productionProfile,
    r2Bucket,
    r2AssetPrefix,
    assetManifest,
    readiness: {
      n8n: config.n8n.ready,
      dify: config.dify.ready,
      comfyui: config.comfyui.ready,
      vast: config.vast.ready,
      r2: config.r2.ready,
    },
  })

  const { data, error } = await sb
    .from("sales_video_jobs")
    .insert({
      company_id: company.id,
      job_type: input.jobType,
      status: "draft",
      priority: input.priority ?? 50,
      title,
      locale,
      target_platform: input.targetPlatform,
      render_engine: input.renderEngine,
      target_segment: targetSegment,
      offer_angle: offerAngle,
      production_genre: productionProfile.productionGenre,
      voice_style: productionProfile.voiceStyle,
      avatar_style: productionProfile.avatarStyle,
      caption_style: productionProfile.captionStyle,
      story_framework: productionProfile.storyFramework,
      quality_tier: productionProfile.qualityTier,
      orchestration_stage: "draft",
      n8n_workflow_url: config.n8n.url,
      r2_bucket: r2Bucket,
      r2_asset_prefix: r2AssetPrefix,
      preview_url: previewUrl,
      storyboard,
      production_plan: productionPlan,
      loss_simulation: lossSimulation,
      claim_guard: claimGuard,
      asset_manifest: assetManifest,
      delivery_formats: deliveryFormats,
      input_assets: {
        company_domain: company.domain,
        report_url: reportUrl,
        demo_url: report?.demo_url ?? null,
        source_coverage: report?.source_coverage ?? null,
        r2_asset_prefix: r2AssetPrefix,
      },
      requested_by: input.requestedBy ?? "sales-os",
    })
    .select("*, sales_companies(company_name, domain, slug)")
    .single()

  if (error) {
    console.error("[sales-video-pipeline] create failed:", error.message)
    return { ok: false, config, error: error.message }
  }
  return { ok: true, job: data as SalesVideoJob, config }
}

async function updateJob(jobId: string, patch: Record<string, unknown>) {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase is not configured")
  const { data, error } = await sb
    .from("sales_video_jobs")
    .update(patch)
    .eq("id", jobId)
    .select("*, sales_companies(company_name, domain, slug)")
    .single()
  if (error) throw new Error(error.message)
  return data as SalesVideoJob
}

async function fetchJob(jobId: string): Promise<SalesVideoJob> {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase is not configured")
  const { data, error } = await sb
    .from("sales_video_jobs")
    .select("*, sales_companies(company_name, domain, slug)")
    .eq("id", jobId)
    .single()
  if (error) throw new Error(error.message)
  return data as SalesVideoJob
}

async function dispatchToN8n(job: SalesVideoJob): Promise<{ executionId: string | null; manual: boolean; message: string }> {
  const webhookUrl = optionalEnv("N8N_VIDEO_PIPELINE_WEBHOOK_URL")
  if (!webhookUrl) {
    return { executionId: null, manual: true, message: "N8N_VIDEO_PIPELINE_WEBHOOK_URL is not configured" }
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const secret = optionalEnv("N8N_WEBHOOK_SECRET")
  if (secret) headers["X-Webhook-Secret"] = secret

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      job_id: job.id,
      job_type: job.job_type,
      company_id: job.company_id,
      title: job.title,
      locale: job.locale,
      target_platform: job.target_platform,
      render_engine: job.render_engine,
      target_segment: job.target_segment,
      offer_angle: job.offer_angle,
      production_profile: {
        genre: job.production_genre,
        voice: job.voice_style,
        avatar: job.avatar_style,
        captions: job.caption_style,
        story: job.story_framework,
        quality: job.quality_tier,
      },
      r2: {
        bucket: job.r2_bucket,
        prefix: job.r2_asset_prefix,
        public_url: job.r2_output_url,
        asset_manifest: job.asset_manifest,
        upload_endpoint: `${(optionalEnv("PARADIGMJP_BASE_URL") ?? optionalEnv("NEXT_PUBLIC_SITE_URL") ?? "https://paradigmjp.com").replace(/\/+$/, "")}/api/sales/video-pipeline/jobs/${job.id}/assets`,
      },
      delivery_formats: job.delivery_formats,
      storyboard: job.storyboard,
      production_plan: job.production_plan,
      loss_simulation: job.loss_simulation,
      claim_guard: job.claim_guard,
      input_assets: job.input_assets,
    }),
  })

  const text = await res.text()
  let parsed: Record<string, unknown> = {}
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch (error) {
    console.warn("[sales-video-pipeline] n8n returned non-json:", error)
  }
  if (!res.ok) throw new Error(`n8n dispatch failed: HTTP ${res.status} ${text.slice(0, 240)}`)
  const executionId =
    typeof parsed.executionId === "string"
      ? parsed.executionId
      : typeof parsed.execution_id === "string"
        ? parsed.execution_id
        : null
  return { executionId, manual: false, message: "dispatched" }
}

export async function runVideoJobAction(input: {
  jobId: string
  action: "dispatch" | "approve_render" | "request_revision" | "complete" | "fail" | "cancel"
  outputUrl?: string | null
  note?: string | null
}): Promise<{ ok: boolean; job?: SalesVideoJob; config: VideoPipelineConfig; message?: string; error?: string }> {
  const config = pipelineConfig()
  try {
    const job = await fetchJob(input.jobId)
    if (input.action === "dispatch") {
      await updateJob(job.id, { status: "routing", orchestration_stage: "n8n_dispatching", error_message: null })
      const dispatched = await dispatchToN8n(job)
      const nextStatus: VideoJobStatus = dispatched.manual ? "review_required" : "waiting_render"
      const updated = await updateJob(job.id, {
        status: nextStatus,
        orchestration_stage: dispatched.manual ? "manual_dispatch_required" : "n8n_dispatched",
        n8n_execution_id: dispatched.executionId,
        error_message: dispatched.manual ? dispatched.message : null,
      })
      return { ok: true, job: updated, config, message: dispatched.message }
    }
    if (input.action === "approve_render") {
      const approvals = { ...safeRecord(job.approvals), render_approved_at: new Date().toISOString(), note: input.note ?? null }
      const updated = await updateJob(job.id, { status: "rendering", orchestration_stage: "render_approved", approvals })
      return { ok: true, job: updated, config, message: "render approved" }
    }
    if (input.action === "request_revision") {
      const approvals = { ...safeRecord(job.approvals), revision_requested_at: new Date().toISOString(), note: input.note ?? null }
      const updated = await updateJob(job.id, { status: "review_required", orchestration_stage: "revision_requested", approvals })
      return { ok: true, job: updated, config, message: "revision requested" }
    }
    if (input.action === "complete") {
      const outputUrl = input.outputUrl?.trim() ? input.outputUrl.trim() : job.r2_output_url
      const renderOutputs = { ...safeRecord(job.render_outputs), completed_at: new Date().toISOString(), output_url: outputUrl, note: input.note ?? null }
      const updated = await updateJob(job.id, { status: "completed", orchestration_stage: "delivered", r2_output_url: outputUrl, render_outputs: renderOutputs, error_message: null })
      return { ok: true, job: updated, config, message: "completed" }
    }
    if (input.action === "cancel") {
      const updated = await updateJob(job.id, { status: "cancelled", orchestration_stage: "cancelled", error_message: input.note ?? null })
      return { ok: true, job: updated, config, message: "cancelled" }
    }
    const updated = await updateJob(job.id, { status: "failed", orchestration_stage: "failed", error_message: input.note ?? "failed manually" })
    return { ok: true, job: updated, config, message: "failed" }
  } catch (error) {
    console.error("[sales-video-pipeline] action failed:", error)
    return { ok: false, config, error: error instanceof Error ? error.message : "Unknown video pipeline error" }
  }
}
