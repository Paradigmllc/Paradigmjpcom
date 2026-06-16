import { recoverStaleEnrichmentJobs, runEnrichmentJobs, type EnrichmentRunResult } from "./enrichment-jobs-runner"
import { pullTwentyCompaniesToSupabase } from "./twenty-pull"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

const TICK_INTERVAL_MS = 10_000
const DRAIN_BATCH_SIZE = 10
const DRAIN_MAX_BATCHES = 50
const DRAIN_SLEEP_MS = 2_000

type WorkerGlobal = typeof globalThis & { __enrichmentWorkerStarted?: boolean }

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || process.env.SALES_PIPELINE_WATCHDOG_ENABLED === "1"
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function startEnrichmentWorker(): void {
  if (!isProductionRuntime()) return
  const state = globalThis as WorkerGlobal
  if (state.__enrichmentWorkerStarted) return
  state.__enrichmentWorkerStarted = true

  let draining = false
  const timer = setInterval(() => {
    if (draining) return
    enrichmentTick().catch((e) => console.error("[enrichment-worker] tick failed:", e))
  }, TICK_INTERVAL_MS)
  timer.unref?.()

  async function enrichmentTick() {
    const recovered = await recoverStaleEnrichmentJobs(10)
    const result = await runEnrichmentJobs(DRAIN_BATCH_SIZE)
    if (recovered > 0 || result.processed > 0) {
      console.warn("[enrichment-worker] tick", { recovered, processed: result.processed, completed: result.completed, failed: result.failed })
    }
    if (result.processed > 0) {
      draining = true
      try {
        await drainQueue(result)
      } finally {
        draining = false
      }
    }
  }

  async function drainQueue(firstResult: EnrichmentRunResult) {
    let lastCount = firstResult.processed
    for (let batch = 1; batch < DRAIN_MAX_BATCHES && lastCount > 0; batch++) {
      await sleep(DRAIN_SLEEP_MS)
      const result = await runEnrichmentJobs(DRAIN_BATCH_SIZE)
      lastCount = result.processed
      if (result.processed > 0) {
        console.warn("[enrichment-worker] drain", { batch, processed: result.processed, completed: result.completed, failed: result.failed })
      }
    }
  }
}

// ── Cron replacement: Twenty sync (was Trigger.dev twentySyncCron * * * * *) ──
let lastTwentySyncAt = 0
export async function runTwentySyncTick(): Promise<{ scanned: number; upserted: number }> {
  if (Date.now() - lastTwentySyncAt < 55_000) return { scanned: 0, upserted: 0 }
  lastTwentySyncAt = Date.now()
  try {
    const result = await pullTwentyCompaniesToSupabase(500, {
      autoRunPipeline: true,
      dispatchPipeline: true,
      requestedBy: "twenty_sync_worker",
    })
    return { scanned: result.scanned ?? 0, upserted: (result.created ?? 0) + (result.updated ?? 0) }
  } catch (error) {
    console.error("[twenty-sync-worker] failed:", error instanceof Error ? error.message : String(error))
    return { scanned: 0, upserted: 0 }
  }
}

// ── Cron replacement: Report regenerator (was Trigger.dev salesReportRegeneratorTask */5 * * * *) ──
let lastReportRegenAt = 0
export async function runReportRegeneratorTick(): Promise<number> {
  if (Date.now() - lastReportRegenAt < 4 * 60_000) return 0
  lastReportRegenAt = Date.now()
  const sb = getServiceSalesSupabase()
  if (!sb) return 0
  try {
    const { data, error } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("id, domain, region, report_locale, target_country")
      .is("report_generated_at", null)
      .eq("pipeline_status", "report_ready")
      .order("created_at", { ascending: false })
      .limit(10)
    if (error || !data?.length) return 0

    let regenerated = 0
    for (const row of data as Array<{ id: string; domain: string; region: string | null; report_locale: string | null; target_country: string | null }>) {
      try {
        const { fetchDiagnosticReport } = await import("./diagnostic")
        await fetchDiagnosticReport({
          companyId: row.id,
          region: row.region as "global" | "jp" | undefined,
          reportLocale: row.report_locale ?? undefined,
          targetCountry: row.target_country ?? undefined,
          forceRegenerate: true,
        })
        regenerated++
      } catch (e) {
        console.error("[report-regenerator] company failed:", row.domain, e instanceof Error ? e.message : String(e))
      }
    }
    if (regenerated > 0) console.warn("[report-regenerator] regenerated", regenerated)
    return regenerated
  } catch (error) {
    console.error("[report-regenerator] tick failed:", error instanceof Error ? error.message : String(error))
    return 0
  }
}
