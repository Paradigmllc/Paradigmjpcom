import { NextRequest, NextResponse } from "next/server"
import { authorizeWebhookRequest } from "@/lib/admin-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { captureException } from "@/lib/error-monitor"
import {
  child,
  companyIdFromRecords,
  forwardPostOutreachToN8n,
  isRecord,
  persistPostOutreachEvent,
  regionFromRecords,
  text,
  type JsonRecord,
} from "@/lib/sales/post-outreach-webhooks"
import { syncCompanyKarteToTwenty } from "@/lib/sales/twenty-sync"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

function inboundPayload(body: JsonRecord): JsonRecord {
  const payload = child(body, "payload")
  return Object.keys(payload).length > 0 ? payload : body
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
    console.error("[chatwoot-webhook] invalid JSON body:", error)
    await captureException(error, { source: "chatwoot-webhook/invalid-json" })
    return NextResponse.json({ ok: false, error: "invalid json body" }, { status: 400 })
  }

  const payload = inboundPayload(body)
  const conversation = child(payload, "conversation")
  const contact = child(payload, "contact")
  const sender = child(payload, "sender")
  const customAttributes = child(conversation, "custom_attributes")
  const eventType = text(body, ["event", "event_type", "type"]) ?? "message_created"
  const content = text(payload, ["content", "message", "text"]) ?? text(body, ["content", "message", "text"])
  const contactLabel =
    text(contact, ["name", "email", "phone_number"]) ??
    text(sender, ["name", "email", "phone_number"]) ??
    text(conversation, ["display_id", "id"]) ??
    "unknown contact"
  const region = regionFromRecords(customAttributes, conversation, payload, body)
  const companyId = companyIdFromRecords(customAttributes, conversation, payload, body)
  const subject = `Chatwoot inbound: ${contactLabel}`

  const summary: JsonRecord = {
    eventType,
    region,
    companyId,
    contact: contactLabel,
    conversationId: text(conversation, ["id", "display_id"]),
    contentSnippet: content ? content.slice(0, 300) : null,
  }
  const postOutreachWebhook = process.env.N8N_POST_OUTREACH_WEBHOOK_URL
  const forward = await forwardPostOutreachToN8n({
    webhookUrl: postOutreachWebhook && postOutreachWebhook.trim().length > 0 ? postOutreachWebhook.trim() : null,
    source: "chatwoot",
    payload: body,
    summary,
  })

  const persist = await persistPostOutreachEvent({
    region,
    companyId,
    activityType: "email",
    result: forward.ok ? "success" : "follow_up",
    subject,
    body: content,
    queueType: forward.ok ? null : "follow_up",
    queuePriority: 85,
    queueReason: forward.ok ? null : "Chatwoot reply needs AI/manual follow-up because n8n forwarding did not complete.",
    meta: {
      provider: "chatwoot",
      eventType,
      automationForwarded: forward.ok,
      automationError: forward.error,
      contact: contactLabel,
      raw: body,
    },
  })
  if (!persist.ok) {
    await captureException(new Error(persist.error ?? "Failed to persist Chatwoot event"), {
      source: "chatwoot-webhook/persist",
      context: { summary },
    })
    return NextResponse.json({ ok: false, error: persist.error }, { status: 500 })
  }

  const twentySync = companyId ? await syncCompanyKarteToTwenty(companyId) : null
  if (twentySync && !twentySync.ok && twentySync.configured) {
    console.error("[chatwoot-webhook] Twenty sync failed after Chatwoot inbound:", twentySync.error)
    await captureException(new Error(twentySync.error ?? "Twenty sync failed after Chatwoot inbound"), {
      source: "chatwoot-webhook/twenty-sync",
      context: { summary },
    })
  }

  return NextResponse.json({
    ok: true,
    provider: "chatwoot",
    automation_forwarded: forward.ok,
    queued_for_follow_up: !forward.ok,
    twenty_synced: twentySync?.ok ?? false,
    twenty_configured: twentySync?.configured ?? false,
  })
}
