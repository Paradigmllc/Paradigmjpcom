import "server-only"

import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import type { ManualMessageAngleSelection } from "./manual-japan-entry-angle"
import type { ManualMessageVariantSelection } from "./manual-japan-entry-experiment"
import {
  MANUAL_WORK_BATCH_DRAIN_SIZE,
  type ManualWorkBatchQueueSummary,
  type ManualWorkBatchItemRow,
  type ManualWorkBatchItemStatus,
  type ManualWorkBatchRow,
  type ManualWorkBatchSnapshot,
} from "./manual-japan-entry-batch-types"

function client() {
  const supabase = getServiceSalesSupabase()
  if (!supabase) throw new Error("Sales Supabase is not configured")
  return supabase
}

const ITEM_STATUSES: ManualWorkBatchItemStatus[] = [
  "queued",
  "processing",
  "completed",
  "needs_review",
  "rejected",
  "failed",
  "duplicate",
]

function snapshot(batch: ManualWorkBatchRow, items: ManualWorkBatchItemRow[]): ManualWorkBatchSnapshot {
  const counts = Object.fromEntries(ITEM_STATUSES.map((status) => [status, 0])) as Record<ManualWorkBatchItemStatus, number>
  for (const item of items) counts[item.status] += 1
  const remaining = counts.queued + counts.processing
  return { batch, items, counts, remaining, finished: items.length - remaining }
}

export async function getManualWorkBatch(id: string): Promise<ManualWorkBatchSnapshot | null> {
  const [{ data: batch, error: batchError }, { data: items, error: itemsError }] = await Promise.all([
    client().from(DB_TABLES.MANUAL_JAPAN_ENTRY_BATCHES).select("*").eq("id", id).maybeSingle(),
    client().from(DB_TABLES.MANUAL_JAPAN_ENTRY_BATCH_ITEMS).select("*").eq("batch_id", id).order("position"),
  ])
  if (batchError) throw new Error(batchError.message)
  if (itemsError) throw new Error(itemsError.message)
  return batch ? snapshot(batch as ManualWorkBatchRow, (items ?? []) as ManualWorkBatchItemRow[]) : null
}

export async function getLatestActiveManualWorkBatch(): Promise<ManualWorkBatchSnapshot | null> {
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_BATCHES)
    .select("id")
    .in("status", ["queued", "running"])
    .order("status", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return typeof data?.id === "string" ? getManualWorkBatch(data.id) : null
}

export async function getManualWorkBatchQueueSummary(): Promise<ManualWorkBatchQueueSummary> {
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_BATCHES)
    .select("id,status,total_count")
    .in("status", ["queued", "running"])
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as Array<{ id: string; status: ManualWorkBatchRow["status"]; total_count: number }>
  const queued = rows.filter((row) => row.status === "queued")
  return {
    batchCount: rows.length,
    companyCount: rows.reduce((total, row) => total + row.total_count, 0),
    runningBatchId: rows.find((row) => row.status === "running")?.id ?? null,
    queuedBatchCount: queued.length,
    queuedCompanyCount: queued.reduce((total, row) => total + row.total_count, 0),
  }
}

export async function getManualWorkBatchQueuePosition(batchId: string): Promise<number> {
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_BATCHES)
    .select("id,status,created_at")
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: true })
  if (error) throw new Error(error.message)
  const position = (data ?? []).findIndex((row) => row.id === batchId)
  return position < 0 ? 0 : position
}

export async function promoteNextManualWorkBatch(): Promise<{
  snapshot: ManualWorkBatchSnapshot
  promoted: boolean
} | null> {
  const { data, error } = await client().rpc("manual_japan_entry_promote_next_batch")
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] as { batch_id?: unknown; promoted?: unknown } | undefined : undefined
  if (!row || typeof row.batch_id !== "string") return null
  const promoted = await getManualWorkBatch(row.batch_id)
  if (!promoted) throw new Error("Promoted manual work batch could not be read back")
  return { snapshot: promoted, promoted: row.promoted === true }
}

