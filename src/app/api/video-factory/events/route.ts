import { timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { notifyBothChannels } from "@/lib/notify"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const eventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.enum([
    "gpu_starting",
    "gpu_ready",
    "gpu_stopped",
    "gpu_error",
    "profile_selected",
    "profile_started",
    "profile_progress",
    "profile_completed",
    "profile_failed",
  ]),
  title: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(2_000),
  created_at: z.string().datetime({ offset: true }),
  instance_id: z.number().int().positive().nullable().optional(),
  run_id: z.string().uuid().nullable().optional(),
  hourly_price: z.number().nonnegative().nullable().optional(),
  profile_id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/).nullable().optional(),
  project_id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,119}$/).nullable().optional(),
  state: z.string().trim().min(1).max(80).nullable().optional(),
  progress: z.number().int().min(0).max(100).nullable().optional(),
  error_message: z.string().trim().min(1).max(2_000).nullable().optional(),
}).strict()

function internalApiKey(): string | null {
  const value = process.env.VIDEO_FACTORY_INTERNAL_API_KEY
    || process.env.ADMIN_SCRIPT_SECRET
    || process.env.ADMIN_PASSWORD
  return value?.trim() || null
}

function secretsEqual(actual: string | null, expected: string): boolean {
  if (!actual) return false
  const actualBuffer = Buffer.from(actual, "utf8")
  const expectedBuffer = Buffer.from(expected, "utf8")
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const expected = internalApiKey()
  if (!expected) {
    console.error("[video-factory-events] internal API key is not configured")
    return NextResponse.json({ ok: false, error: "Service unavailable" }, { status: 503 })
  }
  if (!secretsEqual(request.headers.get("x-api-key"), expected)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  let parsed: z.infer<typeof eventSchema>
  try {
    parsed = eventSchema.parse(await request.json())
  } catch (error) {
    console.error("[video-factory-events] invalid event payload", error)
    return NextResponse.json({ ok: false, error: "Invalid event payload" }, { status: 422 })
  }

  const context = [
    parsed.instance_id ? `GPU ${parsed.instance_id}` : null,
    parsed.run_id ? `run ${parsed.run_id}` : null,
    parsed.hourly_price != null ? `$${parsed.hourly_price.toFixed(3)}/h` : null,
    parsed.profile_id ? `profile ${parsed.profile_id}` : null,
    parsed.progress != null ? `${parsed.progress}%` : null,
  ].filter(Boolean).join(" · ")
  const text = context
    ? `${parsed.title}\n${parsed.message}\n${context}`
    : `${parsed.title}\n${parsed.message}`
  if (parsed.event_type.startsWith("profile_")) {
    const database = getServiceSalesSupabase()
    if (!database) {
      console.error("[video-factory-events] sales Supabase is not configured")
      return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 503 })
    }
    const { error: databaseError } = await database
      .from(DB_TABLES.VIDEO_FACTORY_ENGINE_EVENTS)
      .insert({
        id: parsed.event_id,
        event_type: parsed.event_type,
        profile_id: parsed.profile_id ?? null,
        run_id: parsed.run_id ?? null,
        project_id: parsed.project_id ?? null,
        state: parsed.state ?? parsed.event_type.replace("profile_", ""),
        progress: parsed.progress ?? null,
        message: parsed.message,
        error: parsed.error_message ?? null,
        payload: {
          title: parsed.title,
          created_at: parsed.created_at,
          instance_id: parsed.instance_id ?? null,
          hourly_price: parsed.hourly_price ?? null,
        },
      })
    if (databaseError) {
      console.error("[video-factory-events] engine event persistence failed", databaseError)
      return NextResponse.json(
        { ok: false, error: "Engine event persistence failed" },
        { status: 502 },
      )
    }
  }

  const isProfileEvent = parsed.event_type.startsWith("profile_")
  const isErrorEvent = parsed.event_type === "gpu_error" || parsed.event_type === "profile_failed"
  const notification = await notifyBothChannels(text, {
    title: parsed.title,
    message: parsed.message,
    link: isProfileEvent ? "/video-factory-console#engines" : "/video-factory-console#gpu",
    type: `video_factory_${parsed.event_type}`,
    priority: isErrorEvent ? 95 : 70,
    idempotencyKey: parsed.event_id,
    clientMessageId: parsed.event_id,
  })
  if (!notification.ok) {
    console.error("[video-factory-events] notification delivery incomplete", notification)
    return NextResponse.json(
      { ok: false, channels: notification },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    )
  }
  return NextResponse.json(
    { ok: true, channels: notification },
    { headers: { "Cache-Control": "no-store" } },
  )
}
