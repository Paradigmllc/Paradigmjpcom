import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import {
  createManualWorkBatch,
  createManualWorkRetryBatch,
  getManualWorkBatchQueuePosition,
  getManualWorkBatchQueueSummary,
  getLatestActiveManualWorkBatch,
  promoteNextManualWorkBatch,
} from "@/lib/sales/manual-japan-entry-batch-store"
import {
  isManualWorkBatchTerminal,
  MANUAL_WORK_BATCH_MAX_URLS,
} from "@/lib/sales/manual-japan-entry-batch-types"
import { MANUAL_MESSAGE_ANGLES } from "@/lib/sales/manual-japan-entry-angle"
import { MANUAL_MESSAGE_VARIANTS } from "@/lib/sales/manual-japan-entry-experiment"
import { scheduleManualWorkBatchDrain } from "@/lib/sales/manual-japan-entry-batch-schedule"
import { findManualWorkById } from "@/lib/sales/manual-japan-entry-store"
import { normalizeManualWorkUrl } from "@/lib/sales/manual-japan-entry-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const createBatchSchema = z.object({
  urls: z.array(z.string().trim().min(1).max(2_048)).min(1).max(MANUAL_WORK_BATCH_MAX_URLS),
  variant: z.enum(["auto", ...MANUAL_MESSAGE_VARIANTS]).default("auto"),
  angle: z.enum(["auto", ...MANUAL_MESSAGE_ANGLES]).default("auto"),
  sourceSlug: z.string().regex(/^[a-z0-9_]{2,80}$/).default("manual_input"),
  sourcePageUrl: z.union([
    z.string().url().max(2_048).refine((value) => value.startsWith("https://"), "HTTPS URL required"),
    z.literal(""),
  ]).default(""),
  observedOn: z.string().date().optional(),
  retryWorkId: z.string().uuid().optional(),
}).strict().superRefine((value, context) => {
  if (value.retryWorkId && value.urls.length !== 1) {
    context.addIssue({ code: "custom", path: ["retryWorkId"], message: "ブリーフ準備は履歴1件ずつ永続キューへ登録してください" })
  }
})

async function notify(title: string, message: string, type: string): Promise<void> {
  try {
    const { notifyBothChannels } = await import("@/lib/notify")
    await notifyBothChannels("sales", { title, message, link: "/work", type, region: "global" })
  } catch (error) {
    console.error("[api/work/batches] notification failed:", error)
  }
}

function hasRecordedOutcome(work: Awaited<ReturnType<typeof findManualWorkById>>): boolean {
  return Boolean(
    work?.manually_sent_at
    || work?.reply_received_at
    || work?.founder_forwarded_at
    || work?.meeting_converted_at,
  )
}

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  try {
    let activeBatch = await getLatestActiveManualWorkBatch()
    if (activeBatch?.batch.status === "queued") {
      const promoted = await promoteNextManualWorkBatch()
      if (promoted) activeBatch = promoted.snapshot
    }
    if (activeBatch && !isManualWorkBatchTerminal(activeBatch.batch.status)) {
      scheduleManualWorkBatchDrain(activeBatch.batch.id)
    }
    return NextResponse.json({
      ok: true,
      activeBatch,
      queueSummary: await getManualWorkBatchQueueSummary(),
    })
  } catch (error) {
    console.error("[api/work/batches] active batch read failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "実行中バッチを取得できませんでした" },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  let body: unknown
  try {
    body = await req.json()
  } catch (error) {
    console.error("[api/work/batches] invalid JSON:", error)
    return NextResponse.json({ ok: false, error: "JSON bodyが不正です" }, { status: 400 })
  }
  const parsed = createBatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: `企業URLは1〜${MANUAL_WORK_BATCH_MAX_URLS}件で指定してください` }, { status: 400 })
  }
  try {
    const byDomain = new Map<string, ReturnType<typeof normalizeManualWorkUrl>>()
    try {
      for (const url of parsed.data.urls) {
        const normalized = normalizeManualWorkUrl(url)
        if (!byDomain.has(normalized.domain)) byDomain.set(normalized.domain, normalized)
      }
    } catch (error) {
      console.error("[api/work/batches] URL normalization failed:", error)
      return NextResponse.json(
        { ok: false, error: error instanceof Error ? error.message : "企業URLが不正です" },
        { status: 400 },
      )
    }

    if (parsed.data.retryWorkId) {
      const selectedWork = await findManualWorkById(parsed.data.retryWorkId)
      if (!selectedWork) {
        return NextResponse.json({ ok: false, error: "選択した企業履歴が見つかりません" }, { status: 404 })
      }
      if (selectedWork.is_japanese_company || selectedWork.country_code === "JP") {
        return NextResponse.json({ ok: false, error: "日本企業は海外向け営業文面の対象外です" }, { status: 400 })
      }
      if (hasRecordedOutcome(selectedWork)) {
        return NextResponse.json({ ok: false, error: "送信・返信・商談の記録がある企業は自動で上書きできません" }, { status: 409 })
      }
    }

    const normalizedUrls = [...byDomain.values()]
    const common = {
      variant: parsed.data.variant,
      angle: parsed.data.angle,
      sourceSlug: parsed.data.sourceSlug,
      sourcePageUrl: parsed.data.sourcePageUrl || null,
      observedOn: parsed.data.observedOn ?? null,
    }
    const batch = parsed.data.retryWorkId
      ? await createManualWorkRetryBatch({
          ...common,
          url: normalizedUrls[0]!,
          workId: parsed.data.retryWorkId,
        })
      : await createManualWorkBatch({ ...common, urls: normalizedUrls })
    const active = await promoteNextManualWorkBatch()
    if (active?.promoted) scheduleManualWorkBatchDrain(active.snapshot.batch.id)
    const [queuePosition, queueSummary] = await Promise.all([
      getManualWorkBatchQueuePosition(batch.batch.id),
      getManualWorkBatchQueueSummary(),
    ])
    await notify(
      parsed.data.retryWorkId
        ? (queuePosition === 0 ? "ChatGPTブリーフ準備開始" : "ChatGPTブリーフ準備待機")
        : (queuePosition === 0 ? "高速リード判定開始" : "高速リード判定待機"),
      parsed.data.retryWorkId
        ? `選択した1社の公式ページを追加収集し、ChatGPT Proへ渡す企業別ブリーフを準備します。前方バッチ${queuePosition}件。外部AI API・外部送信0件。`
        : `${batch.batch.total_count}件を高速一次判定キューへ登録しました。前方バッチ${queuePosition}件。送信文は残す企業だけChatGPT Proで作成します。外部AI API・外部送信0件。`,
      parsed.data.retryWorkId
        ? "manual_chatgpt_brief_queued"
        : (queuePosition === 0 ? "manual_japan_entry_fast_batch_started" : "manual_japan_entry_fast_batch_queued"),
    )
    return NextResponse.json({
      ok: true,
      snapshot: queuePosition === 0 && active ? active.snapshot : batch,
      automaticDrainStarted: active?.promoted === true,
      queuePosition,
      queueSummary,
    }, { status: 201 })
  } catch (error) {
    console.error("[api/work/batches] create failed:", error)
    const message = error instanceof Error ? error.message : "バッチを作成できませんでした"
    const queueFull = /queue is full/i.test(message)
    return NextResponse.json(
      { ok: false, error: queueFull ? "永続キューは最大20バッチです。処理完了後に追加してください。" : message },
      { status: queueFull ? 409 : 500 },
    )
  }
}
