import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const sb = getServiceSalesSupabase()
    if (!sb) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 })

    const url = new URL(req.url)
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 1), 100)
    const region = url.searchParams.get("region")

    const buildQuery = (select: string) => sb
      .from(DB_TABLES.SALES_ACTIVITY_LOG)
      .select(select)
      .in("activity_type", ["form_outreach", "reply_received", "reply_classified"])
      .order("occurred_at", { ascending: false })
      .limit(limit)

    let query = buildQuery("id, company_id, pipeline_run_id, activity_type, result, subject, occurred_at, meta")
    if (region) {
      query = query.eq("region", region)
    }

    let { data, error } = await query
    if (error && error.message.includes("pipeline_run_id")) {
      console.warn("[outreach-runs] sales_activity_log.pipeline_run_id is not available; retrying without optional column")
      let retry = buildQuery("id, company_id, activity_type, result, subject, occurred_at, meta")
      if (region) retry = retry.eq("region", region)
      const retryResult = await retry
      data = retryResult.data
      error = retryResult.error
    }
    if (error) {
      console.error("[outreach-runs] GET failed:", error.message)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    // Group by company for batch view
    const byCompany = new Map<string, Array<Record<string, unknown>>>()
    const rows = (data ?? []) as unknown as Array<Record<string, unknown>>
    for (const row of rows) {
      const cid = row.company_id ?? "unknown"
      const companyId = typeof cid === "string" ? cid : "unknown"
      if (!byCompany.has(companyId)) byCompany.set(companyId, [])
      byCompany.get(companyId)!.push(row)
    }

    return NextResponse.json({
      ok: true,
      items: rows,
      total: rows.length,
      groupedByCompany: Object.fromEntries(byCompany),
    })
  } catch (e) {
    console.error("[outreach-runs] GET fatal:", e instanceof Error ? e.message : String(e))
    return NextResponse.json({ ok: false, error: "Failed to fetch outreach runs" }, { status: 500 })
  }
}
