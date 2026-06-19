import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { fetchRunWithSteps, updateRun } from "./sales-pipeline-helpers"
import type { SalesPipelineRun, SalesPipelineStep } from "./sales-pipeline-types"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

const activePipelineFallbackRuns = new Set<string>()
const STALE_PIPELINE_RUN_MS = 5 * 60_000
const STALE_RUNNING_STEP_MS = 30 * 60_000
const STALE_EXTERNAL_KARTE_STEP_MS = 5 * 60_000

function nowIso(): string {
  return new Date().toISOString()
}

function timestampMs(value: string | null | undefined): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function stepAgeMs(step: SalesPipelineStep): number {
  const reference = Math.max(timestampMs(step.updated_at), timestampMs(step.started_at), timestampMs(step.created_at))
  return reference > 0 ? Date.now() - reference : 0
}

function isTerminal(run: SalesPipelineRun): boolean {
  return ["completed", "failed", "cancelled", "needs_review"].includes(run.status)
}

function hasActiveExternalStep(run: SalesPipelineRun): boolean {
  return (run.steps ?? []).some((step) => step.status === "running" || step.status === "waiting_external")
}

function shouldResetStep(step: SalesPipelineStep): boolean {
  if (step.status === "running") return stepAgeMs(step) >= STALE_RUNNING_STEP_MS
  if (step.status === "waiting_external" && step.step_key === "karte_generate") {
    return stepAgeMs(step) >= STALE_EXTERNAL_KARTE_STEP_MS
  }
  return false
}

async function resetRecoverableSteps(sb: ServiceSupabase, run: SalesPipelineRun): Promise<number> {
  let reset = 0
  for (const step of run.steps ?? []) {
    if (!shouldResetStep(step)) continue
    const { error } = await sb
      .from(DB_TABLES.SALES_PIPELINE_STEPS)
      .update({
        status: "queued",
        error_message: `auto-retry: stale ${step.status} sales pipeline step recovered`,
        started_at: null,
        completed_at: null,
      })
      .eq("id", step.id)
      .eq("status", "running")
    if (error) {
      console.error("[sales-pipeline-fallback] stale step recovery failed:", step.id, error.message)
    } else {
      reset += 1
    }
  }
  if (reset > 0) {
    await updateRun(sb, run.id, {
      status: "queued",
      error_message: "auto-retry: stale sales pipeline step recovered",
      completed_at: null,
    })
  }
  return reset
}

async function shouldRunFallback(sb: ServiceSupabase, runId: string): Promise<boolean> {
  const run = await fetchRunWithSteps(sb, runId)
  if (isTerminal(run)) return false
  const reset = await resetRecoverableSteps(sb, run)
  if (reset > 0) return true
  const refreshed = reset > 0 ? await fetchRunWithSteps(sb, runId) : run
  if (isTerminal(refreshed)) return false
  return !hasActiveExternalStep(refreshed)
}

async function runPipelineFallback(runId: string, delayMs: number): Promise<void> {
  try {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    const sb = getServiceSalesSupabase()
    if (!sb) {
      console.error("[sales-pipeline-fallback] Supabase service_role is not configured")
      return
    }
    if (!(await shouldRunFallback(sb, runId))) return
    const { runSalesPipelineLocally } = await import("./sales-pipeline-execution")
    await runSalesPipelineLocally(runId)
  } catch (error) {
    console.error("[sales-pipeline-fallback] fallback run failed:", runId, error)
  } finally {
    activePipelineFallbackRuns.delete(runId)
  }
}

export function startSalesPipelineRunFallback(
  runId: string,
  options: { delayMs?: number } = {},
): { started: boolean; alreadyRunning: boolean } {
  if (activePipelineFallbackRuns.has(runId)) return { started: false, alreadyRunning: true }
  activePipelineFallbackRuns.add(runId)
  setTimeout(() => {
    void runPipelineFallback(runId, Math.max(0, options.delayMs ?? 0))
  }, 0)
  return { started: true, alreadyRunning: false }
}

interface PipelineRunProjection {
  id: string
  status: string | null
  updated_at: string | null
  started_at: string | null
  created_at: string | null
}

function isStaleRun(row: PipelineRunProjection): boolean {
  if (!["queued", "running", "waiting_external"].includes(row.status ?? "")) return false
  const reference = Math.max(timestampMs(row.updated_at), timestampMs(row.started_at), timestampMs(row.created_at))
  return reference > 0 && Date.now() - reference > STALE_PIPELINE_RUN_MS
}

export async function restartStaleSalesPipelineRuns(limit = 3): Promise<number> {
  const sb = getServiceSalesSupabase()
  if (!sb) return 0
  const { data, error } = await sb
    .from(DB_TABLES.SALES_PIPELINE_RUNS)
    .select("id, status, updated_at, started_at, created_at")
    .in("status", ["queued", "running", "waiting_external"])
    .order("updated_at", { ascending: true })
    .limit(20)
  if (error) {
    console.error("[sales-pipeline-fallback] stale pipeline scan failed:", error.message)
    return 0
  }

  let restarted = 0
  for (const row of ((data ?? []) as PipelineRunProjection[]).filter(isStaleRun).slice(0, Math.max(1, Math.min(limit, 10)))) {
    const result = startSalesPipelineRunFallback(row.id)
    if (result.started || result.alreadyRunning) restarted += 1
  }
  return restarted
}
