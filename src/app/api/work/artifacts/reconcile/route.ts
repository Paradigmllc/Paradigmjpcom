import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { reconcileManualWorkArtifacts } from "@/lib/sales/manual-work-artifact-reconcile"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const bodySchema = z.object({
  domain: z.string().trim().regex(/^[a-z0-9.-]+$/).max(253).optional(),
  limit: z.number().int().min(1).max(100).default(100),
}).strict()

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  let body: unknown = {}
  try {
    const raw = await req.text()
    if (raw) body = JSON.parse(raw)
  } catch (error) {
    console.error("[api/work/artifacts/reconcile] invalid JSON:", error)
    return NextResponse.json({ ok: false, error: "JSON bodyが不正です" }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "対象ドメインまたは上限値が不正です" }, { status: 400 })
  }
  try {
    const result = await reconcileManualWorkArtifacts(parsed.data)
    try {
      const { notifyBothChannels } = await import("@/lib/notify")
      await notifyBothChannels("sales", {
        title: "Manual work成果物の整合性監査完了",
        message: `${result.checked}件確認 / ${result.repaired}件復元 / ${result.failed}件失敗 / 外部送信0件`,
        link: "/work",
        type: "manual_work_artifact_reconciled",
        region: "global",
      })
    } catch (notifyError) {
      console.error("[api/work/artifacts/reconcile] notification failed:", notifyError)
    }
    return NextResponse.json({ ok: result.failed === 0, result }, { status: result.failed === 0 ? 200 : 207 })
  } catch (error) {
    console.error("[api/work/artifacts/reconcile] failed:", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Twenty整合性監査に失敗しました" },
      { status: 500 },
    )
  }
}
