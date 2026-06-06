import { NextRequest, NextResponse } from "next/server"
import { authorizeWebhookRequest } from "@/lib/admin-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { captureException } from "@/lib/error-monitor"
import {
  child,
  companyIdFromRecords,
  forwardPostOutreachToTriggerDev,
  isRecord,
  pipelineRunIdFromRecords,
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

function primaryPainFromMeta(meta: unknown): string {
  if (!isRecord(meta)) return "Unknown"
  const painDiagnosis = child(meta, "pain_diagnosis")
  return text(painDiagnosis, ["primaryPain", "primary_pain"]) ?? "Unknown"
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

  const emailVal = text(contact, ["email"]) ?? text(sender, ["email"])
  const COMMON_PERSONAL_DOMAINS = new Set([
    "gmail.com",
    "yahoo.com",
    "yahoo.co.jp",
    "outlook.com",
    "outlook.jp",
    "hotmail.com",
    "hotmail.co.jp",
    "icloud.com",
    "me.com",
    "live.com",
    "docomo.ne.jp",
    "ezweb.ne.jp",
    "softbank.ne.jp",
  ])

  let companyId = companyIdFromRecords(customAttributes, conversation, payload, body)
  let pipelineRunId = pipelineRunIdFromRecords(customAttributes, conversation, payload, body)

  if (!companyId && emailVal) {
    const atIdx = emailVal.indexOf("@")
    if (atIdx >= 0) {
      const emailDomain = emailVal.slice(atIdx + 1).trim().toLowerCase()
      if (emailDomain && emailDomain.includes(".") && !COMMON_PERSONAL_DOMAINS.has(emailDomain)) {
        try {
          const { findCompanyByDomain } = await import("@/lib/sales/companies")
          const matchedCompany = await findCompanyByDomain(emailDomain)
          if (matchedCompany) {
            companyId = matchedCompany.id
            const { data: runs, error: runError } = await sb
              .from("sales_pipeline_runs")
              .select("id")
              .eq("company_id", companyId)
              .eq("status", "waiting_external")
              .order("created_at", { ascending: false })
              .limit(1)
            if (!runError && runs && runs[0]) {
              pipelineRunId = runs[0].id
            }
          }
        } catch (findErr) {
          console.error("[chatwoot-webhook] company domain matching failed:", findErr)
        }
      }
    }
  }

  const subject = `Chatwoot inbound: ${contactLabel}`

  const summary: JsonRecord = {
    eventType,
    region,
    companyId,
    contact: contactLabel,
    conversationId: text(conversation, ["id", "display_id"]),
    contentSnippet: content ? content.slice(0, 300) : null,
  }

  const accountId = process.env.CHATWOOT_ACCOUNT_ID
  const conversationIdValue = text(conversation, ["id", "display_id"])

  if (companyId && conversationIdValue && accountId && eventType === "message_created") {
    // Only inject context if this is a new inbound message and we haven't already injected it
    // For simplicity, we just inject it on message creation if it's the first message or if we want context.
    // In a real app we might check if we've already done it, but here we provide context to the agent.
    const { findCompanyById } = await import("@/lib/sales/companies")
    const { addChatwootPrivateNote } = await import("@/lib/sales/chatwoot-client")
    const company = await findCompanyById(companyId)
    if (company) {
      const painPoint = primaryPainFromMeta(company.meta)
      const reportUrl = company.report_url ?? "Not generated"
      const noteContent = `**System Context (Sales OS)**\n- Company: ${company.company_name}\n- Pain Point: ${painPoint}\n- Report URL: ${reportUrl}\n- Stage: ${company.pipeline_status}`
      
      const injectRes = await addChatwootPrivateNote(accountId, conversationIdValue, noteContent)
      if (!injectRes.ok) {
        console.warn("[chatwoot-webhook] Failed to inject private note:", injectRes.error)
      }
    }
  }

  const postOutreachTaskId = process.env.TRIGGER_CHATWOOT_REPLY_TASK_ID ?? process.env.TRIGGER_POST_OUTREACH_TASK_ID ?? "chatwoot-reply-router"
  const forward = await forwardPostOutreachToTriggerDev({
    taskId: postOutreachTaskId && postOutreachTaskId.trim().length > 0 ? postOutreachTaskId.trim() : null,
    source: "chatwoot",
    payload: body,
    summary,
  })

  const persist = await persistPostOutreachEvent({
    region,
    companyId,
    pipelineRunId,
    activityType: "email",
    result: forward.ok ? "success" : "follow_up",
    subject,
    body: content,
    queueType: forward.ok ? null : "follow_up",
    queuePriority: 85,
    queueReason: forward.ok ? null : "Chatwoot reply needs AI/manual follow-up because Trigger.dev task dispatch did not complete.",
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
