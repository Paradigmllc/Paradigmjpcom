import "server-only"

import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { restoreManualWorkTwentyHome } from "./manual-work-artifact-authority"

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
    .select("domain,twenty_company_id,sent")
    .in("twenty_sync_status", ["synced", "duplicate"])
    .not("twenty_company_id", "is", null)
    .not("report_url", "is", null)
    .order("updated_at", { ascending: false })
    .limit(Math.max(1, Math.min(input.limit, 100)))
  if (input.domain) query = query.eq("domain", input.domain)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as Array<{ domain: string; twenty_company_id: string; sent: boolean }>
  if (rows.some((row) => row.sent)) throw new Error("Zero-send invariant violation detected")

  let cursor = 0
  let repaired = 0
  let skipped = 0
  const errors: string[] = []
  const worker = async () => {
    while (cursor < rows.length) {
      const row = rows[cursor]
      cursor += 1
      try {
        const restored = await restoreManualWorkTwentyHome({
          twentyCompanyId: row.twenty_company_id,
          domain: row.domain,
        })
        if (restored.protected) repaired += 1
        else skipped += 1
      } catch (restoreError) {
        console.error("[manual-work-reconcile] artifact repair failed:", { domain: row.domain, error: restoreError })
        errors.push(`${row.domain}: ${restoreError instanceof Error ? restoreError.message : "unknown error"}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, rows.length) }, () => worker()))
  return {
    checked: rows.length,
    repaired,
    skipped,
    failed: errors.length,
    errors: errors.slice(0, 20),
    sent: 0,
  }
}
