/**
 * lib/sales/sales-pipeline-types.ts
 *
 * sales-pipeline.ts から分離 (C-2 対応)。
 * パイプラインのステータスやマニフェスト、ダッシュボード用の型を定義。
 */

import type { ContentAssetType } from "./content-templates"

export type JsonRecord = Record<string, unknown>

export type SalesPipelineSource = "sales_os" | "twenty" | "twenty_csv_intake" | "csv" | "manual" | "webhook" | "batch" | "event_driven"
export type SalesPipelineStatus = "queued" | "running" | "waiting_external" | "needs_review" | "completed" | "failed" | "cancelled"
export type SalesPipelineStepStatus = SalesPipelineStatus | "skipped"

export type SalesPipelineStepKey =
  | "twenty_csv_intake"
  | "supabase_normalize"
  | "data_collection"
  | "karte_generate"
  | "report_generate"
  | "video_generate"
  | "r2_manifest"
  | "external_studio_sync"
  | "twenty_writeback"
  | "outreach_preflight"
  | "outreach_send"
  | "reply_capture"
  | "follow_up_queue"

export interface SalesPipelineStepDefinition {
  key: SalesPipelineStepKey
  label: string
  ownerTool: string
  required: boolean
}

export interface SalesPipelineRun {
  id: string
  company_id: string
  source: SalesPipelineSource
  status: SalesPipelineStatus
  current_step: SalesPipelineStepKey | null
  trigger_provider: "openclaw" | "local" | "manual"
  trigger_task_id: string | null
  trigger_run_id: string | null
  requested_by: string
  require_video: boolean
  auto_sync_external_studios: boolean
  input_payload: JsonRecord
  result_payload: JsonRecord
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  sales_companies?: { company_name?: string | null; domain?: string | null } | null
  steps?: SalesPipelineStep[]
}

export interface SalesPipelineStep {
  id: string
  run_id: string
  company_id: string
  step_key: SalesPipelineStepKey
  position: number
  status: SalesPipelineStepStatus
  required: boolean
  owner_tool: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  input_payload: JsonRecord
  output_payload: JsonRecord
  created_at: string
  updated_at: string
}

export interface SalesArtifactManifest {
  id: string
  run_id: string | null
  company_id: string
  artifact_type: ContentAssetType | "delivery_bundle" | "company_karte"
  source_tool: string
  storage_provider: "cloudflare_r2" | "supabase" | "directus" | "keystatic" | "twenty" | "external"
  r2_bucket: string | null
  r2_key: string | null
  public_url: string | null
  status: "planned" | "generated" | "uploaded" | "synced" | "delivered" | "failed" | "skipped"
  version: number
  checksum: string | null
  metadata: JsonRecord
  created_at: string
  updated_at: string
}

export interface DashboardSalesPipeline {
  runs: SalesPipelineRun[]
  error: string | null
}

export const SALES_PIPELINE_STEPS: SalesPipelineStepDefinition[] = [
  { key: "twenty_csv_intake", label: "Twenty/CSV intake", ownerTool: "twenty_or_csv", required: true },
  { key: "supabase_normalize", label: "Supabase normalization", ownerTool: "supabase", required: true },
  { key: "data_collection", label: "Multi-source data collection", ownerTool: "multi_source", required: true },
  { key: "karte_generate", label: "Company karte generation", ownerTool: "supabase_dify", required: true },
  { key: "report_generate", label: "Diagnostic report generation", ownerTool: "nextjs_reports", required: true },
  { key: "video_generate", label: "Video job generation", ownerTool: "openclaw_video", required: false },
  { key: "r2_manifest", label: "R2 artifact manifest", ownerTool: "cloudflare_r2", required: true },
  { key: "external_studio_sync", label: "Directus/Keystatic sync", ownerTool: "directus_keystatic", required: false },
  { key: "twenty_writeback", label: "Twenty delivery writeback", ownerTool: "twenty", required: true },
  { key: "outreach_preflight", label: "Outbound preflight", ownerTool: "sales_outreach", required: true },
  { key: "outreach_send", label: "Outbound send or approval gate", ownerTool: "sales_outreach", required: true },
  { key: "reply_capture", label: "Chatwoot/LiveKit reply capture", ownerTool: "chatwoot_livekit", required: false },
  { key: "follow_up_queue", label: "Follow-up queue", ownerTool: "operator_queue", required: false },
]
