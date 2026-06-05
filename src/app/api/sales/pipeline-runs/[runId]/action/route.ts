import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { dispatchSalesPipelineRun, runSalesPipelineLocally } from "@/lib/sales/sales-pipeline"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ runId: string }> },
) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const { runId } = await ctx.params
  if (!runId) return NextResponse.json({ ok: false, error: "runId required" }, { status: 400 })

  try {
    const body = (await req.json().catch((error: unknown) => {
      console.error("[sales-pipeline-action-api] invalid JSON body:", error)
      return {}
    })) as { action?: unknown }
    const action = typeof body.action === "string" ? body.action : "run_local"
    const result = action === "dispatch"
      ? await dispatchSalesPipelineRun(runId)
      : await runSalesPipelineLocally(runId)
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (error) {
    console.error("[sales-pipeline-action-api] failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown sales pipeline action error" },
      { status: 500 },
    )
  }
}
