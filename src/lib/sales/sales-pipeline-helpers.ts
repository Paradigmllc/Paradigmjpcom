/**
 * lib/sales/sales-pipeline-helpers.ts
 *
 * sales-pipeline.ts から分離 (C-2 対応)。
 * ヘルパー関数と、Supabase 更新系の共通処理をまとめるファイル。
 */

import { getServiceSalesSupabase } from "@/lib/supabase"
import type {
  JsonRecord,
  SalesArtifactManifest,
  SalesPipelineRun,
  SalesPipelineStep,
  SalesPipelineStepDefinition,
  SalesPipelineStatus,
} from "./sales-pipeline-types"
import { SALES_PIPELINE_STEPS } from "./sales-pipeline-types"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {}
}

export function optionalEnv(name: string): string | null {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export function publicUrlFor(baseUrl: string | null, objectKey: string | null): string | null {
  if (!baseUrl || !objectKey) return null
  return `${baseUrl.replace(/\/+$/, "")}/${objectKey}`
}

export function buildSalesPipelinePlan(input: {
  requireVideo?: boolean
  autoSyncExternalStudios?: boolean
}): SalesPipelineStepDefinition[] {
  const requireVideo = input.requireVideo === true
  const autoSyncExternalStudios = input.autoSyncExternalStudios !== false
  return SALES_PIPELINE_STEPS.map((step) => ({
    ...step,
    required:
      step.key === "video_generate"
        ? requireVideo
        : step.key === "external_studio_sync"
          ? autoSyncExternalStudios
          : step.required,
  }))
}

export function summarizeSalesPipelineStatus(steps: Array<{ status: string; required?: boolean }>): SalesPipelineStatus {
  if (steps.some((step) => step.status === "failed" && step.required !== false)) return "failed"
  if (steps.some((step) => step.status === "needs_review")) return "needs_review"
  if (steps.some((step) => step.status === "waiting_external")) return "waiting_external"
  if (steps.some((step) => step.status === "running")) return "running"
  if (steps.every((step) => step.status === "completed" || step.status === "skipped")) return "completed"
  return "queued"
}

export function getSalesPipelineTriggerConfig() {
  const taskId =
    optionalEnv("TRIGGER_SALES_OS_PIPELINE_TASK_ID") ??
    optionalEnv("TRIGGER_DEV_SALES_OS_PIPELINE_TASK_ID") ??
    "sales-os-pipeline"
  const secretKey = optionalEnv("TRIGGER_SECRET_KEY") ?? optionalEnv("TRIGGER_ACCESS_TOKEN") ?? optionalEnv("TRIGGER_DEV_API_KEY")
  const apiUrlRaw = optionalEnv("TRIGGER_API_URL")
  if (!apiUrlRaw) {
    console.error("[sales-pipeline-helpers] TRIGGER_API_URL is not configured")
  }
  const apiUrl = (apiUrlRaw ?? "").replace(/\/+$/, "")
  const dashboardUrl = optionalEnv("TRIGGER_DASHBOARD_URL") ?? optionalEnv("NEXT_PUBLIC_TRIGGER_DASHBOARD_URL")
  const endpoint = taskId ? `${apiUrl}/api/v1/tasks/${encodeURIComponent(taskId)}/trigger` : null
  return { taskId, secretKey, apiUrl, dashboardUrl, endpoint }
}

export async function updateRun(sb: ServiceSupabase, runId: string, patch: JsonRecord): Promise<void> {
  const { error } = await sb.from("sales_pipeline_runs").update(patch).eq("id", runId)
  if (error) throw new Error(error.message)
}

export async function updateStep(
  sb: ServiceSupabase,
  step: SalesPipelineStep,
  patch: Partial<Pick<SalesPipelineStep, "status" | "error_message" | "output_payload">>,
): Promise<void> {
  const now = new Date().toISOString()
  const next: JsonRecord = {
    ...patch,
    started_at: step.started_at ?? now,
  }
  if (patch.status === "completed" || patch.status === "failed" || patch.status === "skipped" || patch.status === "needs_review") {
    next.completed_at = now
  }
  const { error } = await sb.from("sales_pipeline_steps").update(next).eq("id", step.id)
  if (error) throw new Error(error.message)
}

export async function insertArtifact(
  sb: ServiceSupabase,
  input: {
    runId: string
    companyId: string
    artifactType: SalesArtifactManifest["artifact_type"]
    sourceTool: string
    storageProvider?: SalesArtifactManifest["storage_provider"]
    r2Bucket?: string | null
    r2Key?: string | null
    publicUrl?: string | null
    status: SalesArtifactManifest["status"]
    metadata?: JsonRecord
  },
): Promise<void> {
  const { error } = await sb.from("sales_artifact_manifest").insert({
    run_id: input.runId,
    company_id: input.companyId,
    artifact_type: input.artifactType,
    source_tool: input.sourceTool,
    storage_provider: input.storageProvider ?? "cloudflare_r2",
    r2_bucket: input.r2Bucket ?? null,
    r2_key: input.r2Key ?? null,
    public_url: input.publicUrl ?? null,
    status: input.status,
    metadata: input.metadata ?? {},
  })
  if (error) throw new Error(error.message)
}

export async function fetchRunWithSteps(sb: ServiceSupabase, runId: string): Promise<SalesPipelineRun> {
  const { data, error } = await sb
    .from("sales_pipeline_runs")
    .select("*, sales_companies(company_name, domain), steps:sales_pipeline_steps(*)")
    .eq("id", runId)
    .order("position", { referencedTable: "sales_pipeline_steps", ascending: true })
    .single()
  if (error) throw new Error(error.message)
  return data as SalesPipelineRun
}

export async function updateStepByKey(
  sb: ServiceSupabase,
  runId: string,
  stepKey: string,
  patch: JsonRecord,
): Promise<void> {
  const { error } = await sb
    .from("sales_pipeline_steps")
    .update(patch)
    .eq("run_id", runId)
    .eq("step_key", stepKey)
  if (error) throw new Error(error.message)
}

/**
 * Recover stuck pipeline runs that have been "waiting_external" for too long.
 * Resets the stuck step to "queued" and the run to "queued" so it can be re-dispatched.
 */
export async function recoverStuckPipelineRuns(sb: ServiceSupabase, maxStuckMinutes = 30): Promise<{ recovered: number; errors: string[] }> {
  const cutoff = new Date(Date.now() - maxStuckMinutes * 60_000).toISOString()
  const errors: string[] = []
  let recovered = 0

  const { data: runs, error } = await sb
    .from("sales_pipeline_runs")
    .select("id, updated_at")
    .eq("status", "waiting_external")
    .lte("updated_at", cutoff)
    .limit(20)

  if (error) {
    errors.push(`fetch stuck runs failed: ${error.message}`)
    return { recovered, errors }
  }

  for (const run of runs ?? []) {
    const { data: stuckStep } = await sb
      .from("sales_pipeline_steps")
      .select("id, step_key")
      .eq("run_id", run.id)
      .eq("status", "waiting_external")
      .maybeSingle()

    if (stuckStep) {
      await sb.from("sales_pipeline_steps").update({ status: "pending", error_message: "auto-retry: timed out", completed_at: null }).eq("id", stuckStep.id)
    }

    const { error: resetError } = await sb
      .from("sales_pipeline_runs")
      .update({ status: "queued", error_message: "auto-recovered from waiting_external timeout" })
      .eq("id", run.id)

    if (resetError) {
      errors.push(`reset ${run.id} failed: ${resetError.message}`)
    } else {
      recovered++
    }
  }

  return { recovered, errors }
}
