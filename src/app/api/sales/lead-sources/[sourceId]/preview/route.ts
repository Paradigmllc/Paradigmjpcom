import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { recordLeadOperatorEvent } from "@/lib/sales/lead-operator-audit"
import { previewLeadSourceConfig } from "@/lib/sales/lead-source-records"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const BodySchema = z.object({ operatorName: z.string().trim().min(2).max(120) })

export async function POST(req: NextRequest, context: { params: Promise<{ sourceId: string }> }) {
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    const { sourceId } = await context.params
    if (!z.string().uuid().safeParse(sourceId).success) return NextResponse.json({ ok: false, error: "Invalid source ID" }, { status: 400 })
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
    await recordLeadOperatorEvent({
      entityType: "source",
      entityId: sourceId,
      action: "preview_requested",
      operatorName: parsed.data.operatorName,
    })
    const preview = await previewLeadSourceConfig(sourceId)
    await recordLeadOperatorEvent({
      entityType: "source",
      entityId: sourceId,
      action: "previewed",
      operatorName: parsed.data.operatorName,
      detail: { rawCount: preview.rawCount, accepted: preview.accepted, rejected: preview.rejected, acceptanceRate: preview.acceptanceRate },
    })
    try {
      const { notifyBothChannels } = await import("@/lib/notify")
      await notifyBothChannels("sales", {
        title: "候補収集元のプレビュー完了",
        message: `候補保存なしで${preview.accepted}件を確認、除外${preview.rejected}件。承認前のため収集ランには使用されません。`,
        link: "/ja/admin/lead-factory",
        type: "lead_source_previewed",
      })
    } catch (error) {
      console.error("[lead-source-preview] notification failed:", error)
    }
    return NextResponse.json({ ok: true, preview })
  } catch (error) {
    console.error("[lead-source-preview] failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Lead source preview failed" }, { status: 500 })
  }
}
