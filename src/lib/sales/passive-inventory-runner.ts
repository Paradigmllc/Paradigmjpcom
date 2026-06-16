import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { optionalEnv } from "./japan-readiness-utils"
import { fetchPassiveInventoryDomains, passivePatterns, processPassiveInventoryDomainBatch, getPassiveInventoryConfiguration } from "./passive-inventory"
import { fetchZoneDomains } from "./sources/czds-zone-files"
import { fetchCommonCrawlDomains } from "./sources/commoncrawl-domains"
import { fetchTrancoTopDomains } from "./sources/tranco-top-domains"
import { fetchPassiveDomainFeeds } from "./sources/passive-domain-feeds"

type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>
type JsonRecord = Record<string, unknown>

const DEFAULT_SEGMENT_LIMIT = 5_000
const MAX_SEGMENT_LIMIT = 100_000
const DEFAULT_MAX_SEGMENTS = 3
const STALE_SEGMENT_MINUTES = 30

interface PassiveRunRow {
  id: string
  country_code: string
  technology: string | null
  requested_limit: number
  zone_patterns: string[]
  cursor?: JsonRecord | null
}

interface PassiveSegmentRow {
  id: string
  run_id: string
  segment_key: string
  source_kind: string
  pattern: string
  batch_limit: number
  attempts: number
  cursor?: JsonRecord | null
}

export interface StartPassiveInventoryRunInput {
  countryCode: string
  technology?: string | null
  limit?: number
  segmentLimit?: number
  patterns?: string[]
}

function getSb(): ServiceSupabase {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")
  return sb
}

function nowIso(): string {
  return new Date().toISOString()
}

function normalizeLimit(value: number | undefined, fallback: number, max: number): number {
  return Math.min(Math.max(value ?? fallback, 1), max)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "passive inventory runner failed"
}

async function updateRun(runId: string, patch: JsonRecord): Promise<void> {
  const { error } = await getSb().from(DB_TABLES.SALES_PASSIVE_INVENTORY_RUNS).update({ ...patch, heartbeat_at: nowIso() }).eq("id", runId)
  if (error) throw new Error(error.message)
}

async function refreshRunCounts(runId: string): Promise<{ hasMore: boolean }> {
  const sb = getSb()
  const segmentStatuses = ["queued", "running", "completed", "partial", "failed"] as const
  const segmentCounts = new Map<string, number>()
  const segmentTotals = {
    input: 0,
    checked: 0,
    stackMatched: 0,
    geoMatched: 0,
    persisted: 0,
    failures: 0,
  }
  const segmentRows = await sb
    .from(DB_TABLES.SALES_PASSIVE_INVENTORY_SEGMENTS)
    .select("status, input_count, checked_count, stack_matched_count, geo_matched_count, persisted_count, failure_count")
    .eq("run_id", runId)
  if (segmentRows.error) throw new Error(segmentRows.error.message)
  for (const row of (segmentRows.data ?? []) as Array<Record<string, unknown>>) {
    const status = typeof row.status === "string" ? row.status : "unknown"
    segmentCounts.set(status, (segmentCounts.get(status) ?? 0) + 1)
    segmentTotals.input += Number(row.input_count ?? 0)
    segmentTotals.checked += Number(row.checked_count ?? 0)
    segmentTotals.stackMatched += Number(row.stack_matched_count ?? 0)
    segmentTotals.geoMatched += Number(row.geo_matched_count ?? 0)
    segmentTotals.persisted += Number(row.persisted_count ?? 0)
    segmentTotals.failures += Number(row.failure_count ?? 0)
  }
  for (const status of segmentStatuses) {
    if (!segmentCounts.has(status)) segmentCounts.set(status, 0)
  }
  const hasMore = (segmentCounts.get("queued") ?? 0) > 0 || (segmentCounts.get("running") ?? 0) > 0
  const failed = segmentCounts.get("failed") ?? 0
  await updateRun(runId, {
    status: hasMore ? "running" : failed > 0 ? "partial" : "completed",
    fetched_domains_count: segmentTotals.input,
    cname_checked_count: segmentTotals.checked,
    stack_matched_count: segmentTotals.stackMatched,
    geo_matched_count: segmentTotals.geoMatched,
    errors: segmentTotals.failures > 0 ? [{ key: "passive_inventory_segments", reason: `${segmentTotals.failures} segment source or detection warnings` }] : [],
    completed_at: hasMore ? null : nowIso(),
    cursor: {
      segment_counts: Object.fromEntries(segmentCounts.entries()),
      segment_totals: segmentTotals,
      configuration: getPassiveInventoryConfiguration(),
    },
  })
  return { hasMore }
}

