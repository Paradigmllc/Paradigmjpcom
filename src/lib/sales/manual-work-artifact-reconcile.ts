import "server-only"

import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { restoreManualWorkTwentyHomes } from "./manual-work-artifact-authority"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"

export interface ManualWorkArtifactReconcileResult {
  checked: number
  repaired: number
  skipped: number
  failed: number
  errors: string[]
  sent: 0
}

export async function reconcileManualWorkArtifacts(input: {
  domain?: string
  limit: number
}): Promise<ManualWorkArtifactReconcileResult> {
  const supabase = getServiceSalesSupabase()
  if (!supabase) throw new Error("Sales Supabase is not configured")
  let query = supabase
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_WORK)
    .select("*")
    .in("twenty_sync_status", ["synced", "duplicate"])
    .not("twenty_company_id", "is", null)
    .not("report_url", "is", null)
    .order("updated_at", { ascending: false })
    .limit(Math.max(1, Math.min(input.limit, 100)))
  if (input.domain) query = query.eq("domain", input.domain)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as ManualJapanEntryWorkRow[]
  if (rows.some((row) => row.sent)) throw new Error("Zero-send invariant violation detected")

  const reconciled = await restoreManualWorkTwentyHomes(rows)
  const repaired = reconciled.filter((result) => result.protected).length
  const skipped = reconciled.filter((result) => !result.protected && !result.error).length
  const errors: string[] = []
  for (const result of reconciled) {
    if (result.error) {
      console.error("[manual-work-reconcile] artifact repair failed:", { domain: result.domain, error: result.error })
      errors.push(`${result.domain}: ${result.error}`)
    }
  }
  return {
    checked: rows.length,
    repaired,
    skipped,
    failed: errors.length,
    errors: errors.slice(0, 20),
    sent: 0,
  }
}
