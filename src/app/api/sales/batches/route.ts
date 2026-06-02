import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { createLeadBatch, listLeadBatches, type LeadBatchCsvRow } from "@/lib/sales/monthly-batch"
import { salesScopeFromCountry, salesScopeFromLocale } from "@/lib/sales/locale-scope"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

interface CreateBody {
  name?: string | null
  rows?: LeadBatchCsvRow[]
  report_locale?: string | null
  target_country?: string | null
  source?: string | null
  enrich?: boolean
  min_outreach_score?: number
  max_outreach_ready?: number
  dry_run_only?: boolean
}

function isRowArray(value: unknown): value is LeadBatchCsvRow[] {
  return Array.isArray(value) && value.every((row) => row && typeof row === "object" && !Array.isArray(row))
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "lead batch request failed"
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const scope = salesScopeFromLocale(req.nextUrl.searchParams.get("locale") ?? "ja")
    const limit = Math.max(1, Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 8), 20))
    const result = await listLeadBatches(scope, limit)
    return NextResponse.json(result, { status: result.ok ? 200 : 503 })
  } catch (error) {
    console.error("[sales-batches] GET failed:", error)
    return NextResponse.json({ ok: false, error: errorMessage(error), batches: [] }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    let body: CreateBody
    try {
      body = (await req.json()) as CreateBody
    } catch (error) {
      console.error("[sales-batches] invalid JSON body:", error)
      return NextResponse.json({ ok: false, error: "invalid json body" }, { status: 400 })
    }

    if (!isRowArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "rows[] required" }, { status: 400 })
    }
    if (body.rows.length > 2000) {
      return NextResponse.json({ ok: false, error: "max 2000 rows per batch request; split larger lists into chunks" }, { status: 400 })
    }

    const scope = salesScopeFromCountry({
      reportLocale: body.report_locale,
      targetCountry: body.target_country,
    })
    const result = await createLeadBatch({
      name: body.name,
      rows: body.rows,
      reportLocale: scope.reportLocale,
      targetCountry: scope.targetCountry,
      source: body.source,
      enrich: body.enrich,
      minOutreachScore: body.min_outreach_score,
      maxOutreachReady: body.max_outreach_ready,
      dryRunOnly: body.dry_run_only,
    })
    return NextResponse.json(result, { status: result.ok ? 200 : 503 })
  } catch (error) {
    console.error("[sales-batches] POST failed:", error)
    return NextResponse.json({ ok: false, error: errorMessage(error) }, { status: 500 })
  }
}
