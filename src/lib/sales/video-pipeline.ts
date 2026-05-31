import { getServiceSalesSupabase } from "@/lib/supabase"
import { findCompanyByDomain, findCompanyById, findCompanyBySlug } from "./companies"
import { fetchDiagnosticReport } from "./diagnostic"
import { labelForIndustry, themeForIndustry } from "./render-quality"
import { normalizeReportLocale } from "./routing"
import { INDUSTRIES, localeToRegion, type Industry } from "./types"
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
  orchestration_stage: string
  n8n_workflow_url: string | null
  n8n_execution_id: string | null
  vast_instance_id: string | null
  r2_output_url: string | null
  preview_url: string | null
  storyboard: Record<string, unknown>
  production_plan: Record<string, unknown>
  loss_simulation: VideoLossSimulation
  claim_guard: VideoClaimGuard
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

function platformSpec(platform: VideoTargetPlatform): { ratio: string; durationSec: number; useCase: string } {
  if (platform === "shorts_9_16") return { ratio: "9:16", durationSec: 35, useCase: "SNSショート" }
  if (platform === "youtube_16_9") return { ratio: "16:9", durationSec: 90, useCase: "YouTube / LP埋め込み" }
  if (platform === "linkedin_1_1") return { ratio: "1:1", durationSec: 45, useCase: "LinkedIn / 提案投稿" }
  if (platform === "customer_subscription") return { ratio: "9:16 + 16:9", durationSec: 45, useCase: "動画サブスク納品" }
  return { ratio: "16:9", durationSec: 60, useCase: platform === "report_page" ? "診断レポート埋め込み" : "営業資料埋め込み" }
}

function buildStoryboard(input: {
  companyName: string
  domain: string
  locale: string
  platform: VideoTargetPlatform
  jobType: VideoJobType
  hook: string
  totalLoss: string
  reportUrl: string | null
  demoUrl: string | null
  lossSimulation: VideoLossSimulation
  claimGuard: VideoClaimGuard
}): Record<string, unknown> {
  const spec = platformSpec(input.platform)
  const isJa = input.locale === "ja"
  return {
    format: spec,
    narrative: isJa
      ? "公開データと推定値を分けて、危機感と次の一手を短く見せる営業動画。"
      : "Evidence-first sales video that separates verified evidence from estimates.",
    claim_guard: input.claimGuard,
    loss_summary: input.lossSimulation,
    scenes: [
      { id: "hook", seconds: 7, text: input.hook, visual: "現サイト、商品、広告、競合比較のファーストビュー" },
      { id: "evidence", seconds: 12, text: input.totalLoss, visual: "PageSpeed、技術スタック、フォーム導線、口コミなどの根拠カード" },
      { id: "loss", seconds: 10, text: input.lossSimulation.customer_safe_summary_ja, visual: "損失シミュレータの年間推定値" },
      { id: "demo", seconds: 16, text: input.demoUrl ? "改善後のデモを提示" : "改善後イメージを提示", visual: "Astroデモまたはワイヤーフレーム" },
      { id: "offer", seconds: 14, text: input.jobType === "subscription_video" ? "継続動画納品ラインを提示" : "Web/DX提案への接続", visual: "提案スコープと納品物" },
      { id: "cta", seconds: 8, text: input.reportUrl ?? input.domain, visual: "レポートURL、予約CTA、担当者導線" },
    ],
  }
}

function buildProductionPlan(input: {
  companyName: string
  domain: string
  locale: string
  platform: VideoTargetPlatform
  jobType: VideoJobType
  renderEngine: VideoRenderEngine
  industry: string | null
  lossSimulation: VideoLossSimulation
  claimGuard: VideoClaimGuard
}): Record<string, unknown> {
  const industry = normalizeIndustry(input.industry)
  const theme = themeForIndustry(industry)
  const industryLabel = labelForIndustry(industry, input.locale)
  const config = pipelineConfig()
  return {
    version: "video-pipeline-v2-segment-loss-guard",
    architecture: "n8n coordinates; renderers render",
    job_intent: input.jobType === "subscription_video" ? "recurring_delivery" : "sales_enablement",
    company: { name: input.companyName, domain: input.domain, industry: industryLabel },
    renderer: {
      preferred: input.renderEngine,
      sales_video_default: "HyperFrames or Remotion",
      subscription_default: "OpenMontage + ComfyUI + Vast.ai + R2",
    },
    n8n_steps: [
      "Load company karte from Supabase",
      "Ask Dify Cloud to select the segment template and generate narration",
      "Reject unverified legal, penalty, market, CAGR, and benchmark claims unless primary_source_url exists",
      "Create ComfyUI prompts only when visual assets are needed",
      "Start Vast.ai GPU only for subscription or heavy ComfyUI jobs",
      "Send render payload to HyperFrames, Remotion, or OpenMontage",
      "Upload MP4, SRT, thumbnail, and assets to R2",
      "Post Slack review card and write status back to Supabase",
      "Update Twenty company HOME fields after approval",
    ],
    guardrails: {
      first_customer_delivery_requires_human_review: true,
      no_live_gpu_without_cost_context: true,
      no_unverified_claims: true,
      skip_renderer_if_required_api_missing: true,
      claim_guard: input.claimGuard,
    },
    loss_simulation: input.lossSimulation,
    theme: {
      accent: theme.accent,
      accentDark: theme.accentDark,
      paper: theme.paper,
    },
    readiness: {
      n8n: config.n8n.ready,
      dify: config.dify.ready,
      comfyui: config.comfyui.ready,
      vast: config.vast.ready,
      r2: config.r2.ready,
    },
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
  const storyboard = buildStoryboard({
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
  })
  const productionPlan = buildProductionPlan({
    companyName: company.company_name,
    domain: company.domain,
    locale,
    platform: input.targetPlatform,
    jobType: input.jobType,
    renderEngine: input.renderEngine,
    industry: company.industry,
    lossSimulation,
    claimGuard,
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
      orchestration_stage: "draft",
      n8n_workflow_url: config.n8n.url,
      preview_url: previewUrl,
      storyboard,
      production_plan: productionPlan,
      loss_simulation: lossSimulation,
      claim_guard: claimGuard,
      input_assets: {
        company_domain: company.domain,
        report_url: reportUrl,
        demo_url: report?.demo_url ?? null,
        source_coverage: report?.source_coverage ?? null,
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
