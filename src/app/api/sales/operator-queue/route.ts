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
    const status = url.searchParams.get("status") ?? "open"
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1), 200)
    const region = url.searchParams.get("region")

    let query = sb
      .from(DB_TABLES.SALES_OPERATOR_QUEUE_ITEMS)
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit)

    if (["open", "in_progress", "resolved", "cancelled"].includes(status)) {
      query = query.eq("status", status)
    }
    if (region) {
      query = query.eq("region", region)
    }

    const { data, error } = await query
    if (error) {
      console.error("[operator-queue] GET failed:", error.message)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      items: data ?? [],
      total: data?.length ?? 0,
    })
  } catch (e) {
    console.error("[operator-queue] GET fatal:", e instanceof Error ? e.message : String(e))
    return NextResponse.json({ ok: false, error: "Failed to fetch operator queue" }, { status: 500 })
  }
}
