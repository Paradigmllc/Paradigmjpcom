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
    "studio_project_created",
    "studio_revision_created",
    "studio_qa_completed",
    "studio_project_delivered",
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
  payload: z.record(z.string(), z.unknown()).default({}),
}).strict()

const studioProjectSchema = z.object({
  project_name: z.string().trim().min(3).max(120),
  template_id: z.string().regex(/^(auto|[a-z0-9][a-z0-9-]{2,79})$/),
  brand: z.object({
    kit_id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/),
    name: z.string().trim().min(1).max(200),
  }).passthrough(),
  brief: z.record(z.string(), z.unknown()),
  manifest: z.record(z.string(), z.unknown()),
}).strict()

const studioRevisionSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,71}$/),
  shot_id: z.string().regex(/^shot-[0-9]{3}$/),
  language: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
  revision: z.number().int().positive(),
  patch: z.record(z.string(), z.unknown()),
  reviewer: z.string().trim().min(2).max(200),
  created_at: z.string().datetime({ offset: true }),
}).strict()

const studioQaSchema = z.object({
  deliverable_name: z.string().trim().min(1).max(80),
  qa: z.object({ passed: z.boolean() }).passthrough(),
}).strict()

const studioDeliveredItemsSchema = z.array(z.object({
  name: z.string().regex(/^[a-z0-9][a-z0-9-]{1,79}$/),
  artifact_path: z.string().regex(/^deliverables\/[a-z0-9][a-z0-9.-]{1,100}$/),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  size_bytes: z.number().int().positive().max(250 * 1024 * 1024),
}).strict()).min(1).max(3)

const studioCustomerDeliveredSchema = z.object({
  pet_movie_mode: z.literal("customer_paid").optional(),
  pet_movie_project_id: z.string().uuid(),
  pet_movie_job_id: z.string().uuid(),
  reviewer: z.string().trim().min(1).max(200),
  items: studioDeliveredItemsSchema,
}).strict()

const studioQaDeliveredSchema = z.object({
  pet_movie_mode: z.literal("internal_qa"),
  pet_movie_qa_render_id: z.string().uuid(),
  reviewer: z.string().trim().min(1).max(200),
  items: studioDeliveredItemsSchema,
}).strict()

const studioDeliveredSchema = z.union([studioCustomerDeliveredSchema, studioQaDeliveredSchema])

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
  if (parsed.event_type.startsWith("studio_")) {
    if (!parsed.project_id) {
      return NextResponse.json({ ok: false, error: "Studio project ID is required" }, { status: 422 })
    }
    const database = getServiceSalesSupabase()
    if (!database) {
      console.error("[video-factory-events] sales Supabase is not configured")
      return NextResponse.json({ ok: false, error: "Database unavailable" }, { status: 503 })
    }
    let databaseError: { message: string } | null = null
    try {
      if (parsed.event_type === "studio_project_created") {
        const payload = studioProjectSchema.parse(parsed.payload)
        const brandResult = await database
          .from(DB_TABLES.VIDEO_FACTORY_BRAND_KITS)
          .upsert({
            id: payload.brand.kit_id,
            name: payload.brand.name,
            brand: payload.brand,
            updated_at: parsed.created_at,
          }, { onConflict: "id" })
        databaseError = brandResult.error
        if (!databaseError) {
          const projectResult = await database
            .from(DB_TABLES.VIDEO_FACTORY_STUDIO_PROJECTS)
            .upsert({
              project_id: parsed.project_id,
              project_name: payload.project_name,
              template_id: payload.template_id,
              brand_kit_id: payload.brand.kit_id,
              brief: payload.brief,
              manifest: payload.manifest,
              status: parsed.state ?? "production",
              updated_at: parsed.created_at,
            }, { onConflict: "project_id" })
          databaseError = projectResult.error
        }
      } else if (parsed.event_type === "studio_revision_created") {
        const payload = studioRevisionSchema.parse(parsed.payload)
        const result = await database
          .from(DB_TABLES.VIDEO_FACTORY_SHOT_REVISIONS)
          .insert(payload)
        databaseError = result.error
      } else if (parsed.event_type === "studio_qa_completed") {
        const payload = studioQaSchema.parse(parsed.payload)
        const result = await database
          .from(DB_TABLES.VIDEO_FACTORY_QUALITY_METRICS)
          .insert({
            id: parsed.event_id,
            project_id: parsed.project_id,
            deliverable_name: payload.deliverable_name,
            passed: payload.qa.passed,
            metrics: payload.qa,
            created_at: parsed.created_at,
          })
        databaseError = result.error
      } else {
        const payload = studioDeliveredSchema.parse(parsed.payload)
        const result = await database
          .from(DB_TABLES.VIDEO_FACTORY_STUDIO_PROJECTS)
          .update({ status: "delivered", updated_at: parsed.created_at })
          .eq("project_id", parsed.project_id)
        databaseError = result.error
        if (!databaseError) {
          const items = payload.items.map((item) => ({
            name: item.name,
            artifactPath: item.artifact_path,
            sha256: item.sha256,
            sizeBytes: item.size_bytes,
          }))
          if (payload.pet_movie_mode === "internal_qa") {
            const { ingestPetMovieQaDelivery } = await import("@/lib/pet-life-movie/qa-render")
            await ingestPetMovieQaDelivery({
              rendererProjectId: parsed.project_id,
              qaRenderId: payload.pet_movie_qa_render_id,
              reviewer: payload.reviewer,
              items,
            })
          } else {
            const { ingestPetMovieDelivery } = await import("@/lib/pet-life-movie/delivery")
            await ingestPetMovieDelivery({
              rendererProjectId: parsed.project_id,
              projectId: payload.pet_movie_project_id,
              jobId: payload.pet_movie_job_id,
              reviewer: payload.reviewer,
              items,
            })
          }
        }
      }
    } catch (error) {
      console.error("[video-factory-events] invalid studio event payload", error)
      return NextResponse.json({ ok: false, error: "Invalid studio event payload" }, { status: 422 })
    }
    if (databaseError) {
      console.error("[video-factory-events] studio persistence failed", databaseError)
      return NextResponse.json(
        { ok: false, error: "Studio persistence failed" },
        { status: 502 },
      )
    }
  }

  const isProfileEvent = parsed.event_type.startsWith("profile_")
  const isErrorEvent = parsed.event_type === "gpu_error" || parsed.event_type === "profile_failed"
  const notification = await notifyBothChannels(text, {
    title: parsed.title,
    message: parsed.message,
    link: parsed.event_type.startsWith("studio_")
      ? "/video-factory-console#projects"
      : isProfileEvent
        ? "/video-factory-console#engines"
        : "/video-factory-console#gpu",
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
