import { getDifyCloudRuntimeConfig } from "./dify-cloud"
import type { SalesVideoJob } from "./video-pipeline"

function optionalEnv(name: string): string | null {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export function getTriggerVideoPipelineConfig() {
  const taskId = optionalEnv("TRIGGER_VIDEO_PIPELINE_TASK_ID") ?? optionalEnv("TRIGGER_DEV_VIDEO_PIPELINE_TASK_ID") ?? optionalEnv("TRIGGER_VIDEO_TASK_ID") ?? "sales-video-pipeline"
  const secretKey = optionalEnv("TRIGGER_SECRET_KEY") ?? optionalEnv("TRIGGER_ACCESS_TOKEN") ?? optionalEnv("TRIGGER_DEV_API_KEY")
  const apiUrl = (optionalEnv("TRIGGER_API_URL") ?? "https://api.trigger.dev").replace(/\/+$/, "")
  const dashboardUrl = optionalEnv("TRIGGER_DASHBOARD_URL") ?? optionalEnv("NEXT_PUBLIC_TRIGGER_DASHBOARD_URL")
  const endpoint = taskId ? `${apiUrl}/api/v1/tasks/${encodeURIComponent(taskId)}/trigger` : null
  return { taskId, secretKey, apiUrl, dashboardUrl, endpoint }
}

function buildTriggerPayload(job: SalesVideoJob) {
  const dify = getDifyCloudRuntimeConfig(["video", "templatePicker", "karteToReport", "karteToSalesMaterial"])
  return {
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
    dify: {
      provider: dify.provider,
      base_url: dify.baseUrl,
      workflow_url: dify.workflowUrl,
      configured_groups: dify.configuredGroups,
      missing_groups: dify.missingGroups,
      secret_values_in_payload: dify.secretValuesInPayload,
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
  }
}

export async function dispatchVideoJobToTriggerDev(job: SalesVideoJob): Promise<{ executionId: string | null; manual: boolean; message: string }> {
  const trigger = getTriggerVideoPipelineConfig()
  if (!trigger.endpoint || !trigger.secretKey) {
    return { executionId: null, manual: true, message: "Trigger.dev video pipeline task is not configured" }
  }

  const res = await fetch(trigger.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${trigger.secretKey}` },
    body: JSON.stringify({
      payload: buildTriggerPayload(job),
      context: { source: "revenue-os", jobId: job.id },
      options: {
        idempotencyKey: `sales-video-${job.id}`,
        concurrencyKey: `company-${job.company_id ?? job.id}`,
        queue: { name: "sales-video-pipeline", concurrencyLimit: 2 },
      },
    }),
  })

  const text = await res.text()
  let parsed: Record<string, unknown> = {}
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch (error) {
    console.warn("[sales-video-pipeline] Trigger.dev returned non-json:", error)
  }
  if (!res.ok) throw new Error(`Trigger.dev dispatch failed: HTTP ${res.status} ${text.slice(0, 240)}`)

  const executionId =
    typeof parsed.id === "string"
      ? parsed.id
      : typeof parsed.runId === "string"
        ? parsed.runId
        : typeof parsed.run_id === "string"
          ? parsed.run_id
          : null
  return { executionId, manual: false, message: "Trigger.dev dispatch queued" }
}
