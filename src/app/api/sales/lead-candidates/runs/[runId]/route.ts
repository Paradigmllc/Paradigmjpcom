import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { startLeadCandidateRunFallback } from "@/lib/sales/lead-candidate-runner"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const ITEM_STATUSES = ["discovered", "verified", "scored", "form_missing", "promoted", "failed", "skipped"] as const
const STALE_RUN_MS = 5 * 60_000

function shouldRestartRun(run: Record<string, unknown>): boolean {
  const status = String(run.status ?? "")
  if (!["queued", "running"].includes(status)) return false
  const heartbeat = typeof run.heartbeat_at === "string" ? Date.parse(run.heartbeat_at) : 0
  const started = typeof run.started_at === "string" ? Date.parse(run.started_at) : 0
  const reference = Number.isFinite(heartbeat) && heartbeat > 0 ? heartbeat : started
  return reference > 0 && Date.now() - reference > STALE_RUN_MS
}

export async function GET(req: NextRequest, context: { params: Promise<{ runId: string }> }) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const { runId } = await context.params
    const sb = getServiceSalesSupabase()
    if (!sb) return NextResponse.json({ ok: false, error: "Supabase service_role not configured" }, { status: 503 })

    const { data: run, error } = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).select("*").eq("id", runId).single()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 404 })
    const autoRecovery = shouldRestartRun(run as Record<string, unknown>) ? startLeadCandidateRunFallback(runId) : null

    const itemCounts: Record<string, number> = {}
    for (const status of ITEM_STATUSES) {
      const res = await sb
        .from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS)
        .select("id", { count: "exact", head: true })
        .eq("run_id", runId)
        .eq("status", status)
      itemCounts[status] = res.count ?? 0
    }

    const { data: recentFailures } = await sb
      .from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS)
      .select("domain, error_message, attempts, updated_at")
      .eq("run_id", runId)
      .eq("status", "failed")
      .order("updated_at", { ascending: false })
      .limit(20)

    const { data: recentItems, error: itemsError } = await sb
      .from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS)
      .select("domain, status, opportunity_score, form_url, form_method, form_confidence, form_verified, form_qualification_reason, twenty_synced, updated_at")
      .eq("run_id", runId)
      .order("updated_at", { ascending: false })
      .limit(100)
    if (itemsError) console.error("[lead-candidates/runs] recent items failed:", itemsError.message)

    return NextResponse.json({ ok: true, run, itemCounts, recentItems: recentItems ?? [], recentFailures: recentFailures ?? [], autoRecovery })
  } catch (error) {
    console.error("[lead-candidates/runs] status request failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Run status request failed" }, { status: 500 })
  }
}
