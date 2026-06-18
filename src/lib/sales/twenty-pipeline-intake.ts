import { getServiceSalesSupabase } from "@/lib/supabase"
import { buildSalesPipelinePlan, getSalesPipelineTriggerConfig, updateRun } from "./sales-pipeline-helpers"
import type { TwentyPullOptions } from "./twenty-pull"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { startSalesPipelineRunFallback } from "./sales-pipeline-fallback"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

interface TwentyPipelineRecord {
  id?: string | null
}

interface ActivePipelineRun {
  id: string
  status: string
  trigger_run_id: string | null
  require_video: boolean
  auto_sync_external_studios: boolean
  stepCount: number
}

export interface TwentyPipelineEnsureResult {
  created: boolean
  dispatched: boolean
  reused: boolean
  error?: string
}

async function activePipelineRun(sb: ServiceSupabase, companyId: string): Promise<ActivePipelineRun | null> {
  const { data, error } = await sb
    .from(DB_TABLES.SALES_PIPELINE_RUNS)
    .select("id, status, trigger_run_id, require_video, auto_sync_external_studios")
    .eq("company_id", companyId)
    .in("status", ["queued", "running", "waiting_external"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("[twenty-pipeline-intake] active pipeline lookup failed:", error.message)
    return null
  }
  if (typeof data?.id !== "string") return null

  const { count, error: stepsError } = await sb
    .from(DB_TABLES.SALES_PIPELINE_STEPS)
    .select("id", { count: "exact", head: true })
    .eq("run_id", data.id)
  if (stepsError) {
    console.error("[twenty-pipeline-intake] active pipeline step count failed:", stepsError.message)
    return {
      id: data.id,
      status: typeof data.status === "string" ? data.status : "queued",
      trigger_run_id: typeof data.trigger_run_id === "string" ? data.trigger_run_id : null,
      require_video: data.require_video === true,
      auto_sync_external_studios: data.auto_sync_external_studios !== false,
      stepCount: 0,
    }
  }

  return {
    id: data.id,
    status: typeof data.status === "string" ? data.status : "queued",
    trigger_run_id: typeof data.trigger_run_id === "string" ? data.trigger_run_id : null,
    require_video: data.require_video === true,
    auto_sync_external_studios: data.auto_sync_external_studios !== false,
    stepCount: count ?? 0,
  }
}

async function ensurePipelineSteps(
  sb: ServiceSupabase,
  input: {
    runId: string
    companyId: string
    requireVideo: boolean
    autoSyncExternalStudios: boolean
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const plan = buildSalesPipelinePlan({
    requireVideo: input.requireVideo,
    autoSyncExternalStudios: input.autoSyncExternalStudios,
  })
  const steps = plan.map((step, index) => ({
    run_id: input.runId,
    company_id: input.companyId,
    step_key: step.key,
    position: index + 1,
    status: step.required ? "queued" : "skipped",
    required: step.required,
    owner_tool: step.ownerTool,
    input_payload: {},
  }))
  const { error } = await sb.from(DB_TABLES.SALES_PIPELINE_STEPS).insert(steps)
  if (error) {
    if (/duplicate|unique|conflict/i.test(error.message)) return { ok: true }
    console.error("[twenty-pipeline-intake] pipeline step ensure failed:", error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
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

  const steps = await ensurePipelineSteps(sb, {
    runId: run.id as string,
    companyId: input.companyId,
    requireVideo: input.options.requireVideo === true,
    autoSyncExternalStudios: input.options.autoSyncExternalStudios !== false,
  })
  if (!steps.ok) {
    await updateRun(sb, run.id as string, {
      status: "failed",
      error_message: `Pipeline step creation failed: ${steps.error}`,
    }).catch((updateError) => {
      console.error("[twenty-pipeline-intake] failed to mark step-less run failed:", updateError)
    })
    return { ok: false, error: steps.error }
  }

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
  const activeRun = await activePipelineRun(sb, input.companyId)
  if (activeRun) {
    if (activeRun.stepCount === 0) {
      const repaired = await ensurePipelineSteps(sb, {
        runId: activeRun.id,
        companyId: input.companyId,
        requireVideo: activeRun.require_video,
        autoSyncExternalStudios: activeRun.auto_sync_external_studios,
      })
      if (!repaired.ok) {
        await updateRun(sb, activeRun.id, {
          status: "failed",
          error_message: `Active pipeline had no steps and repair failed: ${repaired.error}`,
        }).catch((updateError) => {
          console.error("[twenty-pipeline-intake] failed to mark unrecoverable active run failed:", updateError)
        })
        return { created: false, dispatched: false, reused: true, error: repaired.error }
      }
    }

    if (input.dispatch && activeRun.status === "queued" && !activeRun.trigger_run_id) {
      const dispatched = await dispatchPipelineRun(sb, { runId: activeRun.id, companyId: input.companyId })
      return {
        created: false,
        dispatched: dispatched.dispatched,
        reused: true,
        error: dispatched.error,
      }
    }

    return { created: false, dispatched: false, reused: true }
  }

  const pipeline = await createPipelineRun(sb, input)
  if (!pipeline.ok) return { created: false, dispatched: false, reused: false, error: pipeline.error }

  if (!input.dispatch) return { created: true, dispatched: false, reused: false }

  const dispatched = await dispatchPipelineRun(sb, { runId: pipeline.runId, companyId: input.companyId })
  return {
    created: true,
    dispatched: dispatched.dispatched,
    reused: false,
    error: dispatched.error,
  }
}
