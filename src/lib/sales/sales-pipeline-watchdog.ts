import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { startLeadCandidateRunFallback } from "./lead-candidate-runner"
import { startPassiveInventoryFallback } from "./passive-inventory-runner"
import { runEnrichmentEventDrain, runTwentySyncTick } from "./enrichment-worker"

const STALE_RUN_MS = 5 * 60_000
const MAX_RESTARTS_PER_TICK = 3

export interface SalesPipelineEventDrainOptions {
  enrichmentLimit?: number
  recoverStaleRuns?: boolean
  includeTwentySync?: boolean
}

export interface SalesPipelineEventDrainResult {
  enrichmentProcessed: number
  enrichmentCompleted: number
  enrichmentFailed: number
  restartedLeadRuns: number
  restartedPassiveInventoryRuns: number
  restartedPipelineRuns: number
  twentySyncScanned: number
  twentySyncUpserted: number
}

interface CandidateRunRow {
  id: string
  status: string | null
  heartbeat_at: string | null
  created_at: string | null
  updated_at: string | null
}

function isStale(row: CandidateRunRow): boolean {
  const status = row.status ?? ""
  if (!["queued", "running"].includes(status)) return false
  const heartbeat = row.heartbeat_at ? Date.parse(row.heartbeat_at) : 0
  const updated = row.updated_at ? Date.parse(row.updated_at) : 0
  const created = row.created_at ? Date.parse(row.created_at) : 0
  const reference = [heartbeat, updated, created].filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => b - a)[0]
  return !!reference && Date.now() - reference > STALE_RUN_MS
}

async function restartStaleLeadRuns(): Promise<number> {
  const sb = getServiceSalesSupabase()
  if (!sb) return 0
  const { data, error } = await sb
    .from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS)
    .select("id, status, heartbeat_at, created_at, updated_at")
    .in("status", ["queued", "running"])
    .order("updated_at", { ascending: true })
    .limit(20)
  if (error) {
    console.error("[sales-pipeline-watchdog] stale run scan failed:", error.message)
    return 0
  }

  let restarted = 0
  for (const row of ((data ?? []) as CandidateRunRow[]).filter(isStale).slice(0, MAX_RESTARTS_PER_TICK)) {
    const result = startLeadCandidateRunFallback(row.id)
    if (result.started || result.alreadyRunning) restarted += 1
  }
  return restarted
}

async function restartStalePassiveInventoryRuns(): Promise<number> {
  const sb = getServiceSalesSupabase()
  if (!sb) return 0
  const { data, error } = await sb
    .from(DB_TABLES.SALES_PASSIVE_INVENTORY_RUNS)
    .select("id, status, heartbeat_at, created_at, updated_at")
    .in("status", ["queued", "running"])
    .order("updated_at", { ascending: true })
    .limit(20)
  if (error) {
    console.error("[sales-pipeline-watchdog] stale passive inventory scan failed:", error.message)
    return 0
  }

  let restarted = 0
  for (const row of ((data ?? []) as CandidateRunRow[]).filter(isStale).slice(0, MAX_RESTARTS_PER_TICK)) {
    const result = startPassiveInventoryFallback(row.id)
    if (result.started || result.alreadyRunning) restarted += 1
  }
  return restarted
}

async function tick(options: SalesPipelineEventDrainOptions = {}): Promise<SalesPipelineEventDrainResult> {
  const enrichmentLimit = Math.max(1, Math.min(Math.round(options.enrichmentLimit ?? 50), 100))
  const enrichment = await runEnrichmentEventDrain(enrichmentLimit)
  let restarted = 0
  let restartedPassive = 0
  let restartedPipelines = 0
  if (options.recoverStaleRuns !== false) {
    restarted = await restartStaleLeadRuns()
    restartedPassive = await restartStalePassiveInventoryRuns()
    const { restartStaleSalesPipelineRuns } = await import("./sales-pipeline-fallback")
    restartedPipelines = await restartStaleSalesPipelineRuns(3)
  }
  const twenty = options.includeTwentySync === true ? await runTwentySyncTick() : { scanned: 0, upserted: 0 }
  const result = {
    enrichmentProcessed: enrichment.processed,
    enrichmentCompleted: enrichment.completed,
    enrichmentFailed: enrichment.failed,
    restartedLeadRuns: restarted,
    restartedPassiveInventoryRuns: restartedPassive,
    restartedPipelineRuns: restartedPipelines,
    twentySyncScanned: twenty.scanned,
    twentySyncUpserted: twenty.upserted,
  }
  if (Object.values(result).some((value) => value > 0)) {
    console.warn("[sales-pipeline-watchdog] event drain", {
      ...result,
    })
  }
  return result
}

export async function runSalesPipelineEventDrain(
  options: SalesPipelineEventDrainOptions = {},
): Promise<SalesPipelineEventDrainResult> {
  return tick(options)
}

export function startSalesPipelineWatchdog(): void {
  if (process.env.SALES_PIPELINE_WATCHDOG_ENABLED === "1") {
    console.warn("[sales-pipeline-watchdog] disabled: use webhook/API-triggered runSalesPipelineEventDrain instead of a timer loop")
  }
}
