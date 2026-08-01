import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { assertEvidenceFirstLeadCandidateRun, markLeadCandidateRunFailed, processLeadCandidateRun } from "@/lib/sales/lead-candidate-runs"
import { startLeadCandidateRunFallback } from "@/lib/sales/lead-candidate-runner"
import { recordLeadOperatorEvent } from "@/lib/sales/lead-operator-audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const BodySchema = z.object({
  async: z.boolean().optional(),
  batchSize: z.number().int().min(1).max(250).optional(),
  maxBatches: z.number().int().min(1).max(20).optional(),
  operatorName: z.string().trim().min(2).max(120),
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
      await recordLeadOperatorEvent({ runId, entityType: "run", entityId: runId, action: "manual_resume_async", operatorName: parsed.data.operatorName, detail: { fallback } })
      try {
        const { notifyBothChannels } = await import("@/lib/notify")
        await notifyBothChannels("sales", { title: "Lead Factoryラン再開", message: `${runId}を非同期で再開。Twenty同期・外部送信は実行しません。`, link: "/ja/admin/lead-factory", type: "lead_factory_run_resumed" })
      } catch (error) {
        console.error("[lead-candidates/runs/process] async resume notification failed:", error)
      }
      return NextResponse.json({ ok: true, runId, mode: "async", ...fallback }, { status: 202 })
    }

    const result = await processLeadCandidateRun(runId, {
      batchSize: parsed.data.batchSize,
      maxBatches: parsed.data.maxBatches,
    })
    await recordLeadOperatorEvent({ runId, entityType: "run", entityId: runId, action: "manual_resume_sync", operatorName: parsed.data.operatorName, detail: { processed: result.processed, hasMore: result.hasMore } })
    try {
      const { notifyBothChannels } = await import("@/lib/notify")
      await notifyBothChannels("sales", { title: "Lead Factoryラン復旧", message: `${runId}を${result.processed}件復旧。Twenty同期・外部送信は0件です。`, link: "/ja/admin/lead-factory", type: "lead_factory_run_recovered" })
    } catch (error) {
      console.error("[lead-candidates/runs/process] sync resume notification failed:", error)
    }
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
