import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { enqueueCompanyEnrichment } from "@/lib/sales/enrichment-jobs"
import { z } from "zod"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const BulkBodySchema = z.object({
  companyIds: z.array(z.string()).min(1).max(100),
  action: z.enum(["change_status", "enrich", "assign", "delete"]),
  status: z.string().optional(),
  assignedTo: z.string().optional(),
})

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 })

  let body: z.infer<typeof BulkBodySchema>
  try {
    body = BulkBodySchema.parse(await req.json())
  } catch (e) {
    console.error("[bulk-companies] invalid body:", e)
    return NextResponse.json({ ok: false, error: "Invalid request body", details: e instanceof z.ZodError ? e.flatten() : undefined }, { status: 400 })
  }

  const results: { succeeded: number; failed: number; enriched: number } = { succeeded: 0, failed: 0, enriched: 0 }

  switch (body.action) {
    case "change_status": {
      if (!body.status) return NextResponse.json({ ok: false, error: "status is required for change_status" }, { status: 400 })
      const { error } = await sb
        .from(DB_TABLES.SALES_COMPANIES)
        .update({ pipeline_status: body.status })
        .in("id", body.companyIds)
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      results.succeeded = body.companyIds.length
      break
    }

    case "enrich": {
      for (const id of body.companyIds) {
        const enqueue = await enqueueCompanyEnrichment({
          companyId: id,
          source: "bulk_enrich",
          triggeredBy: "bulk_operation",
          priority: 70,
        })
        if (enqueue.ok) results.enriched++
        else results.failed++
      }
      break
    }

    case "assign": {
      if (!body.assignedTo) return NextResponse.json({ ok: false, error: "assignedTo is required for assign" }, { status: 400 })
      const { error } = await sb
        .from(DB_TABLES.SALES_COMPANIES)
        .update({ assigned_to: body.assignedTo })
        .in("id", body.companyIds)
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      results.succeeded = body.companyIds.length
      break
    }

    case "delete": {
      const { error } = await sb
        .from(DB_TABLES.SALES_COMPANIES)
        .delete()
        .in("id", body.companyIds)
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      results.succeeded = body.companyIds.length
      break
    }

    default:
      return NextResponse.json({ ok: false, error: `Unknown action: ${body.action}` }, { status: 400 })
  }

  return NextResponse.json({ ok: true, ...results })
}
