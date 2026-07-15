import "server-only"

import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
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

export async function createManualWork(input: {
  inputUrl: string
  canonicalUrl: string
  domain: string
}): Promise<ManualJapanEntryWorkRow> {
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_WORK)
    .insert({
      input_url: input.inputUrl,
      canonical_url: input.canonicalUrl,
      domain: input.domain,
      status: "processing",
      stage: "fetching",
    })
    .select("*")
    .single()
  if (error) throw new Error(error.message)
  return row(data)
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
