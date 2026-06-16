import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { fetchLeadCandidateDomains, type CandidateDomainFetchResult } from "./lead-candidate-domain-sources"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

const SOURCE = "multi_source_domains"
const UPSERT_CHUNK_SIZE = 500

export interface LeadCandidateAcquisitionRun {
  id: string
  country_code: string
  technology: string | null
  requested_limit: number
  verify_limit: number
  fetched_count: number
  upserted_count: number
  cursor?: JsonRecord
}

interface CandidateRow {
  id: string
  domain: string
  root_url: string | null
}

function getSb(): ServiceSupabase {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")
  return sb
}

function nowIso(): string {
  return new Date().toISOString()
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size))
  return out
}

function acquisitionCompleted(cursor: JsonRecord | undefined): boolean {
  return cursor?.acquisition_completed === true
}

async function countRunItems(sb: ServiceSupabase, runId: string): Promise<number> {
  const res = await sb
    .from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS)
    .select("id", { count: "exact", head: true })
    .eq("run_id", runId)
  if (res.error) {
    console.error("[lead-candidate-acquisition] countRunItems failed:", res.error.message)
    return 0
  }
  return res.count ?? 0
}

async function updateRun(runId: string, patch: JsonRecord): Promise<void> {
  const { error } = await getSb()
    .from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS)
    .update({ ...patch, heartbeat_at: nowIso() })
    .eq("id", runId)
  if (error) throw new Error(error.message)
}

async function upsertCandidates(
  run: LeadCandidateAcquisitionRun,
  domains: string[],
  sourceByDomain: Record<string, string[]>,
  evidenceByDomain: Record<string, Record<string, unknown>> = {},
): Promise<void> {
  const sb = getSb()
  for (const part of chunk(domains, UPSERT_CHUNK_SIZE)) {
    const candidateRows = part.map((domain) => ({
      domain,
      root_url: `https://${domain}`,
      lane: "tech_footprint",
      source_slug: SOURCE,
      source_run_id: run.id,
      last_seen_at: nowIso(),
      meta: {
        country_code: run.country_code,
        requested_technology: run.technology,
        run_id: run.id,
        acquisition_sources: sourceByDomain[domain] ?? [SOURCE],
        passive_evidence: evidenceByDomain[domain] ?? null,
      },
    }))
    const { data, error } = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_DOMAINS)
      .upsert(candidateRows, { onConflict: "domain", ignoreDuplicates: false })
      .select("id, domain, root_url")
    if (error) throw new Error(error.message)

    const byDomain = new Map(((data ?? []) as CandidateRow[]).map((row) => [row.domain, row]))
    const itemRows = part.map((domain) => ({
      run_id: run.id,
      candidate_id: byDomain.get(domain)?.id ?? null,
      domain,
      root_url: `https://${domain}`,
      status: "discovered",
      meta: {
        country_code: run.country_code,
        requested_technology: run.technology,
        acquisition_sources: sourceByDomain[domain] ?? [SOURCE],
        passive_evidence: evidenceByDomain[domain] ?? null,
      },
    }))
    const itemResult = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS)
      .upsert(itemRows, { onConflict: "run_id,domain", ignoreDuplicates: false })
    if (itemResult.error) throw new Error(itemResult.error.message)
  }
}

async function persistProgress(run: LeadCandidateAcquisitionRun, result: CandidateDomainFetchResult, completed: boolean): Promise<void> {
  await upsertCandidates(run, result.domains, result.sourceByDomain, result.evidenceByDomain)
  const upserted = await countRunItems(getSb(), run.id)
  await updateRun(run.id, {
    status: "running",
    fetched_count: upserted,
    upserted_count: upserted,
    errors: result.failures,
    cursor: {
      ...(run.cursor ?? {}),
      acquisition_completed: completed,
      source_stats: result.sourceStats,
      source_count: result.sourceStats.length,
    },
  })
}

export async function ensureLeadCandidateRunDomainsFetched(
  run: LeadCandidateAcquisitionRun,
): Promise<{ fetched: number; upserted: number; failures: Array<{ key: string; reason: string }> }> {
  if (acquisitionCompleted(run.cursor)) return { fetched: run.fetched_count, upserted: run.upserted_count, failures: [] }
  await updateRun(run.id, { status: "running", started_at: nowIso() })

  const fetched = await fetchLeadCandidateDomains(run.country_code, run.requested_limit, {
    technology: run.technology,
    onProgress: (progress) => persistProgress(run, progress, false),
  })
  await persistProgress(run, fetched, true)

  if (fetched.domains.length === 0 && fetched.failures.length === 0) {
    fetched.failures.push({ key: run.country_code, reason: "All bulk sources returned zero candidate domains" })
  }
  if (run.verify_limit === 0) {
    await updateRun(run.id, { status: fetched.failures.length > 0 ? "partial" : "completed", completed_at: nowIso() })
  }
  return { fetched: fetched.domains.length, upserted: await countRunItems(getSb(), run.id), failures: fetched.failures }
}
