import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { normalizeDomain } from "./dedup"
import { upsertCompanyByDomain } from "./companies"
import { enqueueCompanyEnrichment, triggerEnrichmentRunner } from "./enrichment-jobs"
import { optionalEnv } from "./japan-readiness-utils"
import { salesScopeFromCountry } from "./locale-scope"
import { listLeadCandidates, type CandidateListItem } from "./lead-candidate-list"
import {
  clampScore,
  inferCountrySignals,
  scoreCandidate,
  technologySlug,
  tldPatternsForCountry,
  type CandidateCountrySignal,
  type CandidateLane,
  type CandidateScore,
} from "./lead-candidate-scoring"
import { fetchCommonCrawlDomains } from "./sources/commoncrawl-domains"
import { detectTechStack, type TechItem } from "./sources/wappalyzer"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

const SOURCE = "common_crawl_domains"
const MAX_FETCH_LIMIT = 10_000
const MAX_VERIFY_LIMIT = 5_000
const UPSERT_CHUNK_SIZE = 500
const DEFAULT_VERIFY_BATCH = 120
const MAX_VERIFY_CONCURRENCY = 8

interface CandidateRow {
  id: string
  domain: string
  root_url: string | null
  lane: CandidateLane
  source_slug: string
}

interface RunRow {
  id: string
  country_code: string
  technology: string | null
  requested_limit: number
  verify_limit: number
  promote: boolean
  min_opportunity_score: number
}

interface RunItemRow {
  id: string
  run_id: string
  candidate_id: string | null
  domain: string
  root_url: string | null
  attempts: number
}

export interface DurableCommonCrawlInput {
  countryCode: string
  technology?: string | null
  limit?: number
  verifyLimit?: number
  promote?: boolean
  minOpportunityScore?: number
  syncVerifyBatchSize?: number
}

export interface DurableCandidateAcquisitionSummary {
  ok: boolean
  source: string
  runId: string
  status: "queued" | "running" | "completed" | "partial" | "failed"
  fetched: number
  upserted: number
  verified: number
  matchedTechnology: number
  scored: number
  promoted: number
  jobsEnqueued: number
  hasMore: boolean
  runnerTriggered: boolean
  failures: Array<{ key: string; reason: string }>
  candidates: CandidateListItem[]
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

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await fn(items[index] as T)
    }
  })
  await Promise.all(workers)
  return results
}

function guessedCompanyName(domain: string): string {
  const normalized = normalizeDomain(domain) ?? domain
  const label = normalized.split(".")[0] ?? normalized
  return label.split(/[-_]/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ") || normalized
}

function normalizeInput(input: DurableCommonCrawlInput) {
  const countryCode = input.countryCode.trim().toUpperCase()
  const limit = Math.min(Math.max(input.limit ?? 1000, 1), MAX_FETCH_LIMIT)
  const verifyLimit = Math.min(Math.max(input.verifyLimit ?? Math.min(limit, DEFAULT_VERIFY_BATCH), 0), Math.min(limit, MAX_VERIFY_LIMIT))
  return {
    countryCode,
    technology: input.technology?.trim() || null,
    limit,
    verifyLimit,
    promote: input.promote === true,
    minOpportunityScore: clampScore(input.minOpportunityScore ?? 68),
    syncVerifyBatchSize: Math.min(Math.max(input.syncVerifyBatchSize ?? Math.min(verifyLimit, DEFAULT_VERIFY_BATCH), 0), DEFAULT_VERIFY_BATCH),
  }
}

async function createRun(input: ReturnType<typeof normalizeInput>): Promise<RunRow> {
  const sb = getSb()
  const { data, error } = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).insert({
    source_slug: SOURCE,
    lane: "tech_footprint",
    country_code: input.countryCode,
    technology: input.technology,
    status: "running",
    requested_limit: input.limit,
    verify_limit: input.verifyLimit,
    promote: input.promote,
    min_opportunity_score: input.minOpportunityScore,
    started_at: nowIso(),
    heartbeat_at: nowIso(),
  }).select("id, country_code, technology, requested_limit, verify_limit, promote, min_opportunity_score").single()
  if (error) throw new Error(error.message)
  return data as RunRow
}

