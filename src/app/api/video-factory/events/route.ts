import { timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { notifyBothChannels } from "@/lib/notify"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const eventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.enum([
    "gpu_starting",
    "gpu_ready",
    "gpu_stopped",
    "gpu_error",
  ]),
  title: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(2_000),
  created_at: z.string().datetime({ offset: true }),
  instance_id: z.number().int().positive().nullable().optional(),
  run_id: z.string().uuid().nullable().optional(),
  hourly_price: z.number().nonnegative().nullable().optional(),
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
  ].filter(Boolean).join(" · ")
  const text = context
    ? `${parsed.title}\n${parsed.message}\n${context}`
    : `${parsed.title}\n${parsed.message}`
  const notification = await notifyBothChannels(text, {
    title: parsed.title,
    message: parsed.message,
    link: "/video-factory-console#gpu",
    type: `video_factory_${parsed.event_type}`,
    priority: parsed.event_type === "gpu_error" ? 95 : 70,
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
