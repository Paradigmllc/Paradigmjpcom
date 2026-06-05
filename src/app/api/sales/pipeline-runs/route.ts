import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import {
  createSalesPipelineRun,
  listSalesPipelineRuns,
  runSalesPipelineLocally,
  dispatchSalesPipelineRun,
  type SalesPipelineSource,
} from "@/lib/sales/sales-pipeline"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const SOURCES = ["sales_os", "twenty", "csv", "manual", "webhook", "batch"] as const

function sourceFrom(value: unknown): SalesPipelineSource {
  return typeof value === "string" && (SOURCES as readonly string[]).includes(value)
    ? (value as SalesPipelineSource)
    : "sales_os"
}

function boolFrom(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

function objectFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? 20)
  const result = await listSalesPipelineRuns(Number.isFinite(limitParam) ? limitParam : 20)
  return NextResponse.json({ ok: result.error === null, salesPipeline: result, error: result.error })
}

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await req.json().catch((error: unknown) => {
      console.error("[sales-pipeline-api] invalid JSON body:", error)
      return {}
    })) as Record<string, unknown>
    const companyId = typeof body.company_id === "string" ? body.company_id.trim() : ""
    if (!companyId) {
      return NextResponse.json({ ok: false, error: "company_id is required" }, { status: 400 })
    }

    const created = await createSalesPipelineRun({
      companyId,
      source: sourceFrom(body.source),
      requireVideo: boolFrom(body.require_video, false),
      autoSyncExternalStudios: boolFrom(body.auto_sync_external_studios, true),
      requestedBy: typeof body.requested_by === "string" ? body.requested_by : "sales-os",
      payload: objectFrom(body.payload),
    })
    if (!created.ok) return NextResponse.json(created, { status: 500 })

    const mode = typeof body.mode === "string" ? body.mode : "local"
    if (mode === "dispatch") {
      const dispatched = await dispatchSalesPipelineRun(created.run.id)
      return NextResponse.json({ ...dispatched, createdRun: created.run }, { status: dispatched.ok ? 200 : 500 })
    }
    if (mode === "create_only") {
      return NextResponse.json(created)
    }

    const result = await runSalesPipelineLocally(created.run.id)
    return NextResponse.json({ ...result, createdRun: created.run }, { status: result.ok ? 200 : 500 })
  } catch (error) {
    console.error("[sales-pipeline-api] failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown sales pipeline error" },
      { status: 500 },
    )
  }
}