export async function startPassiveInventoryRun(input: StartPassiveInventoryRunInput) {
  const sb = getSb()
  const countryCode = input.countryCode.trim().toUpperCase()
  const technology = input.technology?.trim() || null
  const limit = normalizeLimit(input.limit, 100_000, 10_000_000)
  const patterns = input.patterns && input.patterns.length > 0
    ? [...new Set(input.patterns.map((pattern) => pattern.trim()).filter(Boolean))]
    : passivePatterns(countryCode, technology)
  const defaultSegmentLimit = Math.max(DEFAULT_SEGMENT_LIMIT, Math.ceil(limit / Math.max(patterns.length, 1)))
  const segmentLimit = normalizeLimit(input.segmentLimit, defaultSegmentLimit, MAX_SEGMENT_LIMIT)

  const run = await sb.from(DB_TABLES.SALES_PASSIVE_INVENTORY_RUNS).insert({
    source_slug: "passive_inventory",
    status: "queued",
    country_code: countryCode,
    technology,
    requested_limit: limit,
    zone_patterns: patterns,
    started_at: nowIso(),
    heartbeat_at: nowIso(),
    cursor: { segment_limit: segmentLimit, configuration: getPassiveInventoryConfiguration() },
  }).select("id").single()
  if (run.error) throw new Error(run.error.message)
  const runId = String(run.data.id)

  const segments = patterns.map((pattern, index) => ({
    run_id: runId,
    segment_key: `pattern:${pattern}`,
    source_kind: "zone_or_free_bulk",
    pattern,
    priority: Math.max(10, 90 - index),
    batch_limit: segmentLimit,
  }))
  const inserted = await sb.from(DB_TABLES.SALES_PASSIVE_INVENTORY_SEGMENTS).upsert(segments, { onConflict: "run_id,segment_key", ignoreDuplicates: false })
  if (inserted.error) throw new Error(inserted.error.message)
  return { ok: true, runId, countryCode, technology, limit, segmentLimit, segments: segments.length, configuration: getPassiveInventoryConfiguration() }
}

async function loadRun(runId: string): Promise<PassiveRunRow> {
  const { data, error } = await getSb()
    .from(DB_TABLES.SALES_PASSIVE_INVENTORY_RUNS)
    .select("id, country_code, technology, requested_limit, zone_patterns, cursor")
    .eq("id", runId)
    .single()
  if (error) throw new Error(error.message)
  return data as PassiveRunRow
}

async function claimSegments(runId: string, maxSegments: number): Promise<PassiveSegmentRow[]> {
  const cutoff = new Date(Date.now() - STALE_SEGMENT_MINUTES * 60_000).toISOString()
  const { data, error } = await getSb()
    .from(DB_TABLES.SALES_PASSIVE_INVENTORY_SEGMENTS)
    .select("id, run_id, segment_key, source_kind, pattern, batch_limit, attempts, cursor")
    .eq("run_id", runId)
    .or(`status.eq.queued,and(status.eq.running,heartbeat_at.lt.${cutoff})`)
    .lt("attempts", 3)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(maxSegments)
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as PassiveSegmentRow[]
  for (const row of rows) {
    const update = await getSb().from(DB_TABLES.SALES_PASSIVE_INVENTORY_SEGMENTS).update({
      status: "running",
      attempts: row.attempts + 1,
      started_at: nowIso(),
      heartbeat_at: nowIso(),
      locked_at: nowIso(),
      lock_owner: `app:${process.pid}`,
      error_message: null,
    }).eq("id", row.id)
    if (update.error) throw new Error(update.error.message)
  }
  return rows
}

