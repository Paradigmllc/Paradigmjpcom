import { getTriggerVideoPipelineConfig } from "./video-trigger"
import { getComfyuiClientConfig } from "./comfyui-client"
import { getDifyCloudRuntimeConfig } from "./dify-cloud"
import { getR2StorageConfig } from "./r2-storage"
import { INDUSTRIES, type Industry } from "./types"
import {
  type VideoAvatarStyle,
  type VideoCaptionStyle,
  type VideoProductionGenre,
  type VideoQualityTier,
  type VideoStoryFramework,
  type VideoVoiceStyle,
} from "./video-production"
import {
  VIDEO_PIPELINE_STAGES,
  type VideoClaimGuard,
  type VideoLossInputs,
  type VideoLossSimulation,
  type VideoOfferAngle,
  type VideoTargetSegment,
} from "./video-strategy"

export { VIDEO_PIPELINE_STAGES }
export type { VideoAvatarStyle, VideoCaptionStyle, VideoProductionGenre, VideoQualityTier, VideoStoryFramework, VideoVoiceStyle } from "./video-production"
export type { VideoClaimGuard, VideoLossInputs, VideoLossSimulation, VideoOfferAngle, VideoTargetSegment }

export type VideoJobType = "sales_video" | "subscription_video"
export type VideoJobStatus = "draft" | "queued" | "routing" | "waiting_render" | "rendering" | "review_required" | "completed" | "failed" | "cancelled"
export type VideoRenderEngine = "hyperframes" | "remotion" | "openmontage" | "comfyui" | "external"
export type VideoTargetPlatform = "sales_deck_embed" | "report_page" | "shorts_9_16" | "youtube_16_9" | "linkedin_1_1" | "customer_subscription"

export interface SalesVideoJob {
  id: string
  pipeline_run_id: string | null
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
  trigger_endpoint: string | null
  trigger_run_id: string | null
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
  orchestrator: {
    provider: "trigger.dev"
    ready: boolean
    taskId: string | null
    apiUrl: string
    dashboardUrl: string | null
    note: string
  }
  dify: {
    ready: boolean
    provider: "dify_cloud"
    baseUrl: string
    workflowUrl: string
    configuredGroups: string[]
    missingGroups: string[]
    note: string
  }
  comfyui: { ready: boolean; url: string | null; note: string }
  vast: { ready: boolean; note: string }
  renderers: { hyperframes: boolean; remotion: boolean; openmontage: boolean }
  r2: { ready: boolean; publicBaseUrl: string | null; note: string }
  slack: { ready: boolean; note: string }
  stages: Array<{ id: string; label: string; owner: string; gate: string }>
}

export const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

export function optionalEnv(name: string): string | null {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export function envReady(...names: string[]): boolean {
  return names.some((name) => optionalEnv(name) !== null)
}

export function normalizeIndustry(value: string | null | undefined): Industry | null {
  return typeof value === "string" && (INDUSTRIES as readonly string[]).includes(value) ? (value as Industry) : null
}

function pipelineConfig(): VideoPipelineConfig {
  const trigger = getTriggerVideoPipelineConfig()
  const comfyConfig = getComfyuiClientConfig()
  const r2Config = getR2StorageConfig()
  const dify = getDifyCloudRuntimeConfig([
    "diagnosis",
    "formMessage",
    "templatePicker",
    "video",
    "karteToReport",
    "karteToSalesMaterial",
  ])
  const triggerReady = trigger.taskId !== null && trigger.secretKey !== null

  return {
    orchestrator: {
      provider: "trigger.dev",
      ready: triggerReady,
      taskId: trigger.taskId,
      apiUrl: trigger.apiUrl,
      dashboardUrl: trigger.dashboardUrl,
      note: triggerReady
        ? "Trigger.devで動画ジョブをキュー投入できます。"
        : "Trigger.devのSecret Keyまたは動画タスクIDが未設定です。ブリーフ保存と手動確認までは利用できます。",
    },
    dify: {
      ready: dify.ready,
      provider: dify.provider,
      baseUrl: dify.baseUrl,
      workflowUrl: dify.workflowUrl,
      configuredGroups: dify.configuredGroups,
      missingGroups: dify.missingGroups,
      note: "Dify Cloudで文面、構成、テンプレート判定を行います。未検証の法務・罰金・市場統計・CAGR断定は禁止します。",
    },
    comfyui: {
      ready: comfyConfig.ready,
      url: comfyConfig.baseUrl,
      note: "プロ級動画の背景素材、B-roll、サムネイル、動画素材生成に使います。",
    },
    vast: {
      ready: envReady("VAST_API_KEY"),
      note: "GPU起動は動画サブスクや重いComfyUI生成だけに限定します。",
    },
    renderers: {
      hyperframes: envReady("HYPERFRAMES_API_KEY") && envReady("HYPERFRAMES_RENDERER_URL", "HYPERFRAMES_API_URL"),
      remotion: envReady("REMOTION_RENDER_URL", "REMOTION_RENDERER_URL"),
      openmontage: envReady("OPENMONTAGE_API_URL") && envReady("OPENMONTAGE_API_KEY") && envReady("NEXT_PUBLIC_OPENMONTAGE_STUDIO_URL"),
    },
    r2: {
      ready: r2Config.ready && r2Config.publicBaseUrl !== null,
      publicBaseUrl: r2Config.publicBaseUrl,
      note: "完成MP4、字幕、サムネイル、素材、メタデータを保存する置き場です。",
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
