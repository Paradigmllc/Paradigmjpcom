import { getServiceSalesSupabase } from "@/lib/supabase"
import { findCompanyByDomain, findCompanyById, findCompanyBySlug } from "./companies"
import { fetchDiagnosticReport } from "./diagnostic"
import { normalizeReportLocale } from "./routing"
import { localeToRegion } from "./types"
import { dispatchVideoJobToTriggerDev, getTriggerVideoPipelineConfig } from "./video-trigger"
import { DB_TABLES } from "@/lib/sales/db-tables"
import {
  buildProfessionalProductionPlan,
  buildProfessionalStoryboard,
  buildR2AssetPrefix,
  buildVideoAssetManifest,
  normalizeVideoProductionProfile,
  type VideoAvatarStyle,
  type VideoCaptionStyle,
  type VideoProductionGenre,
  type VideoQualityTier,
  type VideoStoryFramework,
  type VideoVoiceStyle,
} from "./video-production"
import {
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
import {
  getVideoPipelineConfig,
  isUuid,
  normalizeIndustry,
  optionalEnv,
  type SalesVideoJob,
  type VideoJobStatus,
  type VideoJobType,
  type VideoPipelineConfig,
  type VideoRenderEngine,
  type VideoTargetPlatform,
} from "./video-pipeline-types"

export { getVideoPipelineConfig, VIDEO_PIPELINE_STAGES } from "./video-pipeline-types"
export type {
  SalesVideoJob,
  VideoJobType,
  VideoJobStatus,
  VideoRenderEngine,
  VideoTargetPlatform,
  VideoPipelineConfig,
} from "./video-pipeline-types"
export type {
  VideoAvatarStyle,
  VideoCaptionStyle,
  VideoProductionGenre,
  VideoQualityTier,
  VideoStoryFramework,
  VideoVoiceStyle,
} from "./video-production"
export type {
  VideoClaimGuard,
  VideoLossInputs,
  VideoLossSimulation,
  VideoOfferAngle,
  VideoTargetSegment,
} from "./video-strategy"

function safeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function sanitizeVideoJobForOutput(job: SalesVideoJob): SalesVideoJob {
  const legacyN8nError = ["N8N_VIDEO_PIPELINE", "WEBHOOK_URL"].join("_")
  if (!job.error_message?.includes(legacyN8nError)) return job
  return {
    ...job,
    error_message: "旧ワークフロー時代の投入エラーです。必要な場合はTrigger.devへ再投入してください。",
  }
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
  const config = getVideoPipelineConfig()
  if (!sb) return { ok: false, error: "Supabase is not configured", jobs: [], config }

  let query = sb
    .from(DB_TABLES.SALES_VIDEO_JOBS)
    .select("*, sales_companies(company_name, domain, slug)")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (filters.locale) query = query.eq("locale", filters.locale)

  const { data, error } = await query
  if (error) {
    console.error("[sales-video-pipeline] list failed:", error.message)
    return { ok: false, error: error.message, jobs: [], config }
  }
  const jobs = ((data ?? []) as SalesVideoJob[]).map(sanitizeVideoJobForOutput)
  return { ok: true, jobs, config }
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
  pipelineRunId?: string | null
  priority?: number
  requestedBy?: string
  creativeBrief?: { narrativePrompt?: string | null; visualPrompt?: string | null; negativePrompt?: string | null }
}): Promise<{ ok: boolean; job?: SalesVideoJob; config: VideoPipelineConfig; error?: string }> {
  const sb = getServiceSalesSupabase()
  const config = getVideoPipelineConfig()
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
  const deliveryFormats = Array.isArray(assetManifest.formats) ? (assetManifest.formats as Array<Record<string, unknown>>) : []
  const storyboard = buildProfessionalStoryboard({
    companyName: company.company_name,
    domain: company.domain,
    locale,
    platform: input.targetPlatform,
    jobType: input.jobType,
    hook: report?.hook ?? `${company.company_name}のWebと営業導線を公開データから診断します。`,
    totalLoss: report?.total_loss ?? "未計算",
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
      orchestrator: config.orchestrator.ready,
      dify: config.dify.ready,
      comfyui: config.comfyui.ready,
      vast: config.vast.ready,
      r2: config.r2.ready,
    },
  })
  const trigger = getTriggerVideoPipelineConfig()
  const { data, error } = await sb
    .from(DB_TABLES.SALES_VIDEO_JOBS)
    .insert({
      company_id: company.id,
      pipeline_run_id: input.pipelineRunId ?? null,
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
      trigger_endpoint: trigger.endpoint,
      n8n_workflow_url: trigger.endpoint,
      r2_bucket: r2Bucket,
      r2_asset_prefix: r2AssetPrefix,
      preview_url: previewUrl,
      storyboard,
      production_plan: {
        ...productionPlan,
        creative_brief: input.creativeBrief ?? null,
        orchestrator: { provider: config.orchestrator.provider, task_id: config.orchestrator.taskId, api_url: config.orchestrator.apiUrl },
        dify: {
          provider: config.dify.provider,
          base_url: config.dify.baseUrl,
          workflow_url: config.dify.workflowUrl,
          configured_groups: config.dify.configuredGroups,
          missing_groups: config.dify.missingGroups,
          secret_values_in_payload: false,
        },
      },
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
        creative_brief: input.creativeBrief ?? null,
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
  if (!sb) {
    console.error("[video-pipeline] updateJob: Supabase is not configured")
    throw new Error("Supabase is not configured")
  }
  const { data, error } = await sb
    .from(DB_TABLES.SALES_VIDEO_JOBS)
    .update(patch)
    .eq("id", jobId)
    .select("*, sales_companies(company_name, domain, slug)")
    .single()
  if (error) {
    console.error("[video-pipeline] updateJob query failed:", error.message)
    throw new Error(error.message)
  }
  return data as SalesVideoJob
}

async function fetchJob(jobId: string): Promise<SalesVideoJob> {
  const sb = getServiceSalesSupabase()
  if (!sb) {
    console.error("[video-pipeline] fetchJob: Supabase is not configured")
    throw new Error("Supabase is not configured")
  }
  const { data, error } = await sb
    .from(DB_TABLES.SALES_VIDEO_JOBS)
    .select("*, sales_companies(company_name, domain, slug)")
    .eq("id", jobId)
    .single()
  if (error) {
    console.error("[video-pipeline] fetchJob query failed:", error.message)
    throw new Error(error.message)
  }
  return data as SalesVideoJob
}

async function updateLinkedPipelineVideoStep(job: SalesVideoJob, status: VideoJobStatus): Promise<void> {
  if (!job.pipeline_run_id) return
  const sb = getServiceSalesSupabase()
  if (!sb) return
  const now = new Date().toISOString()
  const stepStatus =
    status === "completed"
      ? "completed"
      : status === "failed" || status === "cancelled"
        ? "failed"
        : status === "review_required"
          ? "needs_review"
          : "waiting_external"

  const step = await sb
    .from(DB_TABLES.SALES_PIPELINE_STEPS)
    .update({
      status: stepStatus,
      completed_at: ["completed", "failed", "needs_review"].includes(stepStatus) ? now : null,
      error_message: status === "failed" || status === "cancelled" ? job.error_message : null,
      output_payload: {
        video_job_id: job.id,
        video_status: status,
        r2_output_url: job.r2_output_url,
        orchestration_stage: job.orchestration_stage,
      },
    })
    .eq("run_id", job.pipeline_run_id)
    .eq("step_key", "video_generate")
  if (step.error) console.error("[sales-video-pipeline] linked pipeline step update failed:", step.error.message)

  const runStatus = stepStatus === "failed" ? "failed" : stepStatus === "needs_review" ? "needs_review" : stepStatus === "completed" ? "running" : "waiting_external"
  const run = await sb
    .from(DB_TABLES.SALES_PIPELINE_RUNS)
    .update({
      status: runStatus,
      current_step: stepStatus === "completed" ? "r2_manifest" : "video_generate",
      error_message: stepStatus === "failed" ? job.error_message : null,
    })
    .eq("id", job.pipeline_run_id)
  if (run.error) console.error("[sales-video-pipeline] linked pipeline run update failed:", run.error.message)
}

export async function runVideoJobAction(input: {
  jobId: string
  action: "dispatch" | "approve_render" | "request_revision" | "complete" | "fail" | "cancel"
  outputUrl?: string | null
  note?: string | null
}): Promise<{ ok: boolean; job?: SalesVideoJob; config: VideoPipelineConfig; message?: string; error?: string }> {
  const config = getVideoPipelineConfig()
  try {
    const job = await fetchJob(input.jobId)
    if (input.action === "dispatch") {
      await updateJob(job.id, { status: "routing", orchestration_stage: "trigger_dev_dispatching", error_message: null })
      const dispatched = await dispatchVideoJobToTriggerDev(job)
      const updated = await updateJob(job.id, {
        status: dispatched.manual ? "review_required" : "waiting_render",
        orchestration_stage: dispatched.manual ? "trigger_dev_manual_required" : "trigger_dev_dispatched",
        trigger_run_id: dispatched.executionId,
        n8n_execution_id: dispatched.executionId,
        error_message: dispatched.manual ? dispatched.message : null,
      })
      await updateLinkedPipelineVideoStep(updated, updated.status)
      return { ok: true, job: updated, config, message: dispatched.message }
    }
    if (input.action === "approve_render") {
      const approvals = { ...safeRecord(job.approvals), render_approved_at: new Date().toISOString(), note: input.note ?? null }
      const updated = await updateJob(job.id, { status: "rendering", orchestration_stage: "render_approved", approvals })
      await updateLinkedPipelineVideoStep(updated, updated.status)
      return { ok: true, job: updated, config, message: "render approved" }
    }
    if (input.action === "request_revision") {
      const approvals = { ...safeRecord(job.approvals), revision_requested_at: new Date().toISOString(), note: input.note ?? null }
      const updated = await updateJob(job.id, { status: "review_required", orchestration_stage: "revision_requested", approvals })
      await updateLinkedPipelineVideoStep(updated, updated.status)
      return { ok: true, job: updated, config, message: "revision requested" }
    }
    if (input.action === "complete") {
      const outputUrl = input.outputUrl?.trim() ? input.outputUrl.trim() : job.r2_output_url
      const renderOutputs = { ...safeRecord(job.render_outputs), completed_at: new Date().toISOString(), output_url: outputUrl, note: input.note ?? null }
      const updated = await updateJob(job.id, { status: "completed", orchestration_stage: "delivered", r2_output_url: outputUrl, render_outputs: renderOutputs, error_message: null })
      await updateLinkedPipelineVideoStep(updated, updated.status)
      return { ok: true, job: updated, config, message: "completed" }
    }
    if (input.action === "cancel") {
      const updated = await updateJob(job.id, { status: "cancelled", orchestration_stage: "cancelled", error_message: input.note ?? null })
      await updateLinkedPipelineVideoStep(updated, updated.status)
      return { ok: true, job: updated, config, message: "cancelled" }
    }
    const updated = await updateJob(job.id, { status: "failed", orchestration_stage: "failed", error_message: input.note ?? "failed manually" })
    await updateLinkedPipelineVideoStep(updated, updated.status)
    return { ok: true, job: updated, config, message: "failed" }
  } catch (error) {
    console.error("[sales-video-pipeline] action failed:", error)
    return { ok: false, config, error: error instanceof Error ? error.message : "Unknown video pipeline error" }
  }
}
