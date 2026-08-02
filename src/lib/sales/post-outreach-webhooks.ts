import { createHash } from "node:crypto"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { classifyReply } from "./outreach/reply-classifier"
import { insertWithOptionalColumns } from "@/lib/sales/safe-supabase-insert"

export type JsonRecord = Record<string, unknown>
export type SalesPostOutreachRegion = "jp" | "global"
export type SalesActivityType = "email" | "call" | "meeting" | "note" | "sms" | "linkedin" | "demo" | "follow_up" | "reply_received" | "reply_classified"
export type SalesActivityResult = "success" | "no_answer" | "follow_up" | "declined" | "completed" | "interested" | "not_interested" | "needs_info" | "unsubscribe"
export type SalesQueueType = "cleanse" | "call" | "form_send" | "follow_up" | "crm_update" | "meeting_prep" | "analysis"

export interface TriggerDevForwardResult {
  ok: boolean
  error: string | null
}

export interface PersistPostOutreachEventInput {
  region: SalesPostOutreachRegion
  companyId: string | null
  pipelineRunId?: string | null
  activityType: SalesActivityType
  result: SalesActivityResult
  subject: string
  body: string | null
  queueType: SalesQueueType | null
  queuePriority: number
  queueReason: string | null
  meta: JsonRecord
}

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function child(record: JsonRecord, key: string): JsonRecord {
  const value = record[key]
  return isRecord(value) ? value : {}
}

export function text(record: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim().length > 0) return value.trim()
    if (typeof value === "number") return String(value)
  }
  return null
}

export function parseMaybeJsonRecord(value: unknown): JsonRecord {
  if (isRecord(value)) return value
  if (typeof value !== "string" || value.trim().length === 0) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    return isRecord(parsed) ? parsed : {}
  } catch (error) {
    console.warn("[post-outreach-webhook] metadata JSON parse skipped:", error)
    return {}
  }
}

export function regionFromRecords(...records: JsonRecord[]): SalesPostOutreachRegion {
  for (const record of records) {
    const value = text(record, ["region", "sales_region", "market_scope"])
    if (value === "global") return "global"
  }
  return "jp"
}

export function companyIdFromRecords(...records: JsonRecord[]): string | null {
  return uuidFromRecords(["companyId", "company_id", "sales_company_id"], ...records)
}

export function pipelineRunIdFromRecords(...records: JsonRecord[]): string | null {
  return uuidFromRecords(["pipelineRunId", "pipeline_run_id", "sales_pipeline_run_id", "run_id"], ...records)
}

async function persistContactSuppression(input: {
  companyId: string | null
  contactKey: string | null
  source: string
  reason: string
}): Promise<void> {
  const sb = getServiceSalesSupabase()
  if (!sb || (!input.companyId && !input.contactKey)) return
  let query = sb.from(DB_TABLES.SALES_CONTACT_SUPPRESSIONS).select("id").eq("status", "active")
  query = input.companyId ? query.eq("company_id", input.companyId) : query.is("company_id", null)
  query = input.contactKey ? query.eq("contact_key", input.contactKey.toLowerCase()) : query.is("contact_key", null)
  const existing = await query.limit(1).maybeSingle()
  if (existing.error) throw new Error(existing.error.message)
  if (existing.data) return
  const inserted = await sb.from(DB_TABLES.SALES_CONTACT_SUPPRESSIONS).insert({
    company_id: input.companyId,
    contact_key: input.contactKey?.toLowerCase() ?? null,
    channel: "all",
    scope: input.companyId ? "company" : "contact",
    reason_code: "inbound_unsubscribe",
    reason: input.reason,
    status: "active",
    created_by_key: `automation:${input.source}`,
    created_by_email: null,
  })
  if (inserted.error) throw new Error(inserted.error.message)
}

function uuidFromRecords(keys: string[], ...records: JsonRecord[]): string | null {
  for (const record of records) {
    const value = text(record, keys)
    if (value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      return value
    }
  }
  return null
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24)
}

