import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { recordLeadOperatorEvent } from "./lead-operator-audit"
import { ingestLeadSourceConfig } from "./lead-source-records"
import { runLeadSourcePreflightChunk, type LeadSourcePreflightSummary } from "./lead-source-preflight"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>
type RunStatus = "queued" | "running" | "completed" | "partial" | "failed" | "cancelled"

export interface LeadInventoryRun {
  id: string
  status: RunStatus
  operator_name: string
  source_config_ids: string[]
  completed_source_ids: string[]
  current_source_id: string | null
  source_count: number
  completed_source_count: number
  ingested_count: number
  eligible_count: number
  retryable_count: number
  rejected_count: number
  failure_count: number
  failures: Array<{ sourceId: string; message: string; at: string }>
  send_count: number
  twenty_sync_count: number
  error_message: string | null
  heartbeat_at: string
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

const activeRuns = new Set<string>()
const pendingRuns: string[] = []
const MAX_PREFLIGHT_CHUNKS_PER_SOURCE = 1_000
const MAX_ACTIVE_RUNS = 1

function getSb(): ServiceSupabase {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")
  return sb
}

function nowIso(): string {
  return new Date().toISOString()
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Verified inventory preparation failed"
}

function nextSourceId(run: LeadInventoryRun): string | null {
  const completed = new Set(run.completed_source_ids)
  return run.source_config_ids.find((sourceId) => !completed.has(sourceId)) ?? null
}

async function updateRun(runId: string, patch: Record<string, unknown>): Promise<void> {
  const result = await getSb().from(DB_TABLES.SALES_LEAD_INVENTORY_RUNS).update({ ...patch, heartbeat_at: nowIso() }).eq("id", runId)
  if (result.error) throw new Error(result.error.message)
}

async function completeRun(run: LeadInventoryRun): Promise<void> {
  const status: RunStatus = run.failure_count === 0 ? "completed" : run.failure_count >= run.source_count ? "failed" : "partial"
  await updateRun(run.id, { status, current_source_id: null, completed_at: nowIso() })
  try {
    await recordLeadOperatorEvent({
      entityType: "run",
      entityId: run.id,
      action: `verified_inventory_${status}`,
      operatorName: run.operator_name,
      detail: { ingested: run.ingested_count, eligible: run.eligible_count, failures: run.failure_count, sendCount: 0, twentySyncCount: 0 },
    })
  } catch (error) {
    console.error("[lead-inventory-runs] completion audit failed:", error)
  }
  try {
    const { notifyBothChannels } = await import("@/lib/notify")
    await notifyBothChannels("sales", {
      title: `検証済み候補在庫: ${status}`,
      message: `取込${run.ingested_count}件 / サイト利用可${run.eligible_count}件 / 除外${run.rejected_count}件 / 一時障害${run.retryable_count}件。Twenty同期・文面生成・レポート生成・外部送信は0件です。`,
      link: "/ja/admin/lead-factory",
      type: "verified_lead_inventory_completed",
    })
  } catch (error) {
    console.error("[lead-inventory-runs] completion notification failed:", error)
  }
}

async function runPreflight(sourceId: string): Promise<LeadSourcePreflightSummary> {
  let mode: "pending" | "continue" = "pending"
  for (let chunk = 0; chunk < MAX_PREFLIGHT_CHUNKS_PER_SOURCE; chunk += 1) {
    const result = await runLeadSourcePreflightChunk({ sourceId, mode })
    if (result.remaining === 0) return result.summary
    mode = "continue"
  }
  throw new Error(`Source preflight exceeded ${MAX_PREFLIGHT_CHUNKS_PER_SOURCE * 50} records`)
}

async function processNextSource(runId: string): Promise<boolean> {
  const result = await getSb().from(DB_TABLES.SALES_LEAD_INVENTORY_RUNS).select("*").eq("id", runId).single()
  if (result.error) throw new Error(result.error.message)
  const run = result.data as LeadInventoryRun
  if (["completed", "partial", "failed", "cancelled"].includes(run.status)) return true
  const sourceId = nextSourceId(run)
  if (!sourceId) {
    await completeRun(run)
    return true
  }

  await updateRun(run.id, { status: "running", current_source_id: sourceId, started_at: run.started_at ?? nowIso(), error_message: null })
  let ingestion: { accepted: number; rejected: number } | null = null
  let summary: LeadSourcePreflightSummary | null = null
  let failure: { sourceId: string; message: string; at: string } | null = null
  try {
    ingestion = await ingestLeadSourceConfig(sourceId)
    summary = await runPreflight(sourceId)
  } catch (error) {
    console.error("[lead-inventory-runs] source preparation failed:", sourceId, error)
    failure = { sourceId, message: messageOf(error), at: nowIso() }
  }

  const completedSourceIds = [...run.completed_source_ids, sourceId]
  const nextFailureCount = run.failure_count + (failure ? 1 : 0)
  await updateRun(run.id, {
    completed_source_ids: completedSourceIds,
    completed_source_count: completedSourceIds.length,
    current_source_id: null,
    ingested_count: run.ingested_count + (ingestion?.accepted ?? 0),
    eligible_count: run.eligible_count + (summary?.eligible ?? 0),
    retryable_count: run.retryable_count + (summary?.retryable ?? 0),
    rejected_count: run.rejected_count + (summary?.rejected ?? ingestion?.rejected ?? 0),
    failure_count: nextFailureCount,
    failures: failure ? [...run.failures, failure] : run.failures,
    error_message: failure?.message ?? null,
  })
  return completedSourceIds.length >= run.source_count
}

async function runLoop(runId: string): Promise<void> {
  try {
    for (let source = 0; source < 100; source += 1) {
      const finished = await processNextSource(runId)
      if (finished) {
        const refreshed = await getSb().from(DB_TABLES.SALES_LEAD_INVENTORY_RUNS).select("*").eq("id", runId).single()
        if (refreshed.error) throw new Error(refreshed.error.message)
        const run = refreshed.data as LeadInventoryRun
        if (!["completed", "partial", "failed", "cancelled"].includes(run.status)) await completeRun(run)
        return
      }
    }
    throw new Error("Verified inventory run exceeded 100 sources")
  } catch (error) {
    console.error("[lead-inventory-runs] runner failed:", runId, error)
    await updateRun(runId, { status: "failed", error_message: messageOf(error), completed_at: nowIso() }).catch((persistError) => {
      console.error("[lead-inventory-runs] failure persistence failed:", runId, persistError)
    })
  } finally {
    activeRuns.delete(runId)
    drainRuns()
  }
}

function drainRuns(): void {
  while (activeRuns.size < MAX_ACTIVE_RUNS) {
    const runId = pendingRuns.shift()
    if (!runId) return
    if (activeRuns.has(runId)) continue
    activeRuns.add(runId)
    setTimeout(() => { void runLoop(runId) }, 0)
  }
}

export function startLeadInventoryRun(runId: string): { started: boolean; alreadyRunning: boolean } {
  if (activeRuns.has(runId) || pendingRuns.includes(runId)) return { started: false, alreadyRunning: true }
  pendingRuns.push(runId)
  drainRuns()
  return { started: true, alreadyRunning: false }
}

export async function createLeadInventoryRun(input: { operatorName: string; sourceConfigIds: string[] }): Promise<LeadInventoryRun> {
  const sourceConfigIds = [...new Set(input.sourceConfigIds)]
  if (sourceConfigIds.length === 0 || sourceConfigIds.length > 100) throw new Error("One to 100 approved source configs are required")
  const result = await getSb().from(DB_TABLES.SALES_LEAD_INVENTORY_RUNS).insert({
    operator_name: input.operatorName,
    source_config_ids: sourceConfigIds,
    source_count: sourceConfigIds.length,
    status: "queued",
  }).select("*").single()
  if (result.error) throw new Error(result.error.message)
  return result.data as LeadInventoryRun
}

export async function listLeadInventoryRuns(limit = 20): Promise<LeadInventoryRun[]> {
  const result = await getSb().from(DB_TABLES.SALES_LEAD_INVENTORY_RUNS).select("*").order("created_at", { ascending: false }).limit(Math.min(Math.max(limit, 1), 100))
  if (result.error) throw new Error(result.error.message)
  return (result.data ?? []) as LeadInventoryRun[]
}
