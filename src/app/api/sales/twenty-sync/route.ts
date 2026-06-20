import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { syncCompanyKarteToTwenty } from "@/lib/sales/twenty-sync-companies"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

interface TwentySyncRequestBody {
  company_id?: string
  limit?: number
  cursor_created_at?: string
  statuses?: string[]
  include_all_statuses?: boolean
}

function safeLimit(input: number | undefined, singleCompany: boolean): number {
  if (singleCompany) return 1
  const parsed = typeof input === "number" && Number.isFinite(input) ? Math.round(input) : 25
  return Math.max(1, Math.min(parsed, 60))
}

function safeStatuses(body: TwentySyncRequestBody): string[] | null {
  if (body.include_all_statuses === true) return null
  if (!Array.isArray(body.statuses) || body.statuses.length === 0) return ["report_ready"]
  const values = body.statuses
    .filter((status): status is string => typeof status === "string" && status.trim().length > 0)
    .map((status) => status.trim())
    .slice(0, 10)
  return values.length > 0 ? values : ["report_ready"]
}

function safeCursor(input: string | undefined): string | null {
  if (!input) return null
  const date = new Date(input)
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json() as TwentySyncRequestBody
    const limit = safeLimit(body.limit, Boolean(body.company_id))
    const cursorCreatedAt = safeCursor(body.cursor_created_at)
    const statuses = safeStatuses(body)

    // Sync companies directly to Twenty
    const { getServiceSalesSupabase } = await import("@/lib/supabase")
    const { DB_TABLES } = await import("@/lib/sales/db-tables")
    const sb = getServiceSalesSupabase()
    if (!sb) return NextResponse.json({ ok: false, error: "DB not configured" }, { status: 503 })

    let query = sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("id,company_name,domain,created_at")
      .order("created_at", { ascending: false })
      .limit(limit)
    if (statuses) query = query.in("pipeline_status", statuses)
    if (cursorCreatedAt) query = query.lt("created_at", cursorCreatedAt)

    const { data: companies, error } = body.company_id
      ? await sb.from(DB_TABLES.SALES_COMPANIES).select("id,company_name,domain,created_at").eq("id", body.company_id).limit(1)
      : await query

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    if (!companies?.length) return NextResponse.json({ ok: false, error: "No companies found" }, { status: 404 })

    let synced = 0
    let failed = 0
    let rateLimited = false
    const errors: string[] = []

    for (const company of companies) {
      const result = await syncCompanyKarteToTwenty(company.id)
      if (result.ok) synced++
      else {
        failed++
        if (result.error) errors.push(`${company.domain}: ${result.error}`)
        if (/429|limit reached|rate limit/i.test(result.error ?? "")) {
          rateLimited = true
          break
        }
      }
    }

    const lastCompany = companies[companies.length - 1]
    const nextCursor = !body.company_id && companies.length === limit && !rateLimited
      ? lastCompany?.created_at ?? null
      : null

    return NextResponse.json({
      ok: true,
      synced,
      failed,
      rateLimited,
      limit,
      next_cursor_created_at: nextCursor,
      has_more: Boolean(nextCursor),
      errors: errors.slice(0, 10),
    })
  } catch (error) {
    console.error("[twenty-sync] failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "sync failed" }, { status: 500 })
  }
}