export async function claimManualWorkBatchDrain(batchId: string): Promise<string | null> {
  const { data, error } = await client().rpc("manual_japan_entry_claim_batch_drain", { p_batch_id: batchId })
  if (error) throw new Error(error.message)
  return typeof data === "string" ? data : null
}

export async function releaseManualWorkBatchDrain(batchId: string, claimToken: string): Promise<void> {
  const { data, error } = await client().rpc("manual_japan_entry_release_batch_drain", {
    p_batch_id: batchId,
    p_claim_token: claimToken,
  })
  if (error) throw new Error(error.message)
  if (data !== true) throw new Error("Manual work batch drain claim is stale")
}

export async function createManualWorkBatch(input: {
  urls: Array<{ inputUrl: string; canonicalUrl: string; domain: string }>
  variant: ManualMessageVariantSelection
  angle: ManualMessageAngleSelection
  sourceSlug: string
  sourcePageUrl: string | null
  observedOn: string | null
}): Promise<ManualWorkBatchSnapshot> {
  const { data, error } = await client().rpc("manual_japan_entry_create_batch", {
    p_items: input.urls.map((url) => ({
      input_url: url.inputUrl,
      canonical_url: url.canonicalUrl,
      domain: url.domain,
    })),
    p_message_variant: input.variant,
    p_message_angle: input.angle,
    p_source_slug: input.sourceSlug,
    p_source_page_url: input.sourcePageUrl,
    p_observed_on: input.observedOn,
  })
  if (error) throw new Error(error.message)
  if (typeof data !== "string") throw new Error("Manual work batch ID was not returned")
  const created = await getManualWorkBatch(data)
  if (!created) throw new Error("Created manual work batch could not be read back")
  return created
}

export async function claimManualWorkBatchItems(batchId: string): Promise<ManualWorkBatchItemRow[]> {
  const { data, error } = await client().rpc("manual_japan_entry_claim_batch_items", {
    p_batch_id: batchId,
    p_limit: MANUAL_WORK_BATCH_DRAIN_SIZE,
  })
  if (error) throw new Error(error.message)
  return (data ?? []) as ManualWorkBatchItemRow[]
}

export async function completeManualWorkBatchItem(input: {
  itemId: string
  claimToken: string
  status: Exclude<ManualWorkBatchItemStatus, "queued" | "processing">
  workId: string | null
  errorMessage: string | null
}): Promise<void> {
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_BATCH_ITEMS)
    .update({
      status: input.status,
      work_id: input.workId,
      error_message: input.errorMessage,
      finished_at: new Date().toISOString(),
    })
    .eq("id", input.itemId)
    .eq("claim_token", input.claimToken)
    .eq("status", "processing")
    .select("id")
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error("Manual work batch item claim is stale")
}

export async function refreshManualWorkBatch(batchId: string): Promise<ManualWorkBatchSnapshot> {
  const { error } = await client().rpc("manual_japan_entry_refresh_batch", { p_batch_id: batchId })
  if (error) throw new Error(error.message)
  const refreshed = await getManualWorkBatch(batchId)
  if (!refreshed) throw new Error("Manual work batch was not found")
  return refreshed
}

export async function markManualWorkBatchNotified(batchId: string): Promise<boolean> {
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_BATCHES)
    .update({ notified_at: new Date().toISOString() })
    .eq("id", batchId)
    .is("notified_at", null)
    .select("id")
    .maybeSingle()
  if (error) throw new Error(error.message)
  return Boolean(data)
}

export async function recordManualWorkBatchDispatchError(batchId: string, errorMessage: string): Promise<void> {
  const { error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_BATCHES)
    .update({ last_error: errorMessage.slice(0, 2_000) })
    .eq("id", batchId)
  if (error) throw new Error(error.message)
}

export async function clearManualWorkBatchDispatchError(batchId: string): Promise<void> {
  const { error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_BATCHES)
    .update({ last_error: null })
    .eq("id", batchId)
  if (error) throw new Error(error.message)
}
