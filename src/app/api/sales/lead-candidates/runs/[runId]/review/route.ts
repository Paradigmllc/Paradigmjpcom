import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { approveLeadCandidateItems, approvePilotRun, recoverStaleLeadCandidatePromotions, rejectLeadCandidateItems } from "@/lib/sales/lead-candidate-review"
import { startHighConfidencePromotion } from "@/lib/sales/lead-candidate-high-confidence-runner"
import { recordLeadOperatorEvent } from "@/lib/sales/lead-operator-audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const BodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("sync_high_confidence"),
    operatorName: z.string().trim().min(2).max(120),
    note: z.string().trim().min(5).max(500),
    confirm: z.literal("SYNC VERIFIED LIST ONLY"),
  }),
  z.object({
    action: z.literal("approve"),
    itemIds: z.array(z.string().uuid()).min(1).max(20),
    operatorName: z.string().trim().min(2).max(120),
    note: z.string().trim().min(3).max(500),
  }),
  z.object({
    action: z.literal("reject"),
    itemIds: z.array(z.string().uuid()).min(1).max(20),
    operatorName: z.string().trim().min(2).max(120),
    note: z.string().trim().min(3).max(500),
  }),
  z.object({
    action: z.literal("approve_pilot"),
    operatorName: z.string().trim().min(2).max(120),
    note: z.string().trim().min(5).max(500),
  }),
  z.object({
    action: z.literal("recover_stale_promotions"),
    operatorName: z.string().trim().min(2).max(120),
    note: z.string().trim().min(3).max(500),
  }),
])

async function notify(title: string, message: string, type: string): Promise<void> {
  try {
    const { notifyBothChannels } = await import("@/lib/notify")
    await notifyBothChannels("sales", { title, message, link: "/ja/admin/lead-factory", type })
  } catch (error) {
    console.error("[lead-candidate-review] notification failed:", error)
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    if (!z.string().uuid().safeParse(runId).success) return NextResponse.json({ ok: false, error: "Invalid run ID" }, { status: 400 })
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
    if (parsed.data.action === "approve_pilot") {
      const result = await approvePilotRun({ runId, operatorName: parsed.data.operatorName, note: parsed.data.note })
      await notify("Lead Factoryパイロット承認", `${result.approvedSources}収集元を量産可能にしました。外部送信は停止中です。`, "lead_factory_pilot_approved")
      return NextResponse.json({ ok: true, ...result })
    }
    if (parsed.data.action === "sync_high_confidence") {
      await recordLeadOperatorEvent({
        runId,
        entityType: "run",
        entityId: runId,
        action: "high_confidence_twenty_sync_requested",
        operatorName: parsed.data.operatorName,
        detail: { note: parsed.data.note, sendEnabled: false, qualification: "official_smb_grounded_product_evidence_or_deepseek_v4_pro_96" },
      })
      const result = startHighConfidencePromotion({ runId, operatorName: parsed.data.operatorName, note: parsed.data.note })
      await notify("高確度LeadのTwenty同期を開始", "公式SMB＋製品根拠一致、またはDeepSeek V4 Pro 96%以上＋根拠引用一致の候補だけを同期します。外部送信0件。", "lead_candidates_high_confidence_sync_started")
      return NextResponse.json({ ok: true, ...result }, { status: 202 })
    }
    if (parsed.data.action === "recover_stale_promotions") {
      const result = await recoverStaleLeadCandidatePromotions({ runId, operatorName: parsed.data.operatorName, note: parsed.data.note })
      await notify("Lead候補の停止同期を復旧", `${result.recovered}件を再確認可能にしました。自動再同期はしていません。`, "lead_candidate_promotions_recovered")
      return NextResponse.json({ ok: true, ...result })
    }
    if (parsed.data.action === "reject") {
      const result = await rejectLeadCandidateItems({ runId, itemIds: parsed.data.itemIds, operatorName: parsed.data.operatorName, note: parsed.data.note })
      await notify("Lead候補を人手除外", `${result.rejected}件を除外、未変更${result.skipped}件。`, "lead_candidates_rejected")
      return NextResponse.json({ ok: true, ...result })
    }
    const result = await approveLeadCandidateItems({ runId, itemIds: parsed.data.itemIds, operatorName: parsed.data.operatorName, note: parsed.data.note })
    await notify("Lead候補を承認・Twenty同期", `${result.approved}件を同期、失敗${result.failed}件、無効${result.invalid.length}件。外部送信0件。`, "lead_candidates_approved")
    const partial = result.failed > 0 || result.invalid.length > 0
    return NextResponse.json({ ok: !partial, ...result }, { status: partial ? 207 : 200 })
  } catch (error) {
    console.error("[lead-candidate-review] request failed:", runId, error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Lead candidate review failed" }, { status: 500 })
  }
}
