import { notifyBothChannels, notifySlackResult } from "@/lib/notify"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { createLeadInventoryRun, startLeadInventoryRun } from "./lead-inventory-runs"
import { DB_TABLES } from "./db-tables"

type SalesSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>
type OutboxRow = {
  id: string
  case_id: string | null
  destination: "db_bell" | "slack" | "email" | "workflow" | "source_ingest"
  event_type: string
  payload: Record<string, unknown>
  attempts: number
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

async function queueSourceRuns(supabase: SalesSupabase) {
  const { data, error } = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_SOURCE_LINKS)
    .select("id,source_config_id,cadence_hours").eq("active", true).lte("next_checked_at", new Date().toISOString()).limit(50)
  if (error) throw new Error(error.message)
  const links = data ?? []
  if (links.length === 0) return { queued: 0, runId: null }
  const run = await createLeadInventoryRun({
    operatorName: "Japan operator source automation",
    sourceConfigIds: links.map((link) => link.source_config_id),
  })
  startLeadInventoryRun(run.id)
  const checkedAt = new Date()
  for (const link of links) {
    const nextCheckedAt = new Date(checkedAt.getTime() + link.cadence_hours * 3_600_000).toISOString()
    const update = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_SOURCE_LINKS).update({
      last_checked_at: checkedAt.toISOString(), next_checked_at: nextCheckedAt,
      last_result: { status: "queued", inventory_run_id: run.id }, updated_at: checkedAt.toISOString(),
    }).eq("id", link.id)
    if (update.error) console.error("[japan-operator-automation] source link update failed:", update.error.message)
  }
  return { queued: links.length, runId: run.id }
}

async function queueSlaReminders(supabase: SalesSupabase) {
  const now = new Date()
  const threshold = new Date(now.getTime() + 24 * 3_600_000).toISOString()
  const { data, error } = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_CASES)
    .select("id,stage,status,owner,next_action,next_action_due_at,company_id")
    .in("status", ["active", "on_hold"]).not("next_action_due_at", "is", null).lte("next_action_due_at", threshold).limit(200)
  if (error) throw new Error(error.message)
  let queued = 0
  for (const operatorCase of data ?? []) {
    const dueAt = String(operatorCase.next_action_due_at)
    const severity = new Date(dueAt).getTime() < now.getTime() ? "overdue" : "due_soon"
    const dedupKey = `sla:${operatorCase.id}:${dueAt}:workflow`
    const result = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_OUTBOX).upsert({
      case_id: operatorCase.id, dedup_key: dedupKey, event_type: `operator_${severity}`, destination: "workflow",
      payload: { case_id: operatorCase.id, company_id: operatorCase.company_id, stage: operatorCase.stage,
        owner: operatorCase.owner, next_action: operatorCase.next_action, due_at: dueAt, severity },
    }, { onConflict: "dedup_key", ignoreDuplicates: true })
    if (result.error) console.error("[japan-operator-automation] SLA outbox insert failed:", result.error.message)
    else queued += 1
  }
  return queued
}

async function deliverOutbox(supabase: SalesSupabase, row: OutboxRow): Promise<void> {
  const title = text(row.payload.title, row.event_type === "operator_incident" ? "Japan代理店OSインシデント" : "Japan代理店OS期限通知")
  const message = text(row.payload.message, `${text(row.payload.stage, "案件")} / ${text(row.payload.next_action, "対応内容を確認してください")}`)
  if (row.destination === "email" || row.destination === "source_ingest") throw new Error(`Unsupported outbound destination: ${row.destination}`)
  if (row.destination === "slack") {
    const result = await notifySlackResult(`${title}: ${message}`, { clientMessageId: `operator-outbox-${row.id}` })
    if (!result.ok) throw new Error(result.error ?? "Slack notification failed")
    return
  }
  if (row.destination === "db_bell") {
    const result = await supabase.from(DB_TABLES.SALES_OPERATOR_QUEUE_ITEMS).insert({
      region: "global", queue_type: "analysis", title, priority: row.payload.severity === "critical" ? 100 : 90,
      status: "open", source_tool: "supabase", target_tool: null,
      meta: { ...row.payload, type: row.event_type, outbox_id: row.id, link: "/ja/admin/opportunity-briefs" },
    })
    if (result.error) throw new Error(result.error.message)
    return
  }
  const result = await notifyBothChannels(`${title}: ${message}`, {
    title, message, link: "/ja/admin/opportunity-briefs", type: row.event_type, region: "global",
    priority: row.payload.severity === "overdue" ? 95 : 85, leadId: row.case_id ?? undefined,
    idempotencyKey: `operator-outbox:${row.id}`, clientMessageId: `operator-outbox-${row.id}`,
  })
  if (!result.ok) throw new Error(`Dual notification degraded: ${result.slack.error ?? result.database.error ?? "unknown"}`)
}

async function processOutbox(supabase: SalesSupabase, limit: number) {
  const worker = `operator-api:${process.pid}`
  const { data, error } = await supabase.rpc("sales_claim_japan_operator_outbox_v1", { p_worker: worker, p_limit: limit })
  if (error) throw new Error(error.message)
  const rows = (Array.isArray(data) ? data : data ? [data] : []) as OutboxRow[]
  let sent = 0
  let retried = 0
  for (const row of rows) {
    try {
      await deliverOutbox(supabase, row)
      const update = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_OUTBOX).update({
        status: "sent", sent_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString(),
      }).eq("id", row.id).eq("status", "processing")
      if (update.error) throw new Error(update.error.message)
      sent += 1
    } catch (error) {
      console.error("[japan-operator-automation] outbox delivery failed:", row.id, error)
      const dead = row.attempts >= 5
      const delayMinutes = Math.min(60, 2 ** Math.max(1, row.attempts))
      const update = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_OUTBOX).update({
        status: dead ? "dead_letter" : "retry", last_error: error instanceof Error ? error.message : String(error),
        next_attempt_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", row.id)
      if (update.error) console.error("[japan-operator-automation] outbox retry persistence failed:", update.error.message)
      retried += 1
    }
  }
  return { claimed: rows.length, sent, retried }
}

export async function runJapanOperatorAutomation(input: { sourceRuns?: boolean; outboxLimit?: number } = {}) {
  const supabase = getServiceSalesSupabase()
  if (!supabase) throw new Error("Supabase service role not configured")
  const sources = input.sourceRuns === false ? { queued: 0, runId: null } : await queueSourceRuns(supabase)
  const slaQueued = await queueSlaReminders(supabase)
  const outbox = await processOutbox(supabase, Math.min(Math.max(input.outboxLimit ?? 25, 1), 100))
  return { sources, slaQueued, outbox, ranAt: new Date().toISOString() }
}
