import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import {
  claimManualWorkBatchDrain,
  claimManualWorkBatchItems,
  completeManualWorkBatchItem,
  getManualWorkBatchCompact,
  markManualWorkBatchNotified,
  promoteNextManualWorkBatch,
  refreshManualWorkBatch,
  releaseManualWorkBatchDrain,
} from "@/lib/sales/manual-japan-entry-batch-store"
import {
  isManualWorkBatchTerminal,
  type ManualWorkBatchItemRow,
  type ManualWorkBatchItemStatus,
  type ManualWorkBatchSnapshot,
} from "@/lib/sales/manual-japan-entry-batch-types"
import { findManualWorkById } from "@/lib/sales/manual-japan-entry-store"
import { processManualJapanEntryUrl } from "@/lib/sales/manual-japan-entry-service"
import { processManualEditorialMessage } from "@/lib/sales/manual-work-editorial-service"
import { processFastManualWorkUrl } from "@/lib/sales/manual-work-fast-service"
import { scheduleManualWorkBatchDrain } from "@/lib/sales/manual-japan-entry-batch-schedule"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 900

const paramsSchema = z.object({ batchId: z.string().uuid() })
const bodySchema = z.object({ automated: z.boolean().default(false) }).strict()
const FAST_CLAIM_SLICES = 4

function completedStatus(status: string): Exclude<ManualWorkBatchItemStatus, "queued" | "processing"> {
  if (status === "completed" || status === "needs_review" || status === "rejected" || status === "duplicate") return status
  return "failed"
}

async function notifyCompleted(batchId: string, total: number, failed: number): Promise<void> {
  try {
    const { notifyBothChannels } = await import("@/lib/notify")
    await notifyBothChannels("sales", {
      title: "高速リード判定バッチ完了",
      message: `${total}件の一次判定を完了（失敗${failed}件）。残す企業だけ/workからGPT-5.6高品質文面を作成できます。外部送信0件。`,
      link: "/work",
      type: "manual_japan_entry_batch_completed",
      region: "global",
    })
    await markManualWorkBatchNotified(batchId)
  } catch (error) {
    console.error("[api/work/batches/drain] completion notification failed:", error)
  }
}

async function claimFastSlices(batchId: string, totalCount: number): Promise<ManualWorkBatchItemRow[]> {
  const slices = totalCount > 3 ? FAST_CLAIM_SLICES : 1
  const claimed = (await Promise.all(
    Array.from({ length: slices }, () => claimManualWorkBatchItems(batchId)),
  )).flat()
  const byId = new Map(claimed.map((item) => [item.id, item]))
  return [...byId.values()]
}

async function processClaimedItem(input: {
  item: ManualWorkBatchItemRow
  batchId: string
  sourceSlug: string
  sourcePageUrl: string | null
  observedOn: string | null
  variant: ManualWorkBatchSnapshot["batch"]["message_variant_requested"]
  angle: ManualWorkBatchSnapshot["batch"]["message_angle_requested"]
}) {
  const { item } = input
  if (!item.claim_token) throw new Error(`Batch item ${item.id} did not receive a claim token`)
  try {
    const sourceInput = {
      sourceSlug: input.sourceSlug,
      sourcePageUrl: input.sourcePageUrl,
      observedOn: input.observedOn,
    }
    let result
    if (item.retry_requested) {
      if (!item.expected_work_id) throw new Error("A selected work record is required for message generation")
      const existing = await findManualWorkById(item.expected_work_id)
      const analysisMode = existing?.evidence.analysis_mode
      result = analysisMode === "fast_qualification"
        ? await processManualEditorialMessage({
            rawUrl: item.canonical_url,
            expectedWorkId: item.expected_work_id,
          })
        : await processManualJapanEntryUrl(
            item.canonical_url,
            input.variant,
            input.angle,
            sourceInput,
            {
              retryRequested: true,
              expectedWorkId: item.expected_work_id,
            },
          )
    } else {
      result = await processFastManualWorkUrl(
        item.canonical_url,
        input.variant,
        input.angle,
        sourceInput,
      )
    }
    await completeManualWorkBatchItem({
      itemId: item.id,
      claimToken: item.claim_token,
      status: result.artifactsPreserved ? "failed" : completedStatus(result.item.status),
      workId: result.item.id,
      errorMessage: result.item.error_message,
    })
  } catch (error) {
    console.error("[api/work/batches/drain] item failed:", { batchId: input.batchId, itemId: item.id, error })
    await completeManualWorkBatchItem({
      itemId: item.id,
      claimToken: item.claim_token,
      status: "failed",
      workId: null,
      errorMessage: error instanceof Error ? error.message.slice(0, 2_000) : "解析に失敗しました",
    })
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
    let before = await getManualWorkBatchCompact(params.data.batchId)
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
      const claimed = await claimFastSlices(runningBatch.batch.id, runningBatch.batch.total_count)
      claimedCount = claimed.length
      await Promise.all(claimed.map((item) => processClaimedItem({
        item,
        batchId: runningBatch.batch.id,
        sourceSlug: runningBatch.batch.source_slug,
        sourcePageUrl: runningBatch.batch.source_page_url,
        observedOn: runningBatch.batch.observed_on,
        variant: runningBatch.batch.message_variant_requested,
        angle: runningBatch.batch.message_angle_requested,
      })))
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
