import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { fetchLeadSourceCandidateRecords } from "./lead-source-records"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

const SOURCE = "evidence_first_sources"
const UPSERT_CHUNK_SIZE = 500

export interface LeadCandidateAcquisitionRun {
  id: string
  country_code: string
  technology: string | null
  requested_limit: number
  verify_limit: number
  fetched_count: number
  upserted_count: number
  source_config_ids: string[]
  require_source_evidence: boolean
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
  records: Awaited<ReturnType<typeof fetchLeadSourceCandidateRecords>>,
): Promise<void> {
  const sb = getSb()
  const domains = records.map((record) => record.domain)
  const byEvidenceDomain = new Map(records.map((record) => [record.domain, record]))
  for (const part of chunk(domains, UPSERT_CHUNK_SIZE)) {
    const candidateRows = part.map((domain) => {
      const evidence = byEvidenceDomain.get(domain)
      if (!evidence) throw new Error(`Source evidence missing for ${domain}`)
      return {
      domain: evidence.domain,
      root_url: evidence.website_url,
      lane: "tech_footprint",
      source_slug: SOURCE,
      source_run_id: run.id,
      last_seen_at: nowIso(),
      meta: {
        country_code: run.country_code,
        requested_technology: run.technology,
        run_id: run.id,
        acquisition_sources: [`lead_source:${evidence.source_config_id}`],
        source_record: evidence,
      },
    }})
    const { data, error } = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_DOMAINS)
      .upsert(candidateRows, { onConflict: "domain", ignoreDuplicates: false })
      .select("id, domain, root_url")
    if (error) throw new Error(error.message)

    const byDomain = new Map(((data ?? []) as CandidateRow[]).map((row) => [row.domain, row]))
    const itemRows = part.map((domain) => {
      const evidence = byEvidenceDomain.get(domain)
      if (!evidence) throw new Error(`Source evidence missing for ${domain}`)
      return {
      run_id: run.id,
      candidate_id: byDomain.get(domain)?.id ?? null,
      domain,
      root_url: evidence.website_url,
      status: "discovered",
      source_config_id: evidence.source_config_id,
      source_record_id: evidence.id,
      company_name: evidence.company_name,
      source_page_url: evidence.source_page_url,
      source_evidence: evidence,
      meta: {
        country_code: run.country_code,
        requested_technology: run.technology,
        acquisition_sources: [`lead_source:${evidence.source_config_id}`],
        source_record: evidence,
      },
    }})
    const itemResult = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS)
      .upsert(itemRows, { onConflict: "run_id,domain", ignoreDuplicates: false })
    if (itemResult.error) throw new Error(itemResult.error.message)
  }
}

async function persistProgress(
  run: LeadCandidateAcquisitionRun,
  records: Awaited<ReturnType<typeof fetchLeadSourceCandidateRecords>>,
  completed: boolean,
): Promise<void> {
  await upsertCandidates(run, records)
  const upserted = await countRunItems(getSb(), run.id)
  const sourceStats = [...new Set(records.map((record) => record.source_config_id))].map((sourceId) => ({
    source: sourceId,
    fetched: records.filter((record) => record.source_config_id === sourceId).length,
  }))
  await updateRun(run.id, {
    status: "running",
    fetched_count: upserted,
    upserted_count: upserted,
    errors: [],
    cursor: {
      ...(run.cursor ?? {}),
      acquisition_completed: completed,
      source_stats: sourceStats,
      source_count: sourceStats.length,
    },
  })
}

export async function ensureLeadCandidateRunDomainsFetched(
  run: LeadCandidateAcquisitionRun,
): Promise<{ fetched: number; upserted: number; failures: Array<{ key: string; reason: string }> }> {
  if (acquisitionCompleted(run.cursor)) return { fetched: run.fetched_count, upserted: run.upserted_count, failures: [] }
  await updateRun(run.id, { status: "running", started_at: nowIso() })

  if (run.require_source_evidence !== true || run.source_config_ids.length === 0) {
    throw new Error("Evidence-bearing source configuration is required")
  }
  const fetched = await fetchLeadSourceCandidateRecords({
    countryCode: run.country_code,
    sourceConfigIds: run.source_config_ids,
    limit: run.requested_limit,
  })
  await persistProgress(run, fetched, true)

  const failures = fetched.length === 0
    ? [{ key: run.country_code, reason: "Approved evidence sources returned zero candidate companies" }]
    : []
  if (run.verify_limit === 0) {
    await updateRun(run.id, { status: failures.length > 0 ? "partial" : "completed", completed_at: nowIso() })
  }
  return { fetched: fetched.length, upserted: await countRunItems(getSb(), run.id), failures }
}
