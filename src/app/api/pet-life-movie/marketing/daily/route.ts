import { NextRequest, NextResponse } from "next/server"
import { authorizeWebhookRequest } from "@/lib/admin-auth"
import { notifyBothChannels } from "@/lib/notify"
import { globalRunDate, runGlobalPetMarketingPipeline } from "@/lib/pet-life-movie/marketing/pipeline"
import { petMarketingRunSchema } from "@/lib/pet-life-movie/marketing/schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(request: NextRequest) {
  if (!authorizeWebhookRequest(request.headers).ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const input = petMarketingRunSchema.safeParse({
    slot: request.nextUrl.searchParams.get("slot") ?? "apac",
    runDate: request.nextUrl.searchParams.get("date") ?? undefined,
  })
  if (!input.success) {
    return NextResponse.json({ ok: false, error: input.error.issues[0]?.message ?? "Invalid run input" }, { status: 400 })
  }
  try {
    const run = await runGlobalPetMarketingPipeline(input.data.slot, input.data.runDate ?? globalRunDate())
    const message = run.status === "blocked"
      ? `${run.slot}/${run.runDate}: ${run.blockedReason}`
      : `${run.slot}/${run.runDate}: generated ${run.generatedPostCount}, published ${run.publishedPostCount}, failed ${run.failedPostCount}`
    const notification = await notifyBothChannels(`Pet Life Movie global growth: ${message}`, {
      title: "Pet Life Movie Global Launch",
      message,
      link: "/ja/admin/pet-life-movie-growth",
      type: "pet_movie_marketing_scheduled_run",
      region: "global",
      priority: run.status === "failed" ? 95 : run.status === "blocked" ? 70 : 55,
      idempotencyKey: `pet-movie-growth:${run.runKey}:${run.status}:${run.publishedPostCount}:${run.failedPostCount}`,
    })
    if (!notification.ok) console.error("[pet-marketing-daily] dual notification degraded", notification)
    return NextResponse.json(
      { ok: true, run, notification },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("[pet-marketing-daily] run failed", error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Global marketing run failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    )
  }
}
