import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import {
  getManualWorkDashboardSummary,
  listManualJapanEntryWorkPage,
  listManualLeadSourceCatalog,
  MANUAL_WORK_OUTCOMES,
  recordManualWorkOutcome,
} from "@/lib/sales/manual-japan-entry-store"
import { MANUAL_MESSAGE_VARIANTS } from "@/lib/sales/manual-japan-entry-experiment"
import { MANUAL_MESSAGE_ANGLES } from "@/lib/sales/manual-japan-entry-angle"
import { processManualEditorialMessage } from "@/lib/sales/manual-work-editorial-service"
import { processFastManualWorkUrl } from "@/lib/sales/manual-work-fast-service"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(100),
  filter: z.enum(["all", "action_required", "completed", "sent", "failed"]).default("all"),
  q: z.string().max(100).default(""),
})

const createSchema = z.object({
  url: z.string().trim().min(1).max(2_048),
  variant: z.enum(["auto", ...MANUAL_MESSAGE_VARIANTS]).default("auto"),
  angle: z.enum(["auto", ...MANUAL_MESSAGE_ANGLES]).default("auto"),
  sourceSlug: z.string().regex(/^[a-z0-9_]{2,80}$/).default("manual_input"),
  sourcePageUrl: z.union([
    z.string().url().max(2_048).refine((value) => value.startsWith("https://"), "HTTPS URL required"),
    z.literal(""),
  ]).default(""),
  observedOn: z.string().date().optional(),
  retry: z.boolean().default(false),
  workId: z.string().uuid().optional(),
}).strict().superRefine((value, context) => {
  if (value.retry && !value.workId) {
    context.addIssue({ code: "custom", path: ["workId"], message: "ブリーフ再準備には履歴IDが必要です" })
  }
  if (!value.retry && value.workId) {
    context.addIssue({ code: "custom", path: ["workId"], message: "履歴IDはブリーフ再準備時だけ指定できます" })
  }
})
const outcomeSchema = z.object({
  id: z.string().uuid(),
  outcome: z.enum(MANUAL_WORK_OUTCOMES),
  value: z.boolean(),
}).strict()

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  try {
    const parsedQuery = historyQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()))
    if (!parsedQuery.success) return NextResponse.json({ ok: false, error: "履歴の検索条件が不正です" }, { status: 400 })
    const [history, summary, sources] = await Promise.all([
      listManualJapanEntryWorkPage({
        page: parsedQuery.data.page,
        pageSize: parsedQuery.data.pageSize,
        filter: parsedQuery.data.filter,
        query: parsedQuery.data.q,
      }),
      getManualWorkDashboardSummary(),
      listManualLeadSourceCatalog(),
    ])
    return NextResponse.json({ ok: true, ...history, summary, sources })
  } catch (error) {
    console.error("[api/work] list failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "履歴を取得できませんでした" },
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
    console.error("[api/work] invalid JSON:", error)
    return NextResponse.json({ ok: false, error: "JSON bodyが不正です" }, { status: 400 })
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "有効な企業URLと処理条件を指定してください" }, { status: 400 })
  }
  try {
    const sourceInput = {
      sourceSlug: parsed.data.sourceSlug,
      sourcePageUrl: parsed.data.sourcePageUrl || null,
      observedOn: parsed.data.observedOn ?? null,
    }
    const result = parsed.data.retry
      ? await processManualEditorialMessage({
          rawUrl: parsed.data.url,
          expectedWorkId: parsed.data.workId!,
        })
      : await processFastManualWorkUrl(
          parsed.data.url,
          parsed.data.variant,
          parsed.data.angle,
          sourceInput,
        )
    try {
      const { notifyBothChannels } = await import("@/lib/notify")
      await notifyBothChannels("sales", {
        title: parsed.data.retry
          ? `ChatGPTブリーフ準備: ${result.item.company_name ?? result.item.domain}`
          : `高速一次判定: ${result.item.company_name ?? result.item.domain}`,
        message: `${result.item.status} / 外部AI API 0件 / 外部送信0件`,
        link: "/work",
        type: parsed.data.retry ? "manual_chatgpt_brief_completed" : "manual_fast_qualification_completed",
        region: "global",
      })
    } catch (error) {
      console.error("[api/work] notification failed:", error)
    }
    return NextResponse.json({ ok: true, ...result }, { status: result.duplicate ? 200 : 201 })
  } catch (error) {
    console.error("[api/work] process failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "解析を開始できませんでした" },
      { status: 500 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  let body: unknown
  try {
    body = await req.json()
  } catch (error) {
    console.error("[api/work] invalid outcome JSON:", error)
    return NextResponse.json({ ok: false, error: "JSON bodyが不正です" }, { status: 400 })
  }
  const parsed = outcomeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "有効な評価イベントを指定してください" }, { status: 400 })
  }
  try {
    const item = await recordManualWorkOutcome(parsed.data)
    return NextResponse.json({ ok: true, item })
  } catch (error) {
    console.error("[api/work] outcome update failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "評価イベントを保存できませんでした" },
      { status: 500 },
    )
  }
}
