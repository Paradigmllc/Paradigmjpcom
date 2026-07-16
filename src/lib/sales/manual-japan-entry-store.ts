import "server-only"

import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { summarizeManualWorkExperiment, type ManualExperimentMetric, type ManualMessageVariant } from "./manual-japan-entry-experiment"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"

function client() {
  const supabase = getServiceSalesSupabase()
  if (!supabase) throw new Error("Sales Supabase is not configured")
  return supabase
}

function row(value: unknown): ManualJapanEntryWorkRow {
  return value as ManualJapanEntryWorkRow
}

export async function listManualJapanEntryWork(limit = 100): Promise<ManualJapanEntryWorkRow[]> {
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_WORK)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 200)))
  if (error) throw new Error(error.message)
  return (data ?? []).map(row)
}

export async function findManualWorkByDomain(domain: string): Promise<ManualJapanEntryWorkRow | null> {
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_WORK)
    .select("*")
    .eq("domain", domain)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? row(data) : null
}

export async function findManualWorkByReportToken(token: string): Promise<ManualJapanEntryWorkRow | null> {
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_WORK)
    .select("*")
    .eq("report_token", token)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? row(data) : null
}

export async function findManualWorkById(id: string): Promise<ManualJapanEntryWorkRow | null> {
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_WORK)
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? row(data) : null
}

export async function listManualWorkExperimentMetrics(): Promise<ManualExperimentMetric[]> {
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_WORK)
    .select("message_variant, manually_sent_at, reply_received_at, founder_forwarded_at, meeting_converted_at")
    .order("created_at", { ascending: false })
    .limit(1_000)
  if (error) throw new Error(error.message)
  return summarizeManualWorkExperiment((data ?? []) as Array<Pick<
    ManualJapanEntryWorkRow,
    "message_variant" | "manually_sent_at" | "reply_received_at" | "founder_forwarded_at" | "meeting_converted_at"
  >>)
}

export async function createManualWork(input: {
  inputUrl: string
  canonicalUrl: string
  domain: string
  messageVariantRequested: ManualMessageVariant
}): Promise<ManualJapanEntryWorkRow> {
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_WORK)
    .insert({
      input_url: input.inputUrl,
      canonical_url: input.canonicalUrl,
      domain: input.domain,
      message_variant_requested: input.messageVariantRequested,
      message_variant: input.messageVariantRequested,
      status: "processing",
      stage: "fetching",
    })
    .select("*")
    .single()
  if (error) throw new Error(error.message)
  return row(data)
}


export const MANUAL_WORK_OUTCOMES = ["manually_sent", "reply_received", "founder_forwarded", "meeting_converted"] as const
export type ManualWorkOutcome = (typeof MANUAL_WORK_OUTCOMES)[number]

export async function recordManualWorkOutcome(input: {
  id: string
  outcome: ManualWorkOutcome
  value: boolean
}): Promise<ManualJapanEntryWorkRow> {
  const current = await findManualWorkById(input.id)
  if (!current) throw new Error("Manual work item was not found")
  if (input.outcome !== "manually_sent" && input.value && !current.manually_sent_at) {
    throw new Error("手動フォーム送信済みを先に記録してください")
  }
  const now = new Date().toISOString()
  if (input.outcome === "manually_sent") {
    return updateManualWork(input.id, input.value ? { manually_sent_at: now } : {
      manually_sent_at: null,
      reply_received_at: null,
      founder_forwarded_at: null,
      meeting_converted_at: null,
    })
  }
  const field = `${input.outcome}_at`
  return updateManualWork(input.id, { [field]: input.value ? now : null })
}
export async function updateManualWork(
  id: string,
  patch: Record<string, unknown>,
): Promise<ManualJapanEntryWorkRow> {
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_WORK)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single()
  if (error) throw new Error(error.message)
  return row(data)
}
