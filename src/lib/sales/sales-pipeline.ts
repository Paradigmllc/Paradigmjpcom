/**
 * lib/sales/sales-pipeline.ts
 *
 * Sales OS のパイプラインオーケストレーションメイン。
 * 500行制限対応のため内部ロジックを分離済み。
 * 2026-07-06: Trigger.dev HTTP dispatch 削除 → ローカル実行に統一。
 */

import { getServiceSalesSupabase } from "@/lib/supabase"
import type { DashboardSalesPipeline, JsonRecord, SalesPipelineRun, SalesPipelineSource } from "./sales-pipeline-types"

import { runSalesPipelineLocally } from "./sales-pipeline-execution"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { startSalesPipelineRunFallback } from "./sales-pipeline-fallback"
import {
  buildSalesPipelinePlan,
  fetchRunWithSteps,
  getPipelineOrchestratorConfig,
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

  const orchestrator = getPipelineOrchestratorConfig()
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
      trigger_task_id: orchestrator.taskId,
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

  if (!error) return { runs: (data ?? []) as SalesPipelineRun[], error: null }

  if (/relationship|schema cache/i.test(error.message)) {
    const { data: runs, error: runsError } = await sb
      .from(DB_TABLES.SALES_PIPELINE_RUNS)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)
    if (runsError) {
      console.error("[sales-pipeline] list fallback runs failed:", runsError.message)
      return { runs: [], error: runsError.message }
    }

    const runRows = (runs ?? []) as SalesPipelineRun[]
    const runIds = runRows.map((run) => run.id)
    const companyIds = [...new Set(runRows.map((run) => run.company_id).filter((id): id is string => typeof id === "string"))]
    const stepsRes = runIds.length
      ? await sb
          .from(DB_TABLES.SALES_PIPELINE_STEPS)
          .select("*")
          .in("run_id", runIds)
          .order("position", { ascending: true })
      : { data: [], error: null }
    const companiesRes = companyIds.length
      ? await sb
          .from(DB_TABLES.SALES_COMPANIES)
          .select("id, company_name, domain")
          .in("id", companyIds)
      : { data: [], error: null }

    const fallbackErrors = [stepsRes.error?.message, companiesRes.error?.message].filter(Boolean)
    if (fallbackErrors.length) console.error("[sales-pipeline] list fallback partial errors:", fallbackErrors.join("; "))

    const stepsByRun = new Map<string, unknown[]>()
    for (const step of stepsRes.data ?? []) {
      const runId = typeof step.run_id === "string" ? step.run_id : null
      if (!runId) continue
      const list = stepsByRun.get(runId) ?? []
      list.push(step)
      stepsByRun.set(runId, list)
    }
    const companiesById = new Map(
      (companiesRes.data ?? []).map((company) => [
        company.id,
        { company_name: company.company_name ?? null, domain: company.domain ?? null },
      ]),
    )

    return {
      runs: runRows.map((run) => ({
        ...run,
        sales_companies: companiesById.get(run.company_id) ?? null,
        steps: (stepsByRun.get(run.id) ?? []) as SalesPipelineRun["steps"],
      })),
      error: fallbackErrors.length ? fallbackErrors.join("; ") : null,
    }
  }

  console.error("[sales-pipeline] list failed:", error.message)
  return { runs: [], error: error.message }
}

/**
 * Dispatch a pipeline run for local execution.
 * 2026-07-06: Trigger.dev HTTP dispatch removed — always uses local fallback.
 */
export async function dispatchSalesPipelineRun(runId: string): Promise<{ ok: boolean; run?: SalesPipelineRun; error?: string; message?: string }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, error: "Supabase service_role is not configured" }

  const run = await fetchRunWithSteps(sb, runId)
  const orchestrator = getPipelineOrchestratorConfig()

  if (!orchestrator.ready) {
    await updateRun(sb, run.id, {
      status: "queued",
      trigger_provider: "local",
      error_message: "OpenClaw pipeline orchestrator is not ready; app fallback queued",
    })
    startSalesPipelineRunFallback(run.id)
    return {
      ok: true,
      run: await fetchRunWithSteps(sb, run.id),
      message: "OpenClaw orchestrator not ready; app fallback queued",
    }
  }

  await updateRun(sb, run.id, {
    status: "queued",
    trigger_provider: "openclaw",
    started_at: run.started_at ?? new Date().toISOString(),
    error_message: null,
  })
  startSalesPipelineRunFallback(run.id)
  return { ok: true, run: await fetchRunWithSteps(sb, run.id), message: "Pipeline run queued for local execution via OpenClaw" }
}
