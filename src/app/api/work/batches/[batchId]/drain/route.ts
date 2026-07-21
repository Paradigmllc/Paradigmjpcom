import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import {
  claimManualWorkBatchItems,
  completeManualWorkBatchItem,
  getManualWorkBatch,
  markManualWorkBatchNotified,
  refreshManualWorkBatch,
} from "@/lib/sales/manual-japan-entry-batch-store"
import { isManualWorkBatchTerminal, type ManualWorkBatchItemStatus } from "@/lib/sales/manual-japan-entry-batch-types"
import { processManualJapanEntryUrl } from "@/lib/sales/manual-japan-entry-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const paramsSchema = z.object({ batchId: z.string().uuid() })

function completedStatus(status: string): Exclude<ManualWorkBatchItemStatus, "queued" | "processing"> {
  if (status === "completed" || status === "needs_review" || status === "rejected" || status === "duplicate") return status
  return "failed"
}

async function notifyCompleted(batchId: string, total: number, failed: number): Promise<void> {
  try {
    const { notifyBothChannels } = await import("@/lib/notify")
    await notifyBothChannels("sales", {
      title: "Manual Japan Entryバッチ完了",
      message: `${total}件の解析を完了（失敗${failed}件）。Twenty同期結果は/workで確認できます。外部送信0件。`,
      link: "/work",
      type: "manual_japan_entry_batch_completed",
      region: "global",
    })
    await markManualWorkBatchNotified(batchId)
  } catch (error) {
    console.error("[api/work/batches/drain] completion notification failed:", error)
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ batchId: string }> }) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const params = paramsSchema.safeParse(await context.params)
  if (!params.success) return NextResponse.json({ ok: false, error: "有効なバッチIDが必要です" }, { status: 400 })
  try {
    const before = await getManualWorkBatch(params.data.batchId)
    if (!before) return NextResponse.json({ ok: false, error: "バッチが見つかりません" }, { status: 404 })
    if (isManualWorkBatchTerminal(before.batch.status)) {
      return NextResponse.json({ ok: true, claimed: 0, snapshot: before })
    }

    const claimed = await claimManualWorkBatchItems(before.batch.id)
    await Promise.all(claimed.map(async (item) => {
      if (!item.claim_token) throw new Error(`Batch item ${item.id} did not receive a claim token`)
      try {
        const result = await processManualJapanEntryUrl(
          item.canonical_url,
          before.batch.message_variant_requested,
          before.batch.message_angle_requested,
          {
            sourceSlug: before.batch.source_slug,
            sourcePageUrl: before.batch.source_page_url,
            observedOn: before.batch.observed_on,
          },
        )
        await completeManualWorkBatchItem({
          itemId: item.id,
          claimToken: item.claim_token,
          status: completedStatus(result.item.status),
          workId: result.item.id,
          errorMessage: result.item.error_message,
        })
      } catch (error) {
        console.error("[api/work/batches/drain] item failed:", { batchId: before.batch.id, itemId: item.id, error })
        await completeManualWorkBatchItem({
          itemId: item.id,
          claimToken: item.claim_token,
          status: "failed",
          workId: null,
          errorMessage: error instanceof Error ? error.message.slice(0, 2_000) : "解析に失敗しました",
        })
      }
    }))
    const refreshed = await refreshManualWorkBatch(before.batch.id)
    if (isManualWorkBatchTerminal(refreshed.batch.status) && !refreshed.batch.notified_at) {
      await notifyCompleted(refreshed.batch.id, refreshed.batch.total_count, refreshed.counts.failed)
    }
    return NextResponse.json({ ok: true, claimed: claimed.length, snapshot: refreshed }, { status: refreshed.remaining > 0 ? 202 : 200 })
  } catch (error) {
    console.error("[api/work/batches/drain] failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "バッチ処理に失敗しました" },
      { status: 500 },
    )
  }
}
