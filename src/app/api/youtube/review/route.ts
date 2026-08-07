import { NextResponse } from "next/server"
import { z } from "zod"
import { authorizePayloadAdminRequest } from "@/lib/admin-auth"
import { listReviewVideos, submitForReview } from "@/lib/youtube/review/store"
import type { ReviewStatus } from "@/lib/youtube/review/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const STATUSES = [
  "draft",
  "rendering",
  "review_required",
  "approved",
  "rejected",
  "published",
  "failed",
] as const

const submitSchema = z.object({
  formatId: z.string().min(1),
  channelId: z.string().uuid().nullable().optional(),
  script: z.record(z.string(), z.unknown()),
  gate: z.record(z.string(), z.unknown()),
  research: z.record(z.string(), z.unknown()).optional(),
  videoUrl: z.string().url().nullable().optional(),
  durationSec: z.number().positive().nullable().optional(),
  llmCalls: z.number().int().nonnegative().nullable().optional(),
  warnings: z.array(z.string()).optional(),
})

async function authorize(request: Request): Promise<boolean> {
  const auth = await authorizePayloadAdminRequest({ headers: request.headers })
  return auth.ok
}

export async function GET(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ ok: false, error: "管理者認証が必要です。" }, { status: 401 })
  }

  const url = new URL(request.url)
  const requested = url.searchParams.getAll("status").filter((value): value is ReviewStatus =>
    (STATUSES as readonly string[]).includes(value),
  )

  const result = await listReviewVideos({ statuses: requested.length > 0 ? requested : undefined })
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 503 })
  return NextResponse.json({ ok: true, videos: result.data })
}

/** パイプラインがレンダリング済みの動画を審査待ちに積む。 */
export async function POST(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ ok: false, error: "管理者認証が必要です。" }, { status: 401 })
  }

  const parsed = submitSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "入力を確認してください。" }, { status: 400 })
  }

  const result = await submitForReview({
    formatId: parsed.data.formatId,
    channelId: parsed.data.channelId ?? null,
    // 台本とゲート結果は審査画面が表示するためそのまま保存する。
    script: parsed.data.script as never,
    gate: parsed.data.gate as never,
    research: parsed.data.research,
    videoUrl: parsed.data.videoUrl ?? null,
    durationSec: parsed.data.durationSec ?? null,
    llmCalls: parsed.data.llmCalls ?? null,
    warnings: parsed.data.warnings,
  })

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  return NextResponse.json({ ok: true, video: result.data }, { status: 201 })
}