async function updateRun(runId: string, patch: JsonRecord): Promise<void> {
  const { error } = await getSb().from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).update({ ...patch, heartbeat_at: nowIso() }).eq("id", runId)
  if (error) throw new Error(error.message)
}

async function fetchDomains(countryCode: string, limit: number): Promise<{ domains: string[]; failures: Array<{ key: string; reason: string }> }> {
  const patterns = tldPatternsForCountry(countryCode)
  const domains = new Set<string>()
  const failures: Array<{ key: string; reason: string }> = []
  for (const pattern of patterns) {
    const result = await fetchCommonCrawlDomains(pattern, Math.ceil(limit / patterns.length))
    if (!result.ok) failures.push({ key: pattern, reason: result.error ?? "Common Crawl returned no domains" })
    for (const domain of result.domains) domains.add(domain)
  }
  return { domains: [...domains].slice(0, limit), failures }
}

async function upsertCandidates(run: RunRow, domains: string[]): Promise<number> {
  const sb = getSb()
  let count = 0
  for (const part of chunk(domains, UPSERT_CHUNK_SIZE)) {
    const candidateRows = part.map((domain) => ({
      domain,
      root_url: `https://${domain}`,
      lane: "tech_footprint",
      source_slug: SOURCE,
      source_run_id: run.id,
      last_seen_at: nowIso(),
      meta: { country_code: run.country_code, requested_technology: run.technology, run_id: run.id },
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
      meta: { country_code: run.country_code, requested_technology: run.technology },
    }))
    const itemResult = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS)
      .upsert(itemRows, { onConflict: "run_id,domain", ignoreDuplicates: false })
    if (itemResult.error) throw new Error(itemResult.error.message)
    count += itemRows.length
  }
  return count
}

async function saveEvidence(input: {
  candidate: CandidateRow
  runId: string
  observedUrl: string
  rawEvidence: JsonRecord
  signatureHits: TechItem[]
  countrySignals: CandidateCountrySignal[]
  score: CandidateScore
}): Promise<void> {
  const sb = getSb()
  const observedAt = nowIso()
  const observation = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_OBSERVATIONS).insert({
    candidate_id: input.candidate.id,
    source_slug: SOURCE,
    observed_url: input.observedUrl,
    observed_at: observedAt,
    raw_evidence: { ...input.rawEvidence, run_id: input.runId },
    signature_hits: input.signatureHits,
  })
  if (observation.error) throw new Error(observation.error.message)
  if (input.countrySignals.length > 0) {
    const country = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_COUNTRY_SIGNALS).insert(input.countrySignals.map((signal) => ({
      candidate_id: input.candidate.id,
      country_code: signal.countryCode,
      signal_type: signal.signalType,
      confidence: signal.confidence,
      evidence: signal.evidence,
      observed_at: observedAt,
    })))
    if (country.error) throw new Error(country.error.message)
  }
  if (input.signatureHits.length > 0) {
    const tech = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_TECH_DETECTIONS).upsert(input.signatureHits.map((item) => ({
      candidate_id: input.candidate.id,
      technology_name: item.name,
      technology_slug: technologySlug(item.name),
      category: item.category,
      confidence: item.confidence ?? 0,
      evidence_url: input.observedUrl,
      evidence_type: "homepage",
      source_slug: SOURCE,
      detected_at: observedAt,
    })), { onConflict: "candidate_id,technology_slug,source_slug,evidence_type", ignoreDuplicates: false })
    if (tech.error) throw new Error(tech.error.message)
  }
  const score = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_SCORES).upsert({
    candidate_id: input.candidate.id,
    stack_fit_score: input.score.stackFitScore,
    smb_score: input.score.smbScore,
    freshness_score: input.score.freshnessScore,
    geo_confidence: input.score.geoConfidence,
    contactability_score: input.score.contactabilityScore,
    website_absence_score: input.score.websiteAbsenceScore,
    opportunity_score: input.score.opportunityScore,
    false_positive_risk: input.score.falsePositiveRisk,
    details: input.score.details,
    scored_at: observedAt,
  }, { onConflict: "candidate_id", ignoreDuplicates: false })
  if (score.error) throw new Error(score.error.message)
  const candidateUpdate = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_DOMAINS).update({ status: "scored", observation_count: 1, last_seen_at: observedAt }).eq("id", input.candidate.id)
  if (candidateUpdate.error) throw new Error(candidateUpdate.error.message)
}

