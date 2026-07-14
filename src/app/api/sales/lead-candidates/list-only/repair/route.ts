import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { inspectAndRepairListLeadSync } from "@/lib/sales/list-lead-sync-repair"
import { recordLeadOperatorEvent } from "@/lib/sales/lead-operator-audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const BodySchema = z.object({
  action: z.enum(["preview", "repair"]),
  operatorName: z.string().trim().min(2).max(120),
  limit: z.number().int().min(1).max(200).default(100),
})

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
    if (parsed.data.action === "preview") {
      const result = await inspectAndRepairListLeadSync({ dryRun: true, limit: parsed.data.limit })
      return NextResponse.json({ ok: true, mode: "preview", ...result })
    }

    const preview = await inspectAndRepairListLeadSync({ dryRun: true, limit: parsed.data.limit })
    for (const anomaly of preview.anomalies) {
      await recordLeadOperatorEvent({
        entityType: "item",
        entityId: anomaly.companyId,
        action: "list_lead_repair_requested",
        operatorName: parsed.data.operatorName,
        detail: { domain: anomaly.domain, reasons: anomaly.reasons },
      })
    }
    const result = await inspectAndRepairListLeadSync({ dryRun: false, limit: parsed.data.limit })
    for (const anomaly of result.anomalies) {
      await recordLeadOperatorEvent({
        entityType: "item",
        entityId: anomaly.companyId,
        action: anomaly.repaired ? "list_lead_repaired" : "list_lead_repair_failed",
        operatorName: parsed.data.operatorName,
        detail: { domain: anomaly.domain, reasons: anomaly.reasons, error: anomaly.error },
      })
    }
    try {
      const { notifyBothChannels } = await import("@/lib/notify")
      await notifyBothChannels("sales", {
        title: "Japan Entry候補のTwenty整合性修復",
        message: `${result.repaired}/${result.drifted}件をlist-only形式へ修復。失敗${result.failed}件、外部送信0件。`,
        link: "/ja/admin/lead-factory",
        type: "list_lead_twenty_repaired",
      })
    } catch (error) {
      console.error("[list-only-repair] notification failed:", error)
    }
    const partial = result.failed > 0
    return NextResponse.json({ ok: !partial, mode: "repair", ...result }, { status: partial ? 207 : 200 })
  } catch (error) {
    console.error("[list-only-repair] failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "List-only Twenty repair failed" }, { status: 500 })
  }
}
