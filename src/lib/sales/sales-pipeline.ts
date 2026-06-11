/**
 * lib/sales/sales-pipeline.ts
 *
 * Sales OS のパイプラインオーケストレーションメイン。
 * 500行制限対応のため内部ロジックを分離済み。
 */

import { getServiceSalesSupabase } from "@/lib/supabase"
import type { DashboardSalesPipeline, JsonRecord, SalesPipelineRun, SalesPipelineSource } from "./sales-pipeline-types"

import { runSalesPipelineLocally } from "./sales-pipeline-execution"
import { DB_TABLES } from "@/lib/sales/db-tables"
import {
  buildSalesPipelinePlan,
  fetchRunWithSteps,
  getSalesPipelineTriggerConfig,
  updateRun,
} from "./sales-pipeline-helpers"

export * from "./sales-pipeline-types"
export { buildSalesPipelinePlan, summarizeSalesPipelineStatus } from "./sales-pipeline-helpers"
export { runSalesPipelineLocally }

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export async function createSalesPipelineRun(input: {
  companyId: string
  source?: SalesPipelineSource
  requireVideo?: boolean
  autoSyncExternalStudios?: boolean
  requestedBy?: string
  payload?: JsonRecord
}): Promise<{ ok: true; run: SalesPipelineRun } | { ok: false; error: string }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, error: "Supabase service_role is not configured" }

  const trigger = getSalesPipelineTriggerConfig()
  const plan = buildSalesPipelinePlan({
    requireVideo: input.requireVideo,
    autoSyncExternalStudios: input.autoSyncExternalStudios,
  })

  const { data: run, error } = await sb
    .from(DB_TABLES.SALES_PIPELINE_RUNS)
    .insert({
      company_id: input.companyId,
      source: input.source ?? "sales_os",
      status: "queued",
      current_step: plan[0]?.key ?? null,
      trigger_task_id: trigger.taskId,
      requested_by: input.requestedBy ?? "sales-os",
      require_video: input.requireVideo === true,
      auto_sync_external_studios: input.autoSyncExternalStudios !== false,
      input_payload: input.payload ?? {},
    })
    .select("*")
    .single()

  if (error) {
    console.error("[sales-pipeline] run insert failed:", error.message)
    return { ok: false, error: error.message }
  }

  const steps = plan.map((step, index) => ({
    run_id: run.id,
    company_id: input.companyId,
    step_key: step.key,
    position: index + 1,
    status: step.required ? "queued" : "skipped",
    required: step.required,
    owner_tool: step.ownerTool,
    input_payload: {},
  }))
  const { error: stepsError } = await sb.from(DB_TABLES.SALES_PIPELINE_STEPS).insert(steps)
  if (stepsError) {
    console.error("[sales-pipeline] step insert failed:", stepsError.message)
    return { ok: false, error: stepsError.message }
  }

  return { ok: true, run: await fetchRunWithSteps(sb, run.id) }
}

export async function listSalesPipelineRuns(limit = 20): Promise<DashboardSalesPipeline> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { runs: [], error: "Supabase service_role is not configured" }

  const { data, error } = await sb
    .from(DB_TABLES.SALES_PIPELINE_RUNS)
    .select("*, sales_companies(company_name, domain), steps:sales_pipeline_steps(*)")
    .order("created_at", { ascending: false })
    .order("position", { referencedTable: "sales_pipeline_steps", ascending: true })
    .limit(limit)

  if (error) {
    console.error("[sales-pipeline] list failed:", error.message)
    return { runs: [], error: error.message }
  }
  return { runs: (data ?? []) as SalesPipelineRun[], error: null }
}

export async function dispatchSalesPipelineRun(runId: string): Promise<{ ok: boolean; run?: SalesPipelineRun; error?: string; message?: string }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, error: "Supabase service_role is not configured" }

  const run = await fetchRunWithSteps(sb, runId)
  const trigger = getSalesPipelineTriggerConfig()
  if (!trigger.endpoint || !trigger.secretKey) {
    await updateRun(sb, run.id, {
      status: "needs_review",
      trigger_provider: "manual",
      error_message: "Trigger.dev Sales OS pipeline task is not configured",
    })
    return {
      ok: true,
      run: await fetchRunWithSteps(sb, run.id),
      message: "Trigger.dev is not configured; run is ready for local/manual execution",
    }
  }

  const res = await fetch(trigger.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${trigger.secretKey}` },
    body: JSON.stringify({
      payload: {
        run_id: run.id,
        company_id: run.company_id,
        source: run.source,
        require_video: run.require_video,
        auto_sync_external_studios: run.auto_sync_external_studios,
        steps: (run.steps ?? []).map((step) => ({
          key: step.step_key,
          required: step.required,
          owner_tool: step.owner_tool,
        })),
      },
      context: { source: "revenue-os", runId: run.id },
      options: {
        idempotencyKey: `sales-os-pipeline-${run.id}`,
        concurrencyKey: `company-${run.company_id}`,
        queue: { name: "sales-os-pipeline", concurrencyLimit: 2 },
      },
    }),
  })

  const text = await res.text()
  if (!res.ok) throw new Error(`Trigger.dev dispatch failed: HTTP ${res.status} ${text.slice(0, 240)}`)
  let parsed: JsonRecord = {}
  try {
    parsed = text ? (JSON.parse(text) as JsonRecord) : {}
  } catch (error) {
    console.warn("[sales-pipeline] Trigger.dev returned non-json:", error)
  }
  const triggerRunId =
    typeof parsed.id === "string"
      ? parsed.id
      : typeof parsed.runId === "string"
        ? parsed.runId
        : typeof parsed.run_id === "string"
          ? parsed.run_id
          : null

  await updateRun(sb, run.id, {
    status: "waiting_external",
    trigger_provider: "trigger.dev",
    trigger_run_id: triggerRunId,
    started_at: run.started_at ?? new Date().toISOString(),
    error_message: null,
  })
  return { ok: true, run: await fetchRunWithSteps(sb, run.id), message: "Trigger.dev dispatch queued" }
}
