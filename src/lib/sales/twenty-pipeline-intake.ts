import { getServiceSalesSupabase } from "@/lib/supabase"
import { buildSalesPipelinePlan, getSalesPipelineTriggerConfig, updateRun } from "./sales-pipeline-helpers"
import type { TwentyPullOptions } from "./twenty-pull"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { startSalesPipelineRunFallback } from "./sales-pipeline-fallback"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

interface TwentyPipelineRecord {
  id?: string | null
}

export interface TwentyPipelineEnsureResult {
  created: boolean
  dispatched: boolean
  reused: boolean
  error?: string
}

async function activePipelineRunId(sb: ServiceSupabase, companyId: string): Promise<string | null> {
  const { data, error } = await sb
    .from(DB_TABLES.SALES_PIPELINE_RUNS)
    .select("id")
    .eq("company_id", companyId)
    .in("status", ["queued", "running", "waiting_external"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("[twenty-pipeline-intake] active pipeline lookup failed:", error.message)
    return null
  }
  return typeof data?.id === "string" ? data.id : null
}

async function createPipelineRun(
  sb: ServiceSupabase,
  input: {
    companyId: string
    record: TwentyPipelineRecord
    domain: string
    options: TwentyPullOptions
  },
): Promise<{ ok: true; runId: string } | { ok: false; error: string }> {
  const trigger = getSalesPipelineTriggerConfig()
  const plan = buildSalesPipelinePlan({
    requireVideo: input.options.requireVideo === true,
    autoSyncExternalStudios: input.options.autoSyncExternalStudios,
  })
  const { data: run, error } = await sb
    .from(DB_TABLES.SALES_PIPELINE_RUNS)
    .insert({
      company_id: input.companyId,
      source: "twenty",
      status: "queued",
      current_step: plan[0]?.key ?? null,
      trigger_task_id: trigger.taskId,
      requested_by: input.options.requestedBy ?? "twenty_sync",
      require_video: input.options.requireVideo === true,
      auto_sync_external_studios: input.options.autoSyncExternalStudios !== false,
      input_payload: {
        twenty_company_id: input.record.id ?? null,
        domain: input.domain,
        source: "twenty_pull",
      },
    })
    .select("id")
    .single()

  if (error || !run?.id) {
    return { ok: false, error: error?.message ?? "Sales pipeline run insert failed" }
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
  if (stepsError) return { ok: false, error: stepsError.message }

  return { ok: true, runId: run.id as string }
}

async function dispatchPipelineRun(
  sb: ServiceSupabase,
  input: { runId: string; companyId: string },
): Promise<{ ok: boolean; dispatched: boolean; error?: string }> {
  const trigger = getSalesPipelineTriggerConfig()
  if (!trigger.endpoint || !trigger.secretKey) {
    await updateRun(sb, input.runId, {
      status: "queued",
      trigger_provider: "local",
      error_message: "Trigger.dev Sales OS pipeline task is not configured; app fallback queued",
    })
    startSalesPipelineRunFallback(input.runId)
    return { ok: true, dispatched: false, error: "Trigger.dev is not configured; app fallback queued" }
  }

  try {
    const res = await fetch(trigger.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${trigger.secretKey}` },
      body: JSON.stringify({
        payload: {
          run_id: input.runId,
          company_id: input.companyId,
          source: "twenty",
        },
        context: { source: "twenty-sync", runId: input.runId },
        options: {
          idempotencyKey: `sales-os-pipeline-${input.runId}`,
          concurrencyKey: `company-${input.companyId}`,
          queue: { name: "sales-os-pipeline", concurrencyLimit: 2 },
        },
      }),
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`Trigger.dev dispatch failed: HTTP ${res.status} ${text.slice(0, 240)}`)

    let parsed: Record<string, unknown> = {}
    try {
      parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    } catch (error) {
      console.warn("[twenty-pipeline-intake] Trigger.dev returned non-json:", error)
    }
    const triggerRunId =
      typeof parsed.id === "string"
        ? parsed.id
        : typeof parsed.runId === "string"
          ? parsed.runId
          : typeof parsed.run_id === "string"
            ? parsed.run_id
            : null

    await updateRun(sb, input.runId, {
      status: "waiting_external",
      trigger_provider: "trigger.dev",
      trigger_run_id: triggerRunId,
      started_at: new Date().toISOString(),
      error_message: null,
    })
    startSalesPipelineRunFallback(input.runId, { delayMs: 60_000 })
    return { ok: true, dispatched: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Trigger.dev dispatch failed"
    console.error("[twenty-pipeline-intake] pipeline dispatch failed:", error)
    await updateRun(sb, input.runId, {
      status: "queued",
      trigger_provider: "local",
      error_message: `${message}; app fallback queued`,
    })
    startSalesPipelineRunFallback(input.runId)
    return { ok: true, dispatched: false, error: `${message}; app fallback queued` }
  }
}

export async function ensureTwentyPipelineRun(
  sb: ServiceSupabase,
  input: {
    companyId: string
    record: TwentyPipelineRecord
    domain: string
    options: TwentyPullOptions
    dispatch: boolean
  },
): Promise<TwentyPipelineEnsureResult> {
  const activeRun = await activePipelineRunId(sb, input.companyId)
  if (activeRun) return { created: false, dispatched: false, reused: true }

  const pipeline = await createPipelineRun(sb, input)
  if (!pipeline.ok) return { created: false, dispatched: false, reused: false, error: pipeline.error }

  if (!input.dispatch) return { created: true, dispatched: false, reused: false }

  const dispatched = await dispatchPipelineRun(sb, { runId: pipeline.runId, companyId: input.companyId })
  return {
    created: true,
    dispatched: dispatched.dispatched,
    reused: false,
    error: dispatched.ok ? undefined : dispatched.error,
  }
}
