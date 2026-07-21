import "server-only"

import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { restoreManualWorkTwentyHomes } from "./manual-work-artifact-authority"
import { isManualJapanEntryReportData } from "./manual-japan-entry-report-types"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"

export interface ManualWorkArtifactReconcileResult {
  checked: number
  repaired: number
  skipped: number
  failed: number
  errors: string[]
  currentReports: number
  legacyReports: number
  sent: 0
}

interface ManualReportReadBack {
  id: string
  domain: string
  report_data: unknown
}

async function readBackReports(rows: ManualJapanEntryWorkRow[]): Promise<ManualReportReadBack[]> {
  const supabase = getServiceSalesSupabase()
  if (!supabase) throw new Error("Sales Supabase is not configured")
  const readBack: ManualReportReadBack[] = []
  for (let start = 0; start < rows.length; start += 100) {
    const ids = rows.slice(start, start + 100).map((row) => row.id)
    const { data, error } = await supabase
      .from(DB_TABLES.MANUAL_JAPAN_ENTRY_WORK)
      .select("id,domain,report_data")
      .in("id", ids)
    if (error) throw new Error(error.message)
    for (const value of data ?? []) {
      const record = value as Record<string, unknown>
      if (typeof record.id !== "string" || typeof record.domain !== "string") continue
      readBack.push({ id: record.id, domain: record.domain, report_data: record.report_data })
    }
  }
  return readBack
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
    .not("report_url", "is", null)
    .order("updated_at", { ascending: false })
    .limit(Math.max(1, Math.min(input.limit, 500)))
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
  const reportReadBack = await readBackReports(rows)
  const byId = new Map(reportReadBack.map((report) => [report.id, report]))
  let currentReports = 0
  for (const source of rows) {
    const persisted = byId.get(source.id)
    if (!persisted) {
      errors.push(`${source.domain}: report row was omitted from database read-back`)
      continue
    }
    if (!isManualJapanEntryReportData(persisted.report_data)) {
      errors.push(`${source.domain}: legacy or invalid report remained after reconciliation`)
      continue
    }
    currentReports += 1
  }
  const uniqueErrors = [...new Set(errors)]
  return {
    checked: rows.length,
    repaired,
    skipped,
    failed: uniqueErrors.length,
    errors: uniqueErrors.slice(0, 20),
    currentReports,
    legacyReports: rows.length - currentReports,
    sent: 0,
  }
}