async function fetchSegmentDomains(pattern: string, limit: number) {
  const zone = await fetchZoneDomains([pattern], limit)
  const domains = new Set(zone.domains)
  const sourceStats = [...zone.sourceStats]
  const failures = [...zone.failures]
  let fallbackUsed = false
  let feedUsed = false

  if (domains.size < limit) {
    const feed = await fetchPassiveDomainFeeds(pattern, limit - domains.size)
    feed.domains.forEach((domain) => domains.add(domain))
    sourceStats.push(...feed.sourceStats)
    failures.push(...feed.failures)
    feedUsed = feed.domains.length > 0
  }

  if (domains.size === 0) {
    fallbackUsed = true
    const commonCrawl = await fetchCommonCrawlDomains(pattern, limit)
    commonCrawl.domains.forEach((domain) => domains.add(domain))
    sourceStats.push({ source: "common_crawl_domains", pattern, fetched: commonCrawl.domains.length, total: commonCrawl.total, ok: commonCrawl.ok, error: commonCrawl.error })
    if (!commonCrawl.ok && commonCrawl.error) failures.push({ key: `common_crawl_domains:${pattern}`, reason: commonCrawl.error })
  }

  if (domains.size < limit) {
    const tranco = await fetchTrancoTopDomains(pattern, limit - domains.size)
    tranco.domains.forEach((domain) => domains.add(domain))
    sourceStats.push({ source: "tranco_top_domains", pattern, fetched: tranco.domains.length, total: tranco.total, ok: tranco.ok, error: tranco.error })
    if (!tranco.ok && tranco.error) failures.push({ key: `tranco_top_domains:${pattern}`, reason: tranco.error })
  }

  const sourceLabel = fallbackUsed ? "free_bulk_fallback" : feedUsed && zone.domains.length > 0 ? "zone_and_domain_feed" : feedUsed ? "domain_feed" : "zone_file"
  return { domains: [...domains].sort().slice(0, limit), sourceStats, failures, fallbackUsed, sourceLabel }
}

async function processSegment(run: PassiveRunRow, segment: PassiveSegmentRow) {
  const fetched = await fetchSegmentDomains(segment.pattern, segment.batch_limit)
  await getSb().from(DB_TABLES.SALES_PASSIVE_INVENTORY_SEGMENTS).update({
    input_count: fetched.domains.length,
    cursor: { ...(segment.cursor ?? {}), source_stats: fetched.sourceStats, fallback_used: fetched.fallbackUsed, source_label: fetched.sourceLabel },
    errors: fetched.failures,
    heartbeat_at: nowIso(),
  }).eq("id", segment.id)

  if (fetched.domains.length === 0) {
    await getSb().from(DB_TABLES.SALES_PASSIVE_INVENTORY_SEGMENTS).update({
      status: "partial",
      completed_at: nowIso(),
      error_message: "No domains fetched for segment",
      errors: fetched.failures,
      heartbeat_at: nowIso(),
    }).eq("id", segment.id)
    return { checked: 0, stackMatched: 0, geoMatched: 0, persisted: 0, failures: fetched.failures }
  }

  const batch = await processPassiveInventoryDomainBatch({
    runId: run.id,
    countryCode: run.country_code,
    technology: run.technology,
    domains: fetched.domains,
    sourceLabel: fetched.sourceLabel,
    limit: segment.batch_limit,
    onProgress: async (progress) => {
      await getSb().from(DB_TABLES.SALES_PASSIVE_INVENTORY_SEGMENTS).update({
        heartbeat_at: nowIso(),
        cursor: {
          ...(segment.cursor ?? {}),
          source_stats: fetched.sourceStats,
          fallback_used: fetched.fallbackUsed,
          source_label: fetched.sourceLabel,
          progress,
        },
      }).eq("id", segment.id)
    },
  })
  const failures = [...fetched.failures, ...batch.failures]
  await getSb().from(DB_TABLES.SALES_PASSIVE_INVENTORY_SEGMENTS).update({
    status: failures.length > 0 ? "partial" : "completed",
    checked_count: batch.checked,
    stack_matched_count: batch.stackMatched,
    geo_matched_count: batch.geoMatched,
    persisted_count: batch.persisted,
    failure_count: failures.length,
    errors: failures,
    completed_at: nowIso(),
    heartbeat_at: nowIso(),
    cursor: { ...(segment.cursor ?? {}), source_stats: fetched.sourceStats, fallback_used: fetched.fallbackUsed, source_label: fetched.sourceLabel, sample_domains: batch.domains.slice(0, 20) },
  }).eq("id", segment.id)
  return { checked: batch.checked, stackMatched: batch.stackMatched, geoMatched: batch.geoMatched, persisted: batch.persisted, failures }
}

