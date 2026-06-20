import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { runSalesPipelineEventDrain } from "@/lib/sales/sales-pipeline-watchdog"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

interface PipelineTickBody {
  enrichment_limit?: number
  recover_stale_runs?: boolean
  include_twenty_sync?: boolean
  include_report_regenerator?: boolean
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}

function optionalLimit(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : undefined
}

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  let body: PipelineTickBody = {}
  try {
    body = (await req.json()) as PipelineTickBody
  } catch (error) {
    console.warn("[pipeline-tick] request body parse failed; using defaults:", error)
  }

  try {
    const result = await runSalesPipelineEventDrain({
      enrichmentLimit: optionalLimit(body.enrichment_limit),
      recoverStaleRuns: optionalBoolean(body.recover_stale_runs),
      includeTwentySync: optionalBoolean(body.include_twenty_sync),
      includeReportRegenerator: optionalBoolean(body.include_report_regenerator),
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("[pipeline-tick] failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "pipeline tick failed" },
      { status: 500 },
    )
  }
}
