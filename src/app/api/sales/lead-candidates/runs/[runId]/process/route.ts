import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { assertEvidenceFirstLeadCandidateRun, markLeadCandidateRunFailed, processLeadCandidateRun } from "@/lib/sales/lead-candidate-runs"
import { startLeadCandidateRunFallback } from "@/lib/sales/lead-candidate-runner"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const BodySchema = z.object({
  async: z.boolean().optional(),
  batchSize: z.number().int().min(1).max(250).optional(),
  maxBatches: z.number().int().min(1).max(20).optional(),
})

async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json()
  } catch (error) {
    console.warn("[lead-candidates/runs/process] empty or invalid JSON body:", error)
    return {}
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Lead candidate run processing failed"
}

export async function POST(req: NextRequest, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const parsed = BodySchema.safeParse(await readJson(req))
    if (!parsed.success) {
      console.error("[lead-candidates/runs/process] invalid body:", parsed.error)
      return NextResponse.json({ ok: false, error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
    }

    await assertEvidenceFirstLeadCandidateRun(runId)

    if (parsed.data.async !== false) {
      const fallback = startLeadCandidateRunFallback(runId)
      return NextResponse.json({ ok: true, runId, mode: "async", ...fallback }, { status: 202 })
    }

    const result = await processLeadCandidateRun(runId, {
      batchSize: parsed.data.batchSize,
      maxBatches: parsed.data.maxBatches,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("[lead-candidates/runs/process] request failed:", runId, error)
    const message = toErrorMessage(error)
    if (message.startsWith("Legacy lead candidate runs cannot be processed")) {
      return NextResponse.json({ ok: false, error: message }, { status: 409 })
    }
    await markLeadCandidateRunFailed(runId, error).catch((markError) => {
      console.error("[lead-candidates/runs/process] failed to mark run failed:", runId, markError)
    })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
