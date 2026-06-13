import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { runEnrichmentJobs } from "@/lib/sales/enrichment-jobs-runner"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    let limit = 3
    try {
      const body = await req.json() as { limit?: number }
      if (body.limit && typeof body.limit === "number") {
        limit = Math.max(1, Math.min(5, Math.round(body.limit)))
      }
    } catch {
      // Use default limit
    }

    const result = await runEnrichmentJobs(limit)
    return NextResponse.json(result, { status: result.ok ? 200 : 503 })
  } catch (error) {
    console.error("[sales-enrichment-run] failed:", error)
    return NextResponse.json({ ok: false, processed: 0, completed: 0, failed: 0, errors: [error instanceof Error ? error.message : "enrichment run failed"] }, { status: 500 })
  }
}
