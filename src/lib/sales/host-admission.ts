import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

/**
 * Phase 9-9: lightweight runtime admission gate.
 *
 * When the system is already saturated (too many running enrichment jobs), defer new heavy
 * dispatch so the production host is not piled on under load (a contributor to the 5xx/524
 * incidents). Event-driven and WW-EVENT compliant — no polling loop, just a single check
 * at dispatch time.
 *
 * Opt-in via ADMISSION_MAX_RUNNING_JOBS. Fails OPEN: when unset, invalid, or the check errors,
 * it never defers (returns false) so the gate can never accidentally stall the pipeline.
 */
export async function shouldDeferHeavyDispatch(): Promise<boolean> {
  const cap = Number.parseInt(process.env.ADMISSION_MAX_RUNNING_JOBS ?? "", 10)
  if (!Number.isFinite(cap) || cap <= 0) return false

  const sb = getServiceSalesSupabase()
  if (!sb) return false

  try {
    const { count, error } = await sb
      .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
      .select("id", { count: "exact", head: true })
      .eq("status", "running")

    if (error) {
      console.warn("[host-admission] running-job count failed; admitting:", error.message)
      return false
    }
    return (count ?? 0) >= cap
  } catch (e) {
    console.warn("[host-admission] admission check failed; admitting:", e)
    return false
  }
}

/** Parsed admission cap (or null when the gate is disabled). Exposed for diagnostics/tests. */
export function admissionCap(): number | null {
  const cap = Number.parseInt(process.env.ADMISSION_MAX_RUNNING_JOBS ?? "", 10)
  return Number.isFinite(cap) && cap > 0 ? cap : null
}
