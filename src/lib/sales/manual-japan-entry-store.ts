import "server-only"

import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { summarizeManualWorkExperiment, type ManualExperimentMetric, type ManualMessageVariant } from "./manual-japan-entry-experiment"
import {
  summarizeManualWorkAngles,
  type ManualAngleMetric,
  type ManualMessageAngle,
} from "./manual-japan-entry-angle"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"
import type {
  ManualLeadSourceCatalogRow,
  ManualWorkSourceAttribution,
  ManualWorkSourceInput,
} from "./manual-japan-entry-source-ledger"

function client() {
  const supabase = getServiceSalesSupabase()
  if (!supabase) throw new Error("Sales Supabase is not configured")
  return supabase
}

function row(value: unknown): ManualJapanEntryWorkRow {
  const record = value as ManualJapanEntryWorkRow
  return { ...record, source_attributions: Array.isArray(record.source_attributions) ? record.source_attributions : [] }
}

async function hydrateSources(rows: ManualJapanEntryWorkRow[]): Promise<ManualJapanEntryWorkRow[]> {
  if (rows.length === 0) return rows
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_WORK_SOURCES)
    .select("*")
    .in("work_id", rows.map((item) => item.id))
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  const byWork = new Map<string, ManualWorkSourceAttribution[]>()
  for (const value of data ?? []) {
    const source = value as ManualWorkSourceAttribution
    byWork.set(source.work_id, [...(byWork.get(source.work_id) ?? []), source])
  }
  return rows.map((item) => ({ ...item, source_attributions: byWork.get(item.id) ?? [] }))
}

export async function listManualJapanEntryWork(limit = 100): Promise<ManualJapanEntryWorkRow[]> {
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_WORK)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 200)))
  if (error) throw new Error(error.message)
  return hydrateSources((data ?? []).map(row))
}

export async function listManualLeadSourceCatalog(): Promise<ManualLeadSourceCatalogRow[]> {
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_SOURCE_CATALOG)
    .select("slug,name,tier,roles,sectors,source_url,access_mode,priority,active,notes")
    .eq("active", true)
    .order("priority", { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as ManualLeadSourceCatalogRow[]
}

export async function findManualLeadSource(slug: string): Promise<ManualLeadSourceCatalogRow | null> {
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_SOURCE_CATALOG)
    .select("slug,name,tier,roles,sectors,source_url,access_mode,priority,active,notes")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as ManualLeadSourceCatalogRow | null
}

export async function attachManualWorkSource(
  workId: string,
  input: ManualWorkSourceInput,
): Promise<void> {
  const source = await findManualLeadSource(input.sourceSlug)
  if (!source) throw new Error("選択した営業ソースは台帳に存在しません")
  const { error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_WORK_SOURCES)
    .upsert({
      work_id: workId,
      source_slug: source.slug,
      source_page_url: input.sourcePageUrl?.trim() ?? "",
      observed_on: input.observedOn ?? new Date().toISOString().slice(0, 10),
    }, { onConflict: "work_id,source_slug,source_page_url", ignoreDuplicates: true })
  if (error) throw new Error(error.message)
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

export async function listManualWorkAngleMetrics(): Promise<ManualAngleMetric[]> {
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_WORK)
    .select("message_angle, manually_sent_at, reply_received_at, founder_forwarded_at, meeting_converted_at")
    .order("created_at", { ascending: false })
    .limit(1_000)
  if (error) throw new Error(error.message)
  return summarizeManualWorkAngles((data ?? []) as Array<Pick<
    ManualJapanEntryWorkRow,
    "message_angle" | "manually_sent_at" | "reply_received_at" | "founder_forwarded_at" | "meeting_converted_at"
  >>)
}

export async function createManualWork(input: {
  inputUrl: string
  canonicalUrl: string
  domain: string
  messageVariantRequested: ManualMessageVariant
  messageAngleRequested: ManualMessageAngle
}): Promise<ManualJapanEntryWorkRow> {
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_WORK)
    .insert({
      input_url: input.inputUrl,
      canonical_url: input.canonicalUrl,
      domain: input.domain,
      message_variant_requested: input.messageVariantRequested,
      message_variant: input.messageVariantRequested,
      message_angle_requested: input.messageAngleRequested,
      message_angle: input.messageAngleRequested,
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
