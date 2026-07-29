import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { MANUAL_CHATGPT_BATCH_MAX } from "@/lib/sales/manual-work-chatgpt-handoff"
import {
  importManualChatGptItem,
  type ManualChatGptImportItem,
} from "@/lib/sales/manual-work-chatgpt-import"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const requestSchema = z.object({
  raw: z.string().trim().min(2).max(250_000),
}).strict()

const itemSchema = z.object({
  workId: z.string().uuid(),
  status: z.enum(["ready", "insufficient"]),
  subject: z.string().trim().max(160).nullable().default(null),
  body: z.string().trim().max(2_000).nullable().default(null),
  evidenceIds: z.array(z.string().trim().min(2).max(20)).max(8).default([]),
  score: z.number().min(0).max(100),
  reasoningSummary: z.string().trim().max(800).nullable().default(null),
  insufficiencyReason: z.string().trim().max(800).nullable().default(null),
}).strict().superRefine((value, context) => {
  if (value.status === "ready" && !value.body) {
    context.addIssue({ code: "custom", path: ["body"], message: "readyにはbodyが必要です" })
  }
  if (value.status === "insufficient" && value.body) {
    context.addIssue({ code: "custom", path: ["body"], message: "insufficientではbodyをnullにしてください" })
  }
})

const outputSchema = z.object({
  items: z.array(itemSchema).min(1).max(MANUAL_CHATGPT_BATCH_MAX),
}).strict()

function parseRawJson(raw: string): unknown {
  const trimmed = raw.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
  return JSON.parse(trimmed)
}

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  let body: unknown
  try {
    body = await req.json()
  } catch (error) {
    console.error("[api/work/chatgpt/import] invalid request JSON:", error)
    return NextResponse.json({ ok: false, error: "リクエストJSONが不正です" }, { status: 400 })
  }
  const parsedRequest = requestSchema.safeParse(body)
  if (!parsedRequest.success) {
    return NextResponse.json({ ok: false, error: "ChatGPTの出力JSONを貼り付けてください" }, { status: 400 })
  }

  let decoded: unknown
  try {
    decoded = parseRawJson(parsedRequest.data.raw)
  } catch (error) {
    console.error("[api/work/chatgpt/import] pasted JSON parse failed:", error)
    return NextResponse.json({ ok: false, error: "貼り付けた内容をJSONとして解析できませんでした" }, { status: 400 })
  }
  const parsedOutput = outputSchema.safeParse(decoded)
  if (!parsedOutput.success) {
    const first = parsedOutput.error.issues[0]
    const path = first?.path.length ? first.path.join(".") : "root"
    return NextResponse.json({
      ok: false,
      error: `ChatGPT出力の形式が不正です（${path}: ${first?.message ?? "schema error"}）`,
    }, { status: 400 })
  }

  const results = []
  for (const item of parsedOutput.data.items as ManualChatGptImportItem[]) {
    results.push(await importManualChatGptItem(item))
  }
  const imported = results.filter((result) => result.ok && result.item).length
  const insufficient = results.filter((result) => result.ok && result.item?.message_review.generation_status === "chatgpt_insufficient").length
  const failed = results.filter((result) => !result.ok).length
  return NextResponse.json({
    ok: failed === 0,
    imported,
    insufficient,
    failed,
    results,
  }, { status: failed === 0 ? 200 : 207 })
}
