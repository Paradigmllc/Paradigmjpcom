import { NextRequest, NextResponse } from "next/server"
import { authorizeWebhookRequest } from "@/lib/admin-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { captureException } from "@/lib/error-monitor"
import {
  child,
  companyIdFromRecords,
  isRecord,
  parseMaybeJsonRecord,
  pipelineRunIdFromRecords,
  persistPostOutreachEvent,
  processInboundReply,
  regionFromRecords,
  text,
  type JsonRecord,
  type SalesActivityResult,
  type SalesActivityType,
} from "@/lib/sales/post-outreach-webhooks"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

function eventIsFinished(eventType: string): boolean {
  const lower = eventType.toLowerCase()
  return lower.includes("finished") || lower.includes("ended") || lower.includes("completed") || lower.includes("room_finished")
}

function activityForEvent(eventType: string): { type: SalesActivityType; result: SalesActivityResult } {
  if (eventIsFinished(eventType)) return { type: "meeting", result: "completed" }
  return { type: "call", result: "follow_up" }
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
    console.error("[livekit-webhook] invalid JSON body:", error)
    await captureException(error, { source: "livekit-webhook/invalid-json" })
    return NextResponse.json({ ok: false, error: "invalid json body" }, { status: 400 })
  }

  const eventType = text(body, ["event", "event_type", "type"]) ?? "livekit_event"
  const room = child(body, "room")
  const participant = child(body, "participant")
  const roomMeta = parseMaybeJsonRecord(room.metadata)
  const participantMeta = parseMaybeJsonRecord(participant.metadata)
  const bodyMeta = parseMaybeJsonRecord(body.metadata)
  const region = regionFromRecords(participantMeta, roomMeta, bodyMeta, body)
  const companyId = companyIdFromRecords(participantMeta, roomMeta, bodyMeta, body)
  const pipelineRunId = pipelineRunIdFromRecords(participantMeta, roomMeta, bodyMeta, body)
  const roomName = text(room, ["name", "sid"]) ?? text(body, ["room_name", "roomName"]) ?? "unknown room"
  const participantIdentity = text(participant, ["identity", "name", "sid"]) ?? text(body, ["participant_identity", "participantIdentity"])
  const transcript =
    text(body, ["transcript", "summary", "notes"]) ??
    text(roomMeta, ["transcript", "summary", "notes"]) ??
    text(participantMeta, ["transcript", "summary", "notes"])
  const activity = activityForEvent(eventType)

  const summary: JsonRecord = {
    eventType,
    region,
    companyId,
    roomName,
    participantIdentity,
    transcriptSnippet: transcript ? transcript.slice(0, 300) : null,
  }
  const inbound = await processInboundReply({
    source: "livekit",
    payload: body,
    summary,
  })

  const persist = await persistPostOutreachEvent({
    region,
    companyId,
    pipelineRunId,
    activityType: activity.type,
    result: eventIsFinished(eventType) ? "completed" : activity.result,
    subject: `LiveKit discovery: ${roomName}`,
    body: transcript,
    queueType: inbound.classification?.shouldFollowUp ? "follow_up" : null,
    queuePriority: transcript ? 80 : 70,
    queueReason: inbound.classification?.intent || transcript ? "transcript_available" : null,
    meta: {
      provider: "livekit",
      eventType,
      reply_classified: inbound.ok,
      classification: inbound.classification,
      roomName,
      participantIdentity,
      raw: body,
    },
  })
  if (!persist.ok) {
    await captureException(new Error(persist.error ?? "Failed to persist LiveKit event"), {
      source: "livekit-webhook/persist",
      context: { summary },
    })
    return NextResponse.json({ ok: false, error: persist.error }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    provider: "livekit",
    reply_classified: inbound.ok,
    classification: inbound.classification,
  })
}