async function promoteCandidate(run: RunRow, candidate: CandidateRow, score: CandidateScore, detections: TechItem[]) {
  const scope = salesScopeFromCountry({ targetCountry: run.country_code })
  const saved = await upsertCompanyByDomain({
    domain: candidate.domain,
    company_name: guessedCompanyName(candidate.domain),
    region: scope.region,
    report_locale: scope.reportLocale,
    target_country: scope.targetCountry,
    source: SOURCE,
    pipeline_status: "scanning",
    tech_stack: { detections, source: SOURCE },
    meta: { lead_candidate: { id: candidate.id, run_id: run.id, source: SOURCE, score, promoted_at: nowIso() } },
  })
  if (!saved.ok || !saved.company) return { promoted: false, jobQueued: false, error: saved.error ?? "company upsert failed" }
  const marker = await getSb().from(DB_TABLES.SALES_LEAD_CANDIDATE_DOMAINS).update({ status: "promoted", company_id: saved.company.id }).eq("id", candidate.id)
  if (marker.error) return { promoted: false, jobQueued: false, error: marker.error.message }
  const queued = await enqueueCompanyEnrichment({
    companyId: saved.company.id,
    source: SOURCE,
    triggeredBy: "lead_candidate_acquisition",
    priority: 72,
    payload: { candidate_id: candidate.id, run_id: run.id, country_code: run.country_code, opportunity_score: score.opportunityScore },
  })
  return { promoted: true, companyId: saved.company.id, jobQueued: queued.ok, error: queued.error }
}

async function refreshRunCounts(runId: string): Promise<{ hasMore: boolean; failures: Array<{ key: string; reason: string }> }> {
  const sb = getSb()
  const statuses = ["discovered", "scored", "promoted", "failed"] as const
  const counts = new Map<string, number>()
  for (const status of statuses) {
    const res = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("status", status)
    counts.set(status, res.count ?? 0)
  }
  const matched = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("tech_matched", true)
  const jobs = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("job_enqueued", true)
  const runRes = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).select("verify_limit").eq("id", runId).single()
  if (runRes.error) throw new Error(runRes.error.message)
  const verified = (counts.get("scored") ?? 0) + (counts.get("promoted") ?? 0)
  const hasMore = (counts.get("discovered") ?? 0) > 0 && verified < Number(runRes.data.verify_limit ?? 0)
  const status = hasMore ? "running" : (counts.get("failed") ?? 0) > 0 ? "partial" : "completed"
  await updateRun(runId, {
    status,
    verified_count: verified,
    matched_technology_count: matched.count ?? 0,
    scored_count: counts.get("scored") ?? 0,
    promoted_count: counts.get("promoted") ?? 0,
    jobs_enqueued_count: jobs.count ?? 0,
    failure_count: counts.get("failed") ?? 0,
    completed_at: hasMore ? null : nowIso(),
  })
  const failures = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("domain, error_message").eq("run_id", runId).eq("status", "failed").limit(30)
  return {
    hasMore,
    failures: ((failures.data ?? []) as Array<{ domain: string; error_message: string | null }>).map((row) => ({ key: row.domain, reason: row.error_message ?? "failed" })),
  }
}

