import { NextRequest, NextResponse } from "next/server"
import { authorizeWebhookRequest } from "@/lib/admin-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { captureException } from "@/lib/error-monitor"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function child(record: JsonRecord, key: string): JsonRecord {
  const value = record[key]
  return isRecord(value) ? value : {}
}

function text(record: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim().length > 0) return value.trim()
    if (typeof value === "number") return String(value)
  }
  return null
}

function regionFromMetadata(meta: JsonRecord): "jp" | "global" {
  return text(meta, ["region"]) === "global" ? "global" : "jp"
}

function statusFromEvent(eventType: string | null): string {
  const event = eventType?.toLowerCase() ?? ""
  if (event.includes("cancel")) return "cancelled"
  if (event.includes("resched")) return "rescheduled"
  if (event.includes("complete")) return "completed"
  if (event.includes("confirm")) return "confirmed"
  return "scheduled"
}

function eventKindFromCalcom(eventType: string | null): string {
  const event = eventType?.toLowerCase() ?? ""
  if (event.includes("demo")) return "demo"
  if (event.includes("proposal")) return "proposal"
  if (event.includes("closing") || event.includes("close")) return "closing"
  if (event.includes("follow")) return "follow_up"
  if (event.includes("review")) return "review"
  if (event.includes("booking") || event.includes("meeting")) return "discovery"
  return "other"
}

function attendeesFromPayload(payload: JsonRecord): unknown[] {
  const attendees = payload.attendees
  if (Array.isArray(attendees)) return attendees
  const responses = child(payload, "responses")
  const email = text(responses, ["email"])
  const name = text(responses, ["name"])
  return email || name ? [{ email, name }] : []
}

export async function POST(req: NextRequest) {
  const auth = authorizeWebhookRequest(req.headers)
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase service role not configured" }, { status: 503 })

  let body: JsonRecord
  try {
    const parsed = await req.json()
    if (!isRecord(parsed)) return NextResponse.json({ ok: false, error: "JSON object required" }, { status: 400 })
    body = parsed
  } catch (error) {
    console.error("[calcom-webhook] invalid JSON body:", error)
    captureException(error instanceof Error ? error : new Error("calcom-webhook invalid JSON body"), { source: "calcom-webhook-json" })
    return NextResponse.json({ ok: false, error: "invalid json body" }, { status: 400 })
  }

  const payload = child(body, "payload")
  const meta = child(payload, "metadata")
  const eventType = text(body, ["triggerEvent", "eventType", "type"])
  const externalId =
    text(payload, ["uid", "id", "bookingId"]) ??
    text(body, ["uid", "id"])
  const startAt = text(payload, ["startTime", "start_at", "start"]) ?? new Date().toISOString()
  const endAt = text(payload, ["endTime", "end_at", "end"])
  const companyId = text(meta, ["companyId", "company_id"])

  const row = {
    region: regionFromMetadata(meta),
    company_id: companyId,
    title: text(payload, ["title", "eventTypeSlug", "eventTitle"]) ?? "Cal.com 商談",
    event_type: eventKindFromCalcom(eventType),
    start_at: startAt,
    end_at: endAt,
    cal_event_id: externalId,
    cal_booking_url: text(payload, ["bookingUrl", "rescheduleUrl"]) ?? text(body, ["bookingUrl"]),
    meeting_url: text(payload, ["meetingUrl", "videoCallUrl", "location"]),
    status: statusFromEvent(eventType),
    attendees: attendeesFromPayload(payload),
    last_synced: new Date().toISOString(),
    meta: {
      provider: "calcom",
      eventType,
      raw: body,
    },
  }

  const { error } = await sb
    .from(DB_TABLES.SALES_CALENDAR_EVENTS)
    .upsert(row, { onConflict: "cal_event_id" })

  if (error) {
    console.error("[calcom-webhook] upsert failed:", error.message)
    captureException(new Error(`calcom-webhook upsert failed: ${error.message}`), { source: "calcom-webhook-upsert" })
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, provider: "calcom", cal_event_id: externalId })
}