function postOutreachIdempotencyKey(input: {
  source: "chatwoot" | "livekit"
  payload: JsonRecord
  summary: JsonRecord
}): string {
  const candidate =
    text(input.summary, ["conversationId", "conversation_id", "roomName", "room_name", "eventId", "event_id"]) ??
    text(input.payload, ["id", "event_id", "conversation_id", "room_name"])
  return `post-outreach-${input.source}-${candidate ?? stableHash({ payload: input.payload, summary: input.summary })}`
}

export async function processInboundReply(input: {
  source: "chatwoot" | "livekit"
  payload: JsonRecord
  summary: JsonRecord
}): Promise<{ ok: boolean; error: string | null; classification?: { intent: string; shouldFollowUp: boolean; queuedForHumanReview: boolean } }> {
  const address = text(input.summary, ["from", "sender", "email", "from_address", "contact_email"]) ?? "unknown"
  const subject = text(input.summary, ["subject", "title"]) ?? ""
  const body = text(input.summary, ["body", "content", "message", "text"]) ?? ""

  if (body.length === 0 && subject.length === 0) {
    console.warn("[post-outreach-webhook] inbound reply has no body or subject — skipping classification")
    return { ok: true, error: null, classification: { intent: "empty", shouldFollowUp: false, queuedForHumanReview: false } }
  }

  const classification = await classifyReply(address, subject, body)

  const companyId = companyIdFromRecords(input.summary, input.payload)
  const pipelineRunId = pipelineRunIdFromRecords(input.summary, input.payload)

  if (classification.intent === "unsubscribe") {
    await persistContactSuppression({
      companyId,
      contactKey: address === "unknown" ? null : address,
      source: input.source,
      reason: `Unsubscribe intent classified from inbound ${input.source} reply.`,
    })
  }

  await updatePipelineReplySteps({
    pipelineRunId,
    classification,
    summary: { provider: input.source, subject, address },
  })

  if (classification.shouldNotifyOperator || classification.intent === "unknown") {
    await notifyOperator({
      companyId,
      pipelineRunId,
      intent: classification.intent,
      summary: classification.summary,
      address,
      subject,
    })
  }

  return {
    ok: true,
    error: null,
    classification: {
      intent: classification.intent,
      shouldFollowUp: classification.shouldFollowUp,
      queuedForHumanReview: classification.intent === "unknown",
    },
  }
}

async function notifyOperator(input: {
  companyId: string | null
  pipelineRunId: string | null
  intent: string
  summary: string
  address: string
  subject: string
}): Promise<void> {
  try {
    const { notifyBothChannels } = await import("@/lib/notify")
    await notifyBothChannels("sales", {
      title: `📬 返信あり: ${input.intent} (${input.address})`,
      message: input.subject || input.summary,
      link: "https://twenty.paradigmjp.com",
      type: "post_outreach_reply",
    })
  } catch (e) {
    console.error("[post-outreach-webhook] operator notification failed:", e instanceof Error ? e.message : String(e))
  }
}

async function updatePipelineReplySteps(input: {
  pipelineRunId: string | null | undefined
  classification: Awaited<ReturnType<typeof classifyReply>>
  summary: JsonRecord
}): Promise<void> {
  if (!input.pipelineRunId) return
  const sb = getServiceSalesSupabase()
  if (!sb) return
  const now = new Date().toISOString()
  const { intent, shouldFollowUp, summary: classificationSummary } = input.classification

  const reply = await sb
    .from(DB_TABLES.SALES_PIPELINE_STEPS)
    .update({
      status: "completed",
      completed_at: now,
      output_payload: { received_at: now, intent, classification: classificationSummary, summary: input.summary },
    })
    .eq("run_id", input.pipelineRunId)
    .eq("step_key", "reply_capture")
  if (reply.error) console.error("[post-outreach-webhook] reply pipeline step update failed:", reply.error.message)

  const followUp = await sb
    .from(DB_TABLES.SALES_PIPELINE_STEPS)
    .update({
      status: shouldFollowUp ? "queued" : (intent === "unsubscribe" || intent === "not_interested" ? "completed" : "needs_review"),
      completed_at: shouldFollowUp ? null : now,
      output_payload: { intent, should_follow_up: shouldFollowUp, classification: classificationSummary },
    })
    .eq("run_id", input.pipelineRunId)
    .eq("step_key", "follow_up_queue")
  if (followUp.error) console.error("[post-outreach-webhook] follow-up pipeline step update failed:", followUp.error.message)

  const runStatus = intent === "unsubscribe" || intent === "not_interested" ? "completed" : shouldFollowUp ? "needs_review" : "needs_review"
  const run = await sb
    .from(DB_TABLES.SALES_PIPELINE_RUNS)
    .update({
      status: runStatus,
      current_step: shouldFollowUp ? "follow_up_queue" : null,
      completed_at: intent === "unsubscribe" || intent === "not_interested" ? now : null,
      result_payload: { reply_received_at: now, intent, should_follow_up: shouldFollowUp },
    })
    .eq("id", input.pipelineRunId)
  if (run.error) console.error("[post-outreach-webhook] pipeline run reply update failed:", run.error.message)
}


