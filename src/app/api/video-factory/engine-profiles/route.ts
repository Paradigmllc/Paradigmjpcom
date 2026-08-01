import { timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { notifyBothChannels } from "@/lib/notify"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const profileSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/),
  display_name: z.string().min(2).max(100),
  category: z.enum([
    "composition", "video", "image", "people", "audio", "enhancement", "three_d",
  ]),
  summary: z.string().min(10).max(500),
  capabilities: z.array(z.string().min(1).max(100)).min(1).max(20),
  shot_kinds: z.array(z.string().min(1).max(80)).min(1).max(20),
  runtime: z.enum(["builtin", "comfyui", "external_cli"]),
  adapter: z.string().min(2).max(40),
  source_url: z.string().url().startsWith("https://"),
  revision: z.string().regex(/^[a-f0-9]{40}$/),
  code_license: z.string().min(2).max(120),
  model_license: z.string().min(2).max(240),
  commercial_policy: z.enum(["allowed", "review_required", "noncommercial"]),
  approval: z.enum(["approved", "pending", "blocked"]),
  install_mode: z.enum(["bundled", "on_demand"]),
  gpu_required: z.boolean(),
  min_vram_gb: z.number().min(0).max(192),
  recommended_vram_gb: z.number().min(0).max(192),
  workflow_ids: z.array(z.string().min(3).max(80)).max(20),
  model_ids: z.array(z.string().min(3).max(100)).max(40),
  command_env: z.string().regex(/^[A-Z][A-Z0-9_]+$/).nullable().optional(),
  reviewed_by: z.string().min(1).max(200).nullable().optional(),
  reviewed_at: z.string().datetime({ offset: true }).nullable().optional(),
  block_reason: z.string().max(500).nullable().optional(),
  notes: z.string().max(1_000).nullable().optional(),
  ready: z.boolean(),
  state: z.enum(["ready", "blocked"]),
  reasons: z.array(z.string().min(1).max(1_000)).max(100),
}).strict()

const catalogSchema = z.object({
  event_id: z.string().uuid(),
  version: z.number().int().positive(),
  updated_at: z.string().datetime({ offset: true }),
  total: z.number().int().nonnegative().max(100),
  ready: z.number().int().nonnegative().max(100),
  blocked: z.number().int().nonnegative().max(100),
  profiles: z.array(profileSchema).min(1).max(100),
}).strict().superRefine((value, context) => {
  if (value.total !== value.profiles.length) {
    context.addIssue({ code: "custom", message: "total must match profiles.length" })
  }
  if (value.ready + value.blocked !== value.total) {
    context.addIssue({ code: "custom", message: "ready + blocked must equal total" })
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
    console.error("[video-factory-engine-profiles] internal API key is not configured")
    return NextResponse.json({ ok: false, error: "Service unavailable" }, { status: 503 })
  }
  if (!secretsEqual(request.headers.get("x-api-key"), expected)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  let parsed: z.infer<typeof catalogSchema>
  try {
    parsed = catalogSchema.parse(await request.json())
  } catch (error) {
    console.error("[video-factory-engine-profiles] invalid catalog payload", error)
    return NextResponse.json({ ok: false, error: "Invalid catalog payload" }, { status: 422 })
  }

  const database = getServiceSalesSupabase()
  if (!database) {
    console.error("[video-factory-engine-profiles] sales Supabase is not configured")
    return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 503 })
  }

  const rows = parsed.profiles.map((profile) => ({
    id: profile.id,
    display_name: profile.display_name,
    summary: profile.summary,
    category: profile.category,
    runtime: profile.runtime,
    adapter: profile.adapter,
    source_url: profile.source_url,
    revision: profile.revision,
    code_license: profile.code_license,
    model_license: profile.model_license,
    commercial_policy: profile.commercial_policy,
    approval: profile.approval,
    install_mode: profile.install_mode,
    command_env: profile.command_env ?? null,
    gpu_required: profile.gpu_required,
    min_vram_gb: profile.min_vram_gb,
    recommended_vram_gb: profile.recommended_vram_gb,
    capabilities: profile.capabilities,
    shot_kinds: profile.shot_kinds,
    workflow_ids: profile.workflow_ids,
    model_ids: profile.model_ids,
    ready: profile.ready,
    reasons: profile.reasons,
    reviewed_by: profile.reviewed_by ?? null,
    reviewed_at: profile.reviewed_at ?? null,
    block_reason: profile.block_reason ?? null,
    notes: profile.notes ?? null,
    catalog_version: parsed.version,
    catalog_updated_at: parsed.updated_at,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))
  const { error: profileError } = await database
    .from(DB_TABLES.VIDEO_FACTORY_ENGINE_PROFILES)
    .upsert(rows, { onConflict: "id" })
  if (profileError) {
    console.error("[video-factory-engine-profiles] profile upsert failed", profileError)
    return NextResponse.json({ ok: false, error: "Catalog persistence failed" }, { status: 502 })
  }

  const message = `${parsed.total}件を同期（本番利用可 ${parsed.ready} / 利用不可 ${parsed.blocked}）`
  const { error: eventError } = await database
    .from(DB_TABLES.VIDEO_FACTORY_ENGINE_EVENTS)
    .insert({
      id: parsed.event_id,
      event_type: "catalog_synced",
      profile_id: null,
      run_id: null,
      project_id: null,
      state: "completed",
      progress: 100,
      message,
      error: null,
      payload: {
        catalog_version: parsed.version,
        catalog_updated_at: parsed.updated_at,
        total: parsed.total,
        ready: parsed.ready,
        blocked: parsed.blocked,
      },
    })
  if (eventError) {
    console.error("[video-factory-engine-profiles] sync event insert failed", eventError)
    return NextResponse.json({ ok: false, error: "Catalog event persistence failed" }, { status: 502 })
  }

  const notification = await notifyBothChannels(`Video Factory OSSエンジン台帳\n${message}`, {
    title: "Video Factory OSSエンジン台帳を同期",
    message,
    link: "/video-factory-console#engines",
    type: "video_factory_catalog_synced",
    priority: 70,
    idempotencyKey: parsed.event_id,
    clientMessageId: parsed.event_id,
  })
  if (!notification.ok) {
    console.error("[video-factory-engine-profiles] notification delivery incomplete", notification)
    return NextResponse.json({ ok: false, channels: notification }, { status: 502 })
  }

  return NextResponse.json(
    { ok: true, synced: parsed.total, channels: notification },
    { headers: { "Cache-Control": "no-store" } },
  )
}
