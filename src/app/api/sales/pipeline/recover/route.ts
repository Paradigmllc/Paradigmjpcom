import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { recoverStuckPipelineRuns } from "@/lib/sales/sales-pipeline-helpers"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { startSalesPipelineRunFallback } from "@/lib/sales/sales-pipeline-fallback"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const sb = getServiceSalesSupabase()
  if (!sb) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 })
  }

  try {
    let body = { maxStuckMinutes: undefined } as { maxStuckMinutes?: number }
    try {
      body = await req.json() as { maxStuckMinutes?: number }
    } catch (parseError) {
      console.warn("[pipeline-recover] request body parse failed; using defaults:", parseError)
    }
    const result = await recoverStuckPipelineRuns(sb, body.maxStuckMinutes ?? 30)

    let dispatched = 0
    if (result.recovered > 0) {
      const { data: runs } = await sb
        .from(DB_TABLES.SALES_PIPELINE_RUNS)
        .select("id, company_id")
        .eq("status", "queued")
        .order("created_at", { ascending: true })
        .limit(result.recovered)

      for (const run of runs ?? []) {
        try {
          await startSalesPipelineRunFallback(run.id)
          dispatched++
        } catch (e) {
          console.warn("[pipeline-recover] local dispatch failed:", e)
        }
      }
    }

    return NextResponse.json({ ok: true, ...result, dispatched })
  } catch (e) {
    console.error("[pipeline-recover] failed:", e)
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Recovery failed" }, { status: 500 })
  }
}
