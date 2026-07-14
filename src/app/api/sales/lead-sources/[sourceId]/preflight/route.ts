import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import {
  LEAD_SOURCE_PREFLIGHT_MODES,
  runLeadSourcePreflightChunk,
} from "@/lib/sales/lead-source-preflight"
import { recordLeadOperatorEvent } from "@/lib/sales/lead-operator-audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const BodySchema = z.object({
  operatorName: z.string().trim().min(2).max(120),
  mode: z.enum(LEAD_SOURCE_PREFLIGHT_MODES),
})

export async function POST(req: NextRequest, context: { params: Promise<{ sourceId: string }> }) {
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    const { sourceId } = await context.params
    if (!z.string().uuid().safeParse(sourceId).success) return NextResponse.json({ ok: false, error: "Invalid source ID" }, { status: 400 })
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })

    if (parsed.data.mode !== "continue") {
      await recordLeadOperatorEvent({
        entityType: "source",
        entityId: sourceId,
        action: `preflight_${parsed.data.mode}_requested`,
        operatorName: parsed.data.operatorName,
      })
    }
    const result = await runLeadSourcePreflightChunk({ sourceId, mode: parsed.data.mode })
    if (result.summary.completed) {
      await recordLeadOperatorEvent({
        entityType: "source",
        entityId: sourceId,
        action: "preflight_completed",
        operatorName: parsed.data.operatorName,
        detail: { ...result.summary },
      })
      try {
        const { notifyBothChannels } = await import("@/lib/notify")
        await notifyBothChannels("sales", {
          title: "候補サイトの事前検査完了",
          message: `対象${result.summary.total}件 / 利用可${result.summary.eligible}件 / 一時障害${result.summary.retryable}件 / 除外${result.summary.rejected}件。外部送信は実行していません。`,
          link: "/ja/admin/lead-factory",
          type: "lead_source_preflight_completed",
        })
      } catch (error) {
        console.error("[lead-source-preflight] notification failed:", error)
      }
    }
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("[lead-source-preflight] failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Lead source preflight failed" }, { status: 500 })
  }
}
