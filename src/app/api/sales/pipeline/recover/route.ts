import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { recoverStuckPipelineRuns, getSalesPipelineTriggerConfig } from "@/lib/sales/sales-pipeline-helpers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const sb = getServiceSalesSupabase()
  if (!sb) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 })
  }

  try {
    const body = await req.json().catch(() => ({})) as { maxStuckMinutes?: number }
    const result = await recoverStuckPipelineRuns(sb, body.maxStuckMinutes ?? 30)

    // Re-dispatch recovered runs if Trigger.dev is configured
    const trigger = getSalesPipelineTriggerConfig()
    let dispatched = 0
    if (trigger.endpoint && trigger.secretKey && result.recovered > 0) {
      const { data: runs } = await sb
        .from("sales_pipeline_runs")
        .select("id, company_id")
        .eq("status", "queued")
        .order("created_at", { ascending: true })
        .limit(result.recovered)

      for (const run of runs ?? []) {
        try {
          await fetch(trigger.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${trigger.secretKey}` },
            body: JSON.stringify({ payload: { run_id: run.id, company_id: run.company_id, source: "recovery" }, context: { source: "pipeline-recovery" } }),
          })
          dispatched++
        } catch {
          // dispatch failure is non-fatal
        }
      }
    }

    return NextResponse.json({ ok: true, ...result, dispatched })
  } catch (e) {
    console.error("[pipeline-recover] failed:", e)
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Recovery failed" }, { status: 500 })
  }
}
