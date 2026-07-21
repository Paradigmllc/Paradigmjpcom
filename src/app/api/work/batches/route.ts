import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import {
  createManualWorkBatch,
  getManualWorkBatchQueuePosition,
  getManualWorkBatchQueueSummary,
  getLatestActiveManualWorkBatch,
  promoteNextManualWorkBatch,
} from "@/lib/sales/manual-japan-entry-batch-store"
import { MANUAL_WORK_BATCH_MAX_URLS } from "@/lib/sales/manual-japan-entry-batch-types"
import { MANUAL_MESSAGE_ANGLES } from "@/lib/sales/manual-japan-entry-angle"
import { MANUAL_MESSAGE_VARIANTS } from "@/lib/sales/manual-japan-entry-experiment"
import { preflightManualWorkBatch } from "@/lib/sales/manual-japan-entry-batch-preflight"
import { scheduleManualWorkBatchDrain } from "@/lib/sales/manual-japan-entry-batch-schedule"
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
}).strict()

async function notify(title: string, message: string, type: string): Promise<void> {
  try {
    const { notifyBothChannels } = await import("@/lib/notify")
    await notifyBothChannels("sales", { title, message, link: "/work", type, region: "global" })
  } catch (error) {
    console.error("[api/work/batches] notification failed:", error)
  }
}

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  try {
    let activeBatch = await getLatestActiveManualWorkBatch()
    if (activeBatch?.batch.status === "queued") {
      const promoted = await promoteNextManualWorkBatch()
      if (promoted) {
        activeBatch = promoted.snapshot
        if (promoted.promoted) scheduleManualWorkBatchDrain(promoted.snapshot.batch.id)
      }
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
    const preflight = await preflightManualWorkBatch()
    if (!preflight.ok) {
      console.error("[api/work/batches] DeepSeek preflight failed:", preflight.error)
      return NextResponse.json({
        ok: false,
        error: `バッチは開始していません。${preflight.error ?? "DeepSeek APIを利用できません"}`,
      }, { status: 503 })
    }
    const batch = await createManualWorkBatch({
      urls: [...byDomain.values()],
      variant: parsed.data.variant,
      angle: parsed.data.angle,
      sourceSlug: parsed.data.sourceSlug,
      sourcePageUrl: parsed.data.sourcePageUrl || null,
      observedOn: parsed.data.observedOn ?? null,
    })
    const active = await promoteNextManualWorkBatch()
    if (active?.promoted) scheduleManualWorkBatchDrain(active.snapshot.batch.id)
    const [queuePosition, queueSummary] = await Promise.all([
      getManualWorkBatchQueuePosition(batch.batch.id),
      getManualWorkBatchQueueSummary(),
    ])
    await notify(
      queuePosition === 0 ? "Manual Japan Entryバッチ開始" : "Manual Japan Entryバッチ待機",
      `${batch.batch.total_count}件を永続キューへ登録しました。前方バッチ${queuePosition}件。解析後にTwentyへ未送信データとして同期します。外部送信0件。`,
      queuePosition === 0 ? "manual_japan_entry_batch_started" : "manual_japan_entry_batch_queued",
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
