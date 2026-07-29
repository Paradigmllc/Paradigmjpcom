import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { findManualWorkById } from "@/lib/sales/manual-japan-entry-store"
import { processManualEditorialMessage } from "@/lib/sales/manual-work-editorial-service"
import { MANUAL_CHATGPT_BATCH_MAX } from "@/lib/sales/manual-work-chatgpt-handoff"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const schema = z.object({
  workIds: z.array(z.string().uuid()).min(1).max(MANUAL_CHATGPT_BATCH_MAX),
}).strict()

async function prepare(workId: string) {
  const existing = await findManualWorkById(workId)
  if (!existing) return { workId, ok: false as const, error: "企業履歴が見つかりません" }
  try {
    const result = await processManualEditorialMessage({
      rawUrl: existing.canonical_url,
      expectedWorkId: existing.id,
    })
    return { workId, ok: result.item.status === "completed", item: result.item, error: result.item.error_message }
  } catch (error) {
    return { workId, ok: false as const, error: error instanceof Error ? error.message : "ブリーフ準備に失敗しました" }
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
    console.error("[api/work/chatgpt/briefs] invalid JSON:", error)
    return NextResponse.json({ ok: false, error: "JSON bodyが不正です" }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: `企業は1〜${MANUAL_CHATGPT_BATCH_MAX}件を選択してください` }, { status: 400 })
  }

  const results = []
  const ids = [...new Set(parsed.data.workIds)]
  for (let index = 0; index < ids.length; index += 3) {
    results.push(...await Promise.all(ids.slice(index, index + 3).map(prepare)))
  }
  const prepared = results.filter((result) => result.ok).length
  const failed = results.length - prepared
  return NextResponse.json({
    ok: failed === 0,
    prepared,
    failed,
    results,
  }, { status: failed === 0 ? 200 : 207 })
}
