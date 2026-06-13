import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { syncCompanyKarteToTwenty } from "@/lib/sales/twenty-sync-companies"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json() as { company_id?: string; limit?: number }
    const limit = Math.max(1, Math.min(50, body.limit ?? 10))

    // Sync companies directly to Twenty
    const { getServiceSalesSupabase } = await import("@/lib/supabase")
    const { DB_TABLES } = await import("@/lib/sales/db-tables")
    const sb = getServiceSalesSupabase()
    if (!sb) return NextResponse.json({ ok: false, error: "DB not configured" }, { status: 503 })

    const query = sb.from(DB_TABLES.SALES_COMPANIES).select("id,company_name,domain").eq("pipeline_status", "report_ready").order("created_at", { ascending: false }).limit(limit)
    const { data: companies, error } = body.company_id
      ? await sb.from(DB_TABLES.SALES_COMPANIES).select("id,company_name,domain").eq("id", body.company_id).limit(1)
      : await query

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    if (!companies?.length) return NextResponse.json({ ok: false, error: "No companies found" }, { status: 404 })

    let synced = 0
    let failed = 0
    const errors: string[] = []

    for (const company of companies) {
      const result = await syncCompanyKarteToTwenty(company.id)
      if (result.ok) synced++
      else {
        failed++
        if (result.error) errors.push(`${company.domain}: ${result.error}`)
      }
    }

    return NextResponse.json({ ok: true, synced, failed, errors: errors.slice(0, 10) })
  } catch (error) {
    console.error("[twenty-sync] failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "sync failed" }, { status: 500 })
  }
}