export async function persistPostOutreachEvent(input: PersistPostOutreachEventInput): Promise<{ ok: boolean; error: string | null }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, error: "Supabase service role not configured" }

  const now = new Date().toISOString()
  const { error: activityError } = await insertWithOptionalColumns(sb, DB_TABLES.SALES_ACTIVITY_LOG, {
    region: input.region,
    company_id: input.companyId,
    pipeline_run_id: input.pipelineRunId ?? null,
    activity_type: input.activityType,
    subject: input.subject,
    body: input.body,
    result: input.result,
    occurred_at: now,
    last_synced: now,
    meta: input.meta,
  }, ["pipeline_run_id"])

  if (activityError) {
    console.error("[post-outreach-webhook] sales_activity_log insert failed:", activityError.message)
    return { ok: false, error: activityError.message ?? "sales_activity_log insert failed" }
  }

  if (input.result === "unsubscribe") {
    const contactKey = text(input.meta, ["from", "sender", "email", "contact_email"])
    try {
      await persistContactSuppression({
        companyId: input.companyId,
        contactKey,
        source: text(input.meta, ["provider"]) ?? "post_outreach",
        reason: "Unsubscribe result received from a post-outreach webhook.",
      })
    } catch (error) {
      console.error("[post-outreach-webhook] durable suppression failed:", error)
      return { ok: false, error: error instanceof Error ? error.message : "Durable suppression failed" }
    }
  }

  await updatePipelineReplySteps({
    pipelineRunId: input.pipelineRunId,
    classification: {
      intent: input.result === "interested" ? "interested" : input.result === "declined" ? "not_interested" : "unknown",
      confidence: "medium",
      shouldFollowUp: input.result === "interested",
      shouldNotifyOperator: false,
      queueType: input.result === "interested" ? "follow_up" : null,
      summary: `persist_${input.result}`,
      raw: null,
    },
    summary: {
      activity_type: input.activityType,
      result: input.result,
      subject: input.subject,
      provider: input.meta.provider,
      automation_forwarded: input.meta.automationForwarded,
    },
  })

  if (!input.queueType) return { ok: true, error: null }

  const { error: queueError } = await sb.from(DB_TABLES.SALES_OPERATOR_QUEUE_ITEMS).insert({
    region: input.region,
    company_id: input.companyId,
    queue_type: input.queueType,
    title: input.subject ?? `Post-outreach: ${input.queueType}`,
    pipeline_run_id: input.pipelineRunId ?? null,
    priority: input.queuePriority,
    status: "open",
    source_tool: null,
    target_tool: null,
    meta: {
      reason: input.queueReason,
      source: input.meta.provider,
      activity_subject: input.subject,
      event: input.meta.eventType,
      automation_forwarded: input.meta.automationForwarded,
      automation_error: input.meta.automationError,
      pipeline_run_id: input.pipelineRunId ?? null,
    },
  })

  if (queueError) {
    console.error("[post-outreach-webhook] sales_operator_queue_items insert failed:", queueError.message)
    return { ok: false, error: queueError.message }
  }

  return { ok: true, error: null }
}