export async function processPassiveInventoryRun(runId: string, options: { maxSegments?: number } = {}) {
  const run = await loadRun(runId)
  await updateRun(run.id, { status: "running", started_at: nowIso() })
  const segments = await claimSegments(runId, normalizeLimit(options.maxSegments, DEFAULT_MAX_SEGMENTS, 20))
  if (segments.length === 0) {
    const refreshed = await refreshRunCounts(runId)
    return { ok: true, runId, processedSegments: 0, hasMore: refreshed.hasMore, failures: [] }
  }

  let processedSegments = 0
  const failures: Array<{ key: string; reason: string }> = []
  for (const segment of segments) {
    try {
      const result = await processSegment(run, segment)
      processedSegments += 1
      failures.push(...result.failures.map((failure) => ({ key: `${segment.segment_key}:${failure.key}`, reason: failure.reason })))
    } catch (error) {
      console.error("[passive-inventory-runner] segment failed:", segment.segment_key, error)
      const message = errorMessage(error)
      failures.push({ key: segment.segment_key, reason: message })
      await getSb().from(DB_TABLES.SALES_PASSIVE_INVENTORY_SEGMENTS).update({
        status: segment.attempts + 1 >= 3 ? "failed" : "queued",
        error_message: message,
        failure_count: 1,
        heartbeat_at: nowIso(),
        completed_at: segment.attempts + 1 >= 3 ? nowIso() : null,
      }).eq("id", segment.id)
    }
  }
  const refreshed = await refreshRunCounts(runId)
  return { ok: failures.length === 0, runId, processedSegments, hasMore: refreshed.hasMore, failures: failures.slice(0, 30) }
}

export async function triggerPassiveInventoryRunner(runId: string): Promise<{ ok: boolean; error?: string }> {
  const apiUrl = optionalEnv("TRIGGER_API_URL")?.replace(/\/+$/, "")
  const secret = optionalEnv("TRIGGER_SECRET_KEY") ?? optionalEnv("TRIGGER_ACCESS_TOKEN") ?? optionalEnv("TRIGGER_DEV_API_KEY")
  const taskId = optionalEnv("TRIGGER_PASSIVE_INVENTORY_TASK_ID") ?? "sales-passive-inventory-runner"
  if (!apiUrl || !secret) return { ok: false, error: "Trigger.dev passive inventory runner not configured" }
  const res = await fetch(`${apiUrl}/api/v1/tasks/${encodeURIComponent(taskId)}/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify({
      payload: { run_id: runId },
      context: { source: "revenue-os", job: "sales-passive-inventory-runner" },
      options: { idempotencyKey: `passive-inventory-${runId}-${new Date().toISOString().slice(0, 16)}`, concurrencyKey: `passive-inventory-${runId}`, queue: { name: "sales-passive-inventory", concurrencyLimit: 1 } },
    }),
    signal: AbortSignal.timeout(8_000),
  })
  if (!res.ok) return { ok: false, error: `Trigger.dev HTTP ${res.status}` }
  return { ok: true }
}

const activeRuns = new Set<string>()

export function startPassiveInventoryFallback(runId: string): { started: boolean; alreadyRunning: boolean } {
  if (activeRuns.has(runId)) return { started: false, alreadyRunning: true }
  activeRuns.add(runId)
  setTimeout(async () => {
    try {
      for (let iteration = 0; iteration < 500; iteration++) {
        const result = await processPassiveInventoryRun(runId, { maxSegments: DEFAULT_MAX_SEGMENTS })
        if (!result.hasMore) return
        await new Promise((resolve) => setTimeout(resolve, 1_000))
      }
      await updateRun(runId, { status: "failed", error_message: "passive inventory fallback exceeded iteration budget", completed_at: nowIso() })
    } catch (error) {
      console.error("[passive-inventory-runner] fallback failed:", runId, error)
      await updateRun(runId, { status: "failed", error_message: errorMessage(error), completed_at: nowIso() }).catch((markError) => {
        console.error("[passive-inventory-runner] failed to mark run failed:", runId, markError)
      })
    } finally {
      activeRuns.delete(runId)
    }
  }, 0)
  return { started: true, alreadyRunning: false }
}

export async function startPassiveInventoryRunAndDispatch(input: StartPassiveInventoryRunInput) {
  const run = await startPassiveInventoryRun(input)
  const trigger = await triggerPassiveInventoryRunner(run.runId)
  const fallback = startPassiveInventoryFallback(run.runId)
  return { ...run, runnerTriggered: trigger.ok, fallbackRunnerStarted: fallback.started || fallback.alreadyRunning, runnerError: trigger.error ?? null }
}

export async function smokePassiveInventoryBatch(countryCode: string, technology: string | null, limit: number) {
  return fetchPassiveInventoryDomains(countryCode, technology, limit)
}
