import { timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { notifyBothChannels } from "@/lib/notify"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const stateSchema = z.enum(["ready", "conditional", "blocked"])
const capabilitySchema = z.object({
  shot_kind: z.enum([
    "text_motion", "ui_capture", "chart", "generative", "supplied_edit",
    "three_d", "technical_diagram", "portrait_animation", "lip_sync", "transition",
  ]),
  state: stateSchema,
  production_allowed: z.boolean(),
  primary_engine: z.string().min(2).max(40),
  selected_engine: z.string().min(2).max(40).nullable(),
  fallback_used: z.boolean(),
  dedicated_template: z.boolean(),
  template_ids: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/)).max(20),
  ready_profile_ids: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/)).max(100),
  summary: z.string().min(5).max(1_000),
}).strict()

const checkSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/),
  label: z.string().min(2).max(120),
  passed: z.boolean(),
  evidence: z.string().min(2).max(1_000),
}).strict()

const snapshotSchema = z.object({
  event_id: z.string().uuid(),
  schema_version: z.number().int().positive(),
  generated_at: z.string().datetime({ offset: true }),
  environment: z.string().min(2).max(40),
  status: stateSchema,
  score: z.number().int().min(0).max(100),
  template_count: z.number().int().nonnegative().max(100),
  ready_capabilities: z.number().int().nonnegative().max(10),
  conditional_capabilities: z.number().int().nonnegative().max(10),
  blocked_capabilities: z.number().int().nonnegative().max(10),
  capabilities: z.array(capabilitySchema).length(10),
  checks: z.array(checkSchema).min(1).max(30),
  capacity: z.object({
    queue_backend: z.string().min(2).max(40),
    local_workers: z.number().int().min(1).max(8),
    safe_parallel_jobs: z.number().int().min(1).max(8),
    gpu_jobs_serialized: z.boolean(),
    max_deliverables_per_brief: z.number().int().min(1).max(100),
    max_languages_per_brief: z.number().int().min(1).max(100),
  }).strict(),
  output_matrix: z.record(z.string(), z.array(z.string().min(1).max(40)).max(20)),
  automated_stages: z.array(z.string().min(2).max(100)).min(1).max(30),
  human_gates: z.array(z.string().min(2).max(100)).min(1).max(10),
  gaps: z.array(z.string().min(2).max(1_000)).max(50),
}).strict().superRefine((value, context) => {
  if (
    value.ready_capabilities
    + value.conditional_capabilities
    + value.blocked_capabilities !== value.capabilities.length
  ) {
    context.addIssue({ code: "custom", message: "Capability counts must total 10" })
  }
  const kinds = new Set(value.capabilities.map((item) => item.shot_kind))
  if (kinds.size !== value.capabilities.length) {
    context.addIssue({ code: "custom", message: "Capability shot kinds must be unique" })
  }
})

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
    console.error("[video-factory-studio-readiness] internal API key is not configured")
    return NextResponse.json({ ok: false, error: "Service unavailable" }, { status: 503 })
  }
  if (!secretsEqual(request.headers.get("x-api-key"), expected)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  let parsed: z.infer<typeof snapshotSchema>
  try {
    parsed = snapshotSchema.parse(await request.json())
  } catch (error) {
    console.error("[video-factory-studio-readiness] invalid snapshot payload", error)
    return NextResponse.json({ ok: false, error: "Invalid readiness payload" }, { status: 422 })
  }

  const database = getServiceSalesSupabase()
  if (!database) {
    console.error("[video-factory-studio-readiness] sales Supabase is not configured")
    return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 503 })
  }
  const { event_id: eventId, ...snapshot } = parsed
  const { error } = await database
    .from(DB_TABLES.VIDEO_FACTORY_STUDIO_READINESS_SNAPSHOTS)
    .insert({
      id: eventId,
      schema_version: parsed.schema_version,
      environment: parsed.environment,
      status: parsed.status,
      score: parsed.score,
      template_count: parsed.template_count,
      ready_capabilities: parsed.ready_capabilities,
      conditional_capabilities: parsed.conditional_capabilities,
      blocked_capabilities: parsed.blocked_capabilities,
      queue_backend: parsed.capacity.queue_backend,
      safe_parallel_jobs: parsed.capacity.safe_parallel_jobs,
      snapshot,
      generated_at: parsed.generated_at,
    })
  if (error) {
    console.error("[video-factory-studio-readiness] snapshot insert failed", error)
    return NextResponse.json({ ok: false, error: "Readiness persistence failed" }, { status: 502 })
  }

  const message = `準備度 ${parsed.score}/100・本番可 ${parsed.ready_capabilities}/10・安全並列 ${parsed.capacity.safe_parallel_jobs}`
  const notification = await notifyBothChannels(`Video Factory量産準備度\n${message}`, {
    title: "Video Factory量産準備度を更新",
    message,
    link: "/video-factory-console#readiness",
    type: "video_factory_studio_readiness_synced",
    priority: parsed.status === "blocked" ? 90 : 65,
    idempotencyKey: eventId,
    clientMessageId: eventId,
  })
  if (!notification.ok) {
    console.error("[video-factory-studio-readiness] notification delivery incomplete", notification)
    return NextResponse.json({ ok: false, channels: notification }, { status: 502 })
  }

  return NextResponse.json(
    { ok: true, snapshot_id: eventId, channels: notification },
    { headers: { "Cache-Control": "no-store" } },
  )
}
