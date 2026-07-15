import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { listManualJapanEntryWork } from "@/lib/sales/manual-japan-entry-store"
import { processManualJapanEntryUrl } from "@/lib/sales/manual-japan-entry-service"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const createSchema = z.object({ url: z.string().trim().min(1).max(2_048) }).strict()

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  try {
    const items = await listManualJapanEntryWork(100)
    return NextResponse.json({ ok: true, items })
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
    return NextResponse.json({ ok: false, error: "有効な企業URLを1件指定してください" }, { status: 400 })
  }
  try {
    const result = await processManualJapanEntryUrl(parsed.data.url)
    try {
      const { notifyBothChannels } = await import("@/lib/notify")
      await notifyBothChannels("sales", {
        title: `Manual Japan Entry: ${result.item.company_name ?? result.item.domain}`,
        message: `${result.item.status} / Twenty ${result.item.twenty_sync_status} / 外部送信0件`,
        link: "/work",
        type: "manual_japan_entry_work_completed",
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
