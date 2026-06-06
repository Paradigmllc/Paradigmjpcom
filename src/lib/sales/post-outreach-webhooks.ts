import { createHash } from "node:crypto"
import { getServiceSalesSupabase } from "@/lib/supabase"

export type JsonRecord = Record<string, unknown>
export type SalesPostOutreachRegion = "jp" | "global"
export type SalesActivityType = "email" | "call" | "meeting" | "note" | "sms" | "linkedin" | "demo" | "follow_up"
export type SalesActivityResult = "success" | "no_answer" | "follow_up" | "declined" | "completed"
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

export async function forwardPostOutreachToTriggerDev(input: {
  taskId: string | null
  source: "chatwoot" | "livekit"
  payload: JsonRecord
  summary: JsonRecord
}): Promise<TriggerDevForwardResult> {
  if (!input.taskId) return { ok: false, error: "Trigger.dev post outreach task ID not configured" }

  const secretKey = process.env.TRIGGER_SECRET_KEY ?? process.env.TRIGGER_ACCESS_TOKEN ?? process.env.TRIGGER_DEV_API_KEY
  if (!secretKey || secretKey.trim().length === 0) {
    console.error("[post-outreach-webhook] TRIGGER_SECRET_KEY is not configured for outbound forwarding")
    return { ok: false, error: "Trigger.dev secret key not configured" }
  }

  const apiUrl = (process.env.TRIGGER_API_URL ?? "https://api.trigger.dev").replace(/\/+$/, "")
  const endpoint = `${apiUrl}/api/v1/tasks/${encodeURIComponent(input.taskId)}/trigger`

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        payload: {
          source: input.source,
          received_at: new Date().toISOString(),
          summary: input.summary,
          payload: input.payload,
        },
        context: { source: "revenue-os", webhookSource: input.source },
        options: {
          idempotencyKey: postOutreachIdempotencyKey(input),
        },
      }),
      signal: AbortSignal.timeout(8_000),
    })

    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `Trigger.dev HTTP ${res.status}: ${text.slice(0, 200)}` }
    }
    return { ok: true, error: null }
  } catch (error) {
    console.error("[post-outreach-webhook] Trigger.dev forwarding failed:", error)
    return { ok: false, error: error instanceof Error ? error.message : "Trigger.dev forwarding failed" }
  }
}

async function updatePipelineReplySteps(input: {
  pipelineRunId: string | null | undefined
  queuedForFollowUp: boolean
  summary: JsonRecord
}): Promise<void> {
  if (!input.pipelineRunId) return
  const sb = getServiceSalesSupabase()
  if (!sb) return
  const now = new Date().toISOString()
  const reply = await sb
    .from("sales_pipeline_steps")
    .update({
      status: "completed",
      completed_at: now,
      output_payload: { received_at: now, summary: input.summary },
    })
    .eq("run_id", input.pipelineRunId)
    .eq("step_key", "reply_capture")
  if (reply.error) console.error("[post-outreach-webhook] reply pipeline step update failed:", reply.error.message)

  const followUp = await sb
    .from("sales_pipeline_steps")
    .update({
      status: input.queuedForFollowUp ? "needs_review" : "completed",
      completed_at: now,
      output_payload: { queued_for_follow_up: input.queuedForFollowUp, summary: input.summary },
    })
    .eq("run_id", input.pipelineRunId)
    .eq("step_key", "follow_up_queue")
  if (followUp.error) console.error("[post-outreach-webhook] follow-up pipeline step update failed:", followUp.error.message)

  const run = await sb
    .from("sales_pipeline_runs")
    .update({
      status: input.queuedForFollowUp ? "needs_review" : "completed",
      current_step: input.queuedForFollowUp ? "follow_up_queue" : null,
      completed_at: input.queuedForFollowUp ? null : now,
      result_payload: { reply_received_at: now, queued_for_follow_up: input.queuedForFollowUp },
    })
    .eq("id", input.pipelineRunId)
  if (run.error) console.error("[post-outreach-webhook] pipeline run reply update failed:", run.error.message)
}


export async function persistPostOutreachEvent(input: PersistPostOutreachEventInput): Promise<{ ok: boolean; error: string | null }> {
  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, error: "Supabase service role not configured" }

  const now = new Date().toISOString()
  const { error: activityError } = await sb.from("sales_activity_log").insert({
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
  })

  if (activityError) {
    console.error("[post-outreach-webhook] sales_activity_log insert failed:", activityError.message)
    return { ok: false, error: activityError.message }
  }

  await updatePipelineReplySteps({
    pipelineRunId: input.pipelineRunId,
    queuedForFollowUp: Boolean(input.queueType),
    summary: {
      activity_type: input.activityType,
      result: input.result,
      subject: input.subject,
      provider: input.meta.provider,
      automation_forwarded: input.meta.automationForwarded,
    },
  })

  if (!input.queueType) return { ok: true, error: null }

  const { error: queueError } = await sb.from("sales_operator_queue_items").insert({
    region: input.region,
    company_id: input.companyId,
    pipeline_run_id: input.pipelineRunId ?? null,
    queue_type: input.queueType,
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
