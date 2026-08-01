import { recoverStaleEnrichmentJobs, runEnrichmentJobs, type EnrichmentRunResult } from "./enrichment-jobs-runner"
import { pullTwentyCompaniesToSupabase } from "./twenty-pull"

const DRAIN_BATCH_SIZE = 100

export async function runEnrichmentEventDrain(limit = DRAIN_BATCH_SIZE): Promise<EnrichmentRunResult> {
  const safeLimit = Math.max(1, Math.min(Math.round(limit), DRAIN_BATCH_SIZE))
  const recovered = await recoverStaleEnrichmentJobs(safeLimit)
  const result = await runEnrichmentJobs(safeLimit)
  if (recovered > 0 || result.processed > 0) {
    console.warn("[enrichment-worker] event drain", {
      recovered,
      processed: result.processed,
      completed: result.completed,
      failed: result.failed,
    })
  }
  return result
}

// ── Event-triggered Twenty sync (webhook/API/manual action; no timer loop) ──
let lastTwentySyncAt = 0
export async function runTwentySyncTick(): Promise<{ scanned: number; upserted: number }> {
  if (Date.now() - lastTwentySyncAt < 55_000) return { scanned: 0, upserted: 0 }
  lastTwentySyncAt = Date.now()
  try {
    const result = await pullTwentyCompaniesToSupabase(500)
    return { scanned: result.scanned ?? 0, upserted: (result.created ?? 0) + (result.updated ?? 0) }
  } catch (error) {
    console.error("[twenty-sync-worker] failed:", error instanceof Error ? error.message : String(error))
    return { scanned: 0, upserted: 0 }
  }
}
