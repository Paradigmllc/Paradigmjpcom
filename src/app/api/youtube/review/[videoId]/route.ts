import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizePayloadAdminRequest } from "@/lib/admin-auth"
import { decideReviewVideo, getReviewVideo, listReviewEvents } from "@/lib/youtube/review/store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const decisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  // 却下は理由を必須にする。理由の無い却下は再生成の指示にならない。
  note: z.string().trim().max(2000).optional(),
})

async function authorizeActor(request: Request): Promise<{ ok: boolean; actor: string }> {
  const auth = await authorizePayloadAdminRequest({ headers: request.headers })
  return { ok: auth.ok, actor: auth.ok ? (auth.userEmail ?? auth.source) : "unknown" }
}

export async function GET(request: Request, context: { params: Promise<{ videoId: string }> }) {
  const auth = await authorizeActor(request)
  if (!auth.ok) return NextResponse.json({ ok: false, error: "管理者認証が必要です。" }, { status: 401 })

  const { videoId } = await context.params
  const [video, events] = await Promise.all([getReviewVideo(videoId), listReviewEvents(videoId)])
  if (!video.ok) return NextResponse.json({ ok: false, error: video.error }, { status: 404 })

  return NextResponse.json({ ok: true, video: video.data, events: events.data ?? [] })
}

export async function POST(request: Request, context: { params: Promise<{ videoId: string }> }) {
  const auth = await authorizeActor(request)
  if (!auth.ok) return NextResponse.json({ ok: false, error: "管理者認証が必要です。" }, { status: 401 })

  const { videoId } = await context.params
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "承認か却下かを指定してください。" }, { status: 400 })
  }

  if (parsed.data.decision === "reject" && !parsed.data.note) {
    return NextResponse.json({ ok: false, error: "却下する場合は理由を書いてください。" }, { status: 400 })
  }

  const result = await decideReviewVideo({
    videoId,
    decision: parsed.data.decision,
    note: parsed.data.note ?? null,
    actor: auth.actor,
  })

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 409 })
  return NextResponse.json({ ok: true, video: result.data })
}
