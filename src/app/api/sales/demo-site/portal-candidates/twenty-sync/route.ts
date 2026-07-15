import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { listPortalCandidates } from "@/lib/sales/portal-sources/service"
import { syncPortalCandidatesToTwenty } from "@/lib/sales/portal-sources/twenty-sync"
import { PORTAL_SOURCES } from "@/lib/sales/portal-sources/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const BodySchema = z.object({
  source: z.enum(PORTAL_SOURCES),
  candidateIds: z.array(z.uuid()).min(1).max(8),
  force: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  if (!(await isSalesApiAuthorized(request))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  try {
    const parsed = BodySchema.safeParse(await request.json())
    if (!parsed.success) {
      console.error("[portal-candidates/twenty-sync] invalid request:", parsed.error)
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "入力が不正です", sendingEnabled: false }, { status: 400 })
    }
    const candidates = await listPortalCandidates(parsed.data.source, parsed.data.candidateIds.length, { ids: parsed.data.candidateIds })
    const foundIds = new Set(candidates.map((candidate) => candidate.id))
    const missing = parsed.data.candidateIds.filter((id) => !foundIds.has(id))
    if (missing.length > 0) {
      return NextResponse.json({ ok: false, error: `候補が見つかりません: ${missing.slice(0, 3).join(", ")}`, sendingEnabled: false }, { status: 404 })
    }
    const summary = await syncPortalCandidatesToTwenty(candidates, { force: parsed.data.force === true, concurrency: 1 })
    const complete = summary.failed === 0 && (summary.deferred ?? 0) === 0
    return NextResponse.json({ ok: complete, ...summary, sendingEnabled: false }, { status: complete ? 200 : 207, headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    console.error("[portal-candidates/twenty-sync] request failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Twenty同期に失敗しました", sendingEnabled: false }, { status: 500 })
  }
}
