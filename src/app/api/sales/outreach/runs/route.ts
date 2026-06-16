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

    let query = sb
      .from(DB_TABLES.SALES_ACTIVITY_LOG)
      .select("id, company_id, pipeline_run_id, activity_type, result, subject, occurred_at, meta")
      .in("activity_type", ["form_outreach", "reply_received", "reply_classified"])
      .order("occurred_at", { ascending: false })
      .limit(limit)

    if (region) {
      query = query.eq("region", region)
    }

    const { data, error } = await query
    if (error) {
      console.error("[outreach-runs] GET failed:", error.message)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    // Group by company for batch view
    const byCompany = new Map<string, Array<Record<string, unknown>>>()
    for (const row of (data ?? [])) {
      const cid = row.company_id ?? "unknown"
      if (!byCompany.has(cid)) byCompany.set(cid, [])
      byCompany.get(cid)!.push(row)
    }

    return NextResponse.json({
      ok: true,
      items: data ?? [],
      total: data?.length ?? 0,
      groupedByCompany: Object.fromEntries(byCompany),
    })
  } catch (e) {
    console.error("[outreach-runs] GET fatal:", e instanceof Error ? e.message : String(e))
    return NextResponse.json({ ok: false, error: "Failed to fetch outreach runs" }, { status: 500 })
  }
}
