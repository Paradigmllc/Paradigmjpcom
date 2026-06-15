import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ITEM_STATUSES = ["discovered", "verified", "scored", "promoted", "failed", "skipped"] as const

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

    return NextResponse.json({ ok: true, run, itemCounts, recentFailures: recentFailures ?? [] })
  } catch (error) {
    console.error("[lead-candidates/runs] status request failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Run status request failed" }, { status: 500 })
  }
}
