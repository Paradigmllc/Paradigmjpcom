import { recoverStaleEnrichmentJobs, runEnrichmentJobs, type EnrichmentRunResult } from "./enrichment-jobs-runner"
import { pullTwentyCompaniesToSupabase } from "./twenty-pull"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

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

// ── Event-triggered report repair (webhook/API/manual action; no timer loop) ──
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