async function processItem(run: RunRow, item: RunItemRow) {
  const sb = getSb()
  const candidateRes = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_DOMAINS).select("id, domain, root_url, lane, source_slug").eq("id", item.candidate_id).single()
  if (candidateRes.error) throw new Error(candidateRes.error.message)
  const candidate = candidateRes.data as CandidateRow
  const rootUrl = candidate.root_url ?? item.root_url ?? `https://${candidate.domain}`
  const detection = await detectTechStack(rootUrl)
  const countrySignals = inferCountrySignals({ domain: candidate.domain, targetCountry: run.country_code })
  const requestedSlug = run.technology ? technologySlug(run.technology) : null
  const techMatched = requestedSlug ? detection.tech.some((tech) => technologySlug(tech.name) === requestedSlug) : detection.tech.length > 0
  const score = scoreCandidate({ requestedTechnology: run.technology, detections: detection.tech, countrySignals, lane: "tech_footprint", hasWebsite: true, hasContactSignal: false, source: SOURCE })
  await saveEvidence({ candidate, runId: run.id, observedUrl: rootUrl, rawEvidence: { server: detection.server, country_code: run.country_code, requested_technology: run.technology }, signatureHits: detection.tech, countrySignals, score })
  let companyId: string | null = null
  let jobQueued = false
  let status = "scored"
  if (run.promote && score.opportunityScore >= run.min_opportunity_score && techMatched) {
    const promotion = await promoteCandidate(run, candidate, score, detection.tech)
    if (!promotion.promoted) throw new Error(promotion.error ?? "promotion failed")
    companyId = promotion.companyId ?? null
    jobQueued = promotion.jobQueued
    status = "promoted"
  }
  const update = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).update({
    status,
    attempts: item.attempts + 1,
    tech_matched: techMatched,
    job_enqueued: jobQueued,
    opportunity_score: score.opportunityScore,
    company_id: companyId,
    error_message: null,
    processed_at: nowIso(),
  }).eq("id", item.id)
  if (update.error) throw new Error(update.error.message)
  return { techMatched, promoted: status === "promoted", jobQueued }
}

export async function processLeadCandidateRun(runId: string, options: { batchSize?: number; maxBatches?: number } = {}) {
  const sb = getSb()
  const runRes = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).select("id, country_code, technology, requested_limit, verify_limit, promote, min_opportunity_score").eq("id", runId).single()
  if (runRes.error) throw new Error(runRes.error.message)
  const run = runRes.data as RunRow
  const batchSize = Math.min(Math.max(options.batchSize ?? DEFAULT_VERIFY_BATCH, 1), 250)
  const maxBatches = Math.min(Math.max(options.maxBatches ?? 1, 1), 20)
  let processed = 0
  let jobsEnqueued = 0
  for (let batch = 0; batch < maxBatches; batch++) {
    const verified = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).in("status", ["scored", "promoted"])
    const alreadyVerified = verified.count ?? 0
    if (alreadyVerified >= run.verify_limit) break
    const remaining = Math.max(1, run.verify_limit - alreadyVerified)
    const res = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id, run_id, candidate_id, domain, root_url, attempts").eq("run_id", runId).in("status", ["discovered", "failed"]).lt("attempts", 3).order("created_at", { ascending: true }).limit(Math.min(batchSize, remaining))
    if (res.error) throw new Error(res.error.message)
    const items = (res.data ?? []) as RunItemRow[]
    if (items.length === 0) break
    const results = await mapLimit(items, MAX_VERIFY_CONCURRENCY, async (item) => {
      try {
        return await processItem(run, item)
      } catch (error) {
        const message = error instanceof Error ? error.message : "candidate verification failed"
        console.error("[lead-candidate-runs] item failed:", item.domain, error)
        const attempts = item.attempts + 1
        await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).update({ status: attempts >= 3 ? "failed" : "discovered", attempts, error_message: message, processed_at: nowIso() }).eq("id", item.id)
        return { techMatched: false, promoted: false, jobQueued: false }
      }
    })
    processed += items.length
    jobsEnqueued += results.filter((item) => item.jobQueued).length
  }
  const refreshed = await refreshRunCounts(runId)
  if (jobsEnqueued > 0) await triggerEnrichmentRunner(Math.min(jobsEnqueued, 10))
  return { ok: true, runId, processed, jobsEnqueued, hasMore: refreshed.hasMore, failures: refreshed.failures }
}

