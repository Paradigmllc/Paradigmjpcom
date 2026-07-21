import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import {
  claimManualWorkBatchDrain,
  claimManualWorkBatchItems,
  completeManualWorkBatchItem,
  getManualWorkBatch,
  markManualWorkBatchNotified,
  promoteNextManualWorkBatch,
  refreshManualWorkBatch,
  releaseManualWorkBatchDrain,
} from "@/lib/sales/manual-japan-entry-batch-store"
import {
  isManualWorkBatchTerminal,
  type ManualWorkBatchItemStatus,
  type ManualWorkBatchSnapshot,
} from "@/lib/sales/manual-japan-entry-batch-types"
import { processManualJapanEntryUrl } from "@/lib/sales/manual-japan-entry-service"
import { scheduleManualWorkBatchDrain } from "@/lib/sales/manual-japan-entry-batch-schedule"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const paramsSchema = z.object({ batchId: z.string().uuid() })
const bodySchema = z.object({ automated: z.boolean().default(false) }).strict()

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
  let automated = false
  try {
    const raw = await req.text()
    if (raw) automated = bodySchema.parse(JSON.parse(raw)).automated
  } catch (error) {
    console.error("[api/work/batches/drain] invalid body:", error)
    return NextResponse.json({ ok: false, error: "JSON bodyが不正です" }, { status: 400 })
  }
  try {
    let before = await getManualWorkBatch(params.data.batchId)
    if (!before) return NextResponse.json({ ok: false, error: "バッチが見つかりません" }, { status: 404 })
    if (isManualWorkBatchTerminal(before.batch.status)) {
      return NextResponse.json({ ok: true, claimed: 0, snapshot: before })
    }
    if (before.batch.status === "queued") {
      const active = await promoteNextManualWorkBatch()
      if (!active || active.snapshot.batch.id !== before.batch.id) {
        return NextResponse.json({ ok: true, claimed: 0, queued: true, snapshot: before }, { status: 202 })
      }
      before = active.snapshot
    }

    const runningBatch = before
    const drainClaimToken = await claimManualWorkBatchDrain(runningBatch.batch.id)
    if (!drainClaimToken) {
      return NextResponse.json({ ok: true, claimed: 0, processing: true, snapshot: runningBatch }, { status: 202 })
    }

    let released = false
    let claimedCount = 0
    let refreshed: ManualWorkBatchSnapshot
    try {
      const claimed = await claimManualWorkBatchItems(runningBatch.batch.id)
      claimedCount = claimed.length
      await Promise.all(claimed.map(async (item) => {
        if (!item.claim_token) throw new Error(`Batch item ${item.id} did not receive a claim token`)
        try {
          const result = await processManualJapanEntryUrl(
            item.canonical_url,
            runningBatch.batch.message_variant_requested,
            runningBatch.batch.message_angle_requested,
            {
              sourceSlug: runningBatch.batch.source_slug,
              sourcePageUrl: runningBatch.batch.source_page_url,
              observedOn: runningBatch.batch.observed_on,
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
          console.error("[api/work/batches/drain] item failed:", { batchId: runningBatch.batch.id, itemId: item.id, error })
          await completeManualWorkBatchItem({
            itemId: item.id,
            claimToken: item.claim_token,
            status: "failed",
            workId: null,
            errorMessage: error instanceof Error ? error.message.slice(0, 2_000) : "解析に失敗しました",
          })
        }
      }))
      refreshed = await refreshManualWorkBatch(runningBatch.batch.id)
      await releaseManualWorkBatchDrain(runningBatch.batch.id, drainClaimToken)
      released = true
    } finally {
      if (!released) {
        try {
          await releaseManualWorkBatchDrain(runningBatch.batch.id, drainClaimToken)
        } catch (releaseError) {
          console.error("[api/work/batches/drain] drain claim release failed:", releaseError)
        }
      }
    }
    if (isManualWorkBatchTerminal(refreshed.batch.status) && !refreshed.batch.notified_at) {
      await notifyCompleted(refreshed.batch.id, refreshed.batch.total_count, refreshed.counts.failed)
    }
    if (refreshed.remaining === 0) {
      const next = await promoteNextManualWorkBatch()
      if (next?.promoted) scheduleManualWorkBatchDrain(next.snapshot.batch.id)
    } else if (automated) {
      scheduleManualWorkBatchDrain(refreshed.batch.id)
    }
    return NextResponse.json({ ok: true, claimed: claimedCount, snapshot: refreshed }, { status: refreshed.remaining > 0 ? 202 : 200 })
  } catch (error) {
    console.error("[api/work/batches/drain] failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "バッチ処理に失敗しました" },
      { status: 500 },
    )
  }
}
