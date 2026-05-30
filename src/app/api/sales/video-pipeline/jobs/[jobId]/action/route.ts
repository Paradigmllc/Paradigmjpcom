import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { runVideoJobAction } from "@/lib/sales/video-pipeline"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

const ACTIONS = ["dispatch", "approve_render", "request_revision", "complete", "fail", "cancel"] as const
type JobAction = (typeof ACTIONS)[number]

function isJobAction(value: unknown): value is JobAction {
  return typeof value === "string" && (ACTIONS as readonly string[]).includes(value)
}

export async function POST(req: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { jobId } = await context.params
    const body = (await req.json()) as { action?: unknown; output_url?: unknown; note?: unknown }
    if (!jobId) return NextResponse.json({ ok: false, error: "jobId is required" }, { status: 400 })
    if (!isJobAction(body.action)) {
      return NextResponse.json({ ok: false, error: "action is invalid" }, { status: 400 })
    }

    const result = await runVideoJobAction({
      jobId,
      action: body.action,
      outputUrl: typeof body.output_url === "string" ? body.output_url : null,
      note: typeof body.note === "string" ? body.note : null,
    })
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (error) {
    console.error("[sales-video-pipeline-api] action failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown video pipeline action error" },
      { status: 500 },
    )
  }
}