export async function triggerLeadCandidateRunner(runId: string): Promise<{ ok: boolean; error?: string }> {
  const apiUrl = optionalEnv("TRIGGER_API_URL")?.replace(/\/+$/, "")
  const secret = optionalEnv("TRIGGER_SECRET_KEY") ?? optionalEnv("TRIGGER_ACCESS_TOKEN") ?? optionalEnv("TRIGGER_DEV_API_KEY")
  const taskId = optionalEnv("TRIGGER_SALES_LEAD_CANDIDATE_TASK_ID") ?? "sales-lead-candidate-runner"
  if (!apiUrl || !secret) return { ok: false, error: "Trigger.dev lead candidate runner not configured" }
  const res = await fetch(`${apiUrl}/api/v1/tasks/${encodeURIComponent(taskId)}/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify({
      payload: { run_id: runId },
      context: { source: "revenue-os", job: "sales-lead-candidate-runner" },
      options: { idempotencyKey: `lead-candidate-${runId}-${new Date().toISOString().slice(0, 16)}`, concurrencyKey: `lead-candidate-${runId}`, queue: { name: "sales-lead-candidates", concurrencyLimit: 2 } },
    }),
    signal: AbortSignal.timeout(8_000),
  })
  if (!res.ok) return { ok: false, error: `Trigger.dev HTTP ${res.status}` }
  return { ok: true }
}

export async function ingestCommonCrawlCandidatesDurable(input: DurableCommonCrawlInput): Promise<DurableCandidateAcquisitionSummary> {
  const normalized = normalizeInput(input)
  const run = await createRun(normalized)
  const fetched = await fetchDomains(normalized.countryCode, normalized.limit)
  const upserted = await upsertCandidates(run, fetched.domains)
  await updateRun(run.id, { fetched_count: fetched.domains.length, upserted_count: upserted, errors: fetched.failures })
  if (normalized.verifyLimit === 0) {
    await updateRun(run.id, { status: fetched.failures.length > 0 ? "partial" : "completed", completed_at: nowIso() })
  }
  const inline = normalized.syncVerifyBatchSize > 0 ? await processLeadCandidateRun(run.id, { batchSize: normalized.syncVerifyBatchSize, maxBatches: 1 }) : { hasMore: normalized.verifyLimit > 0, failures: [] as Array<{ key: string; reason: string }> }
  const trigger = inline.hasMore ? await triggerLeadCandidateRunner(run.id) : { ok: false }
  const counts = await getSb().from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).select("status, verified_count, matched_technology_count, scored_count, promoted_count, jobs_enqueued_count, failure_count").eq("id", run.id).single()
  const row = counts.data as Record<string, unknown> | null
  const candidates = await listLeadCandidates({ countryCode: normalized.countryCode, technology: normalized.technology, limit: 30 })
  return {
    ok: fetched.failures.length === 0 || upserted > 0,
    source: SOURCE,
    runId: run.id,
    status: String(row?.status ?? "running") as DurableCandidateAcquisitionSummary["status"],
    fetched: fetched.domains.length,
    upserted,
    verified: Number(row?.verified_count ?? 0),
    matchedTechnology: Number(row?.matched_technology_count ?? 0),
    scored: Number(row?.scored_count ?? 0),
    promoted: Number(row?.promoted_count ?? 0),
    jobsEnqueued: Number(row?.jobs_enqueued_count ?? 0),
    hasMore: inline.hasMore,
    runnerTriggered: trigger.ok,
    failures: [...fetched.failures, ...inline.failures, ...(trigger.ok || !inline.hasMore ? [] : [{ key: "trigger_lead_candidate_runner", reason: trigger.error ?? "trigger failed" }])].slice(0, 30),
    candidates,
  }
}
