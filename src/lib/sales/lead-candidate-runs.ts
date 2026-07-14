import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { salesScopeFromCountry } from "./locale-scope"
import { listLeadCandidates, type CandidateListItem } from "./lead-candidate-list"
import { ensureLeadCandidateRunDomainsFetched } from "./lead-candidate-acquisition"
import { decideFormQualification, isEnterpriseLikeStack } from "./lead-factory-qualification"
import { promoteFormQualifiedCandidate } from "./lead-candidate-promotion"
import { isCustomerFacingBusinessDomain } from "./data-quality-guard"
import {
  clampScore,
  inferCountrySignals,
  scoreCandidate,
  technologySlug,
  type CandidateCountrySignal,
  type CandidateLane,
  type CandidateScore,
} from "./lead-candidate-scoring"
import { detectTechStack, type TechItem } from "./sources/wappalyzer"
import { discoverFormUrl } from "./sources/form-discovery"
import { techFromCname } from "./passive-inventory-utils"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

const SOURCE = "multi_source_domains"
const MAX_FETCH_LIMIT = 10_000
const MAX_VERIFY_LIMIT = 5_000
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
  min_smb_score: number
  require_verified_form: boolean
  min_form_confidence: number
  sync_twenty: boolean
  fetched_count: number
  upserted_count: number
  cursor?: JsonRecord
}

interface RunItemRow {
  id: string
  run_id: string
  candidate_id: string | null
  domain: string
  root_url: string | null
  attempts: number
  meta?: JsonRecord | null
}

export interface DurableCandidateIngestInput {
  countryCode: string
  technology?: string | null
  limit?: number
  verifyLimit?: number
  promote?: boolean
  minOpportunityScore?: number
  minSmbScore?: number
  syncVerifyBatchSize?: number
  requireVerifiedForm?: boolean
  minFormConfidence?: number
  syncTwenty?: boolean
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
  formsChecked: number
  formsQualified: number
  twentySynced: number
  hasMore: boolean
  runnerTriggered: boolean
  fallbackRunnerStarted: boolean
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "lead candidate run failed"
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

function normalizeInput(input: DurableCandidateIngestInput) {
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
    minSmbScore: clampScore(input.minSmbScore ?? 50),
    requireVerifiedForm: input.requireVerifiedForm !== false,
    minFormConfidence: clampScore(input.minFormConfidence ?? 80),
    syncTwenty: input.syncTwenty !== false,
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
    status: "queued",
    requested_limit: input.limit,
    verify_limit: input.verifyLimit,
    promote: input.promote,
    min_opportunity_score: input.minOpportunityScore,
    min_smb_score: input.minSmbScore,
    require_verified_form: input.requireVerifiedForm,
    min_form_confidence: input.minFormConfidence,
    sync_twenty: input.syncTwenty,
    heartbeat_at: nowIso(),
  }).select("id, country_code, technology, requested_limit, verify_limit, promote, min_opportunity_score, min_smb_score, require_verified_form, min_form_confidence, sync_twenty, fetched_count, upserted_count").single()
  if (error) throw new Error(error.message)
  return data as RunRow
}

async function updateRun(runId: string, patch: JsonRecord): Promise<void> {
  const { error } = await getSb().from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).update({ ...patch, heartbeat_at: nowIso() }).eq("id", runId)
  if (error) throw new Error(error.message)
}

export async function markLeadCandidateRunFailed(runId: string, error: unknown): Promise<void> {
  await updateRun(runId, { status: "failed", error_message: errorMessage(error), completed_at: nowIso() })
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
  const { data: currentCandidate } = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_DOMAINS).select("observation_count").eq("id", input.candidate.id).single()
  const currentCount = (currentCandidate as { observation_count?: number } | null)?.observation_count ?? 0
  const candidateUpdate = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_DOMAINS).update({ status: "scored", observation_count: currentCount + 1, last_seen_at: observedAt }).eq("id", input.candidate.id)
  if (candidateUpdate.error) throw new Error(candidateUpdate.error.message)
}

async function refreshRunCounts(runId: string): Promise<{ hasMore: boolean; failures: Array<{ key: string; reason: string }> }> {
  const sb = getSb()
  const [discoveredRes, scoredRes, formMissingRes, promotedRes, failedRes, matched, formsChecked, formsQualified, twentySynced, runRes] = await Promise.all([
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("status", "discovered"),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("status", "scored"),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("status", "form_missing"),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("status", "promoted"),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("status", "failed"),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("tech_matched", true),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).not("form_checked_at", "is", null),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("form_verified", true),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).eq("twenty_synced", true),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).select("verify_limit").eq("id", runId).single(),
  ])
  const counts = new Map<string, number>()
  counts.set("discovered", discoveredRes.count ?? 0)
  counts.set("scored", scoredRes.count ?? 0)
  counts.set("form_missing", formMissingRes.count ?? 0)
  counts.set("promoted", promotedRes.count ?? 0)
  counts.set("failed", failedRes.count ?? 0)
  if (runRes.error) throw new Error(runRes.error.message)
  const verified = (counts.get("scored") ?? 0) + (counts.get("form_missing") ?? 0) + (counts.get("promoted") ?? 0)
  const hasMore = (counts.get("discovered") ?? 0) > 0 && verified < Number(runRes.data.verify_limit ?? 0)
  const status = hasMore ? "running" : (counts.get("failed") ?? 0) > 0 ? "partial" : "completed"
  await updateRun(runId, {
    status,
    verified_count: verified,
    matched_technology_count: matched.count ?? 0,
    scored_count: (counts.get("scored") ?? 0) + (counts.get("form_missing") ?? 0),
    promoted_count: counts.get("promoted") ?? 0,
    jobs_enqueued_count: 0,
    forms_checked_count: formsChecked.count ?? 0,
    forms_qualified_count: formsQualified.count ?? 0,
    twenty_synced_count: twentySynced.count ?? 0,
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
  if (!isCustomerFacingBusinessDomain(candidate.domain)) {
    const skipped = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).update({
      status: "skipped",
      attempts: item.attempts + 1,
      tech_matched: false,
      job_enqueued: false,
      form_verified: false,
      twenty_synced: false,
      error_message: "Hosted platform or internal domain is not a customer-facing CRM identity",
      processed_at: nowIso(),
    }).eq("id", item.id)
    if (skipped.error) throw new Error(skipped.error.message)
    return { techMatched: false, promoted: false, twentySynced: false }
  }
  const rootUrl = candidate.root_url ?? item.root_url ?? `https://${candidate.domain}`
  const passive = item.meta?.passive_evidence && typeof item.meta.passive_evidence === "object" && !Array.isArray(item.meta.passive_evidence)
    ? item.meta.passive_evidence as JsonRecord
    : null
  const passiveTech = Array.isArray(passive?.technologies) ? passive.technologies as TechItem[] : []
  const passiveSignals = Array.isArray(passive?.countrySignals) ? passive.countrySignals as CandidateCountrySignal[] : []
  const rawPassive = passive?.raw && typeof passive.raw === "object" && !Array.isArray(passive.raw) ? passive.raw as JsonRecord : null
  const activeDetection = rawPassive?.skip_active_verification === true
    ? { tech: passiveTech, server: null as string | null, evidenceText: typeof rawPassive.common_crawl_text_sample === "string" ? rawPassive.common_crawl_text_sample : null }
    : await detectTechStack(rootUrl)
  const passiveCname = typeof passive?.cnameTarget === "string" ? passive.cnameTarget : null
  const hostedTech = techFromCname(passiveCname)
  const passiveTechnology = [...passiveTech, ...hostedTech]
  const hostedSlugs = new Set(passiveTechnology.map((tech) => technologySlug(tech.name)))
  const detection = {
    ...activeDetection,
    tech: [...passiveTechnology, ...activeDetection.tech.filter((tech) => !hostedSlugs.has(technologySlug(tech.name)))],
  }
  const hasStrongPassiveCountry = passiveSignals.some((signal) => signal.confidence >= 60 && signal.signalType !== "request_scope")
  const countrySignals = hasStrongPassiveCountry
    ? passiveSignals
    : inferCountrySignals({ domain: candidate.domain, targetCountry: run.country_code, evidenceText: detection.evidenceText })
  const requestedSlug = run.technology ? technologySlug(run.technology) : null
  const techMatched = requestedSlug ? detection.tech.some((tech) => technologySlug(tech.name) === requestedSlug) : detection.tech.length > 0
  const form = await discoverFormUrl({ homeUrl: rootUrl, region: salesScopeFromCountry({ targetCountry: run.country_code }).region, enableLlm: false })
  const qualification = decideFormQualification(form, run.min_form_confidence)
  const score = scoreCandidate({ requestedTechnology: run.technology, detections: detection.tech, countrySignals, lane: "tech_footprint", hasWebsite: true, hasContactSignal: qualification.qualified, source: SOURCE, isEnterpriseLike: isEnterpriseLikeStack(detection.tech) })
  await saveEvidence({ candidate, runId: run.id, observedUrl: rootUrl, rawEvidence: { server: detection.server, country_code: run.country_code, requested_technology: run.technology, passive_evidence: passive, form_discovery: form, form_qualification: qualification }, signatureHits: detection.tech, countrySignals, score })
  let companyId: string | null = null
  let twentySynced = false
  let twentyCompanyId: string | null = null
  let status = "scored"
  const eligibleByScore = score.opportunityScore >= run.min_opportunity_score && score.smbScore >= run.min_smb_score && techMatched
  const eligibleByForm = !run.require_verified_form || qualification.qualified
  if (run.promote && eligibleByScore && eligibleByForm) {
    const promotion = await promoteFormQualifiedCandidate({ runId: run.id, countryCode: run.country_code, syncTwenty: run.sync_twenty, candidateId: candidate.id, domain: candidate.domain, score, detections: detection.tech, form, source: SOURCE })
    if (!promotion.promoted) throw new Error(promotion.error ?? "promotion failed")
    companyId = promotion.companyId ?? null
    twentySynced = promotion.twentySynced
    twentyCompanyId = promotion.twentyCompanyId ?? null
    status = "promoted"
  } else if (run.promote && eligibleByScore && !eligibleByForm) {
    status = "form_missing"
  }
  const update = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).update({
    status,
    attempts: item.attempts + 1,
    tech_matched: techMatched,
    job_enqueued: false,
    opportunity_score: score.opportunityScore,
    company_id: companyId,
    form_url: form.verification === "form" ? form.formUrl : null,
    form_method: form.method,
    form_confidence: form.confidence,
    form_verified: qualification.qualified,
    form_checked_at: nowIso(),
    form_qualification_reason: qualification.reason,
    twenty_synced: twentySynced,
    twenty_company_id: twentyCompanyId,
    error_message: null,
    processed_at: nowIso(),
  }).eq("id", item.id)
  if (update.error) throw new Error(update.error.message)
  return { techMatched, promoted: status === "promoted", twentySynced }
}

export async function processLeadCandidateRun(runId: string, options: { batchSize?: number; maxBatches?: number } = {}) {
  const sb = getSb()
  const runRes = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).select("id, country_code, technology, requested_limit, verify_limit, promote, min_opportunity_score, min_smb_score, require_verified_form, min_form_confidence, sync_twenty, fetched_count, upserted_count, cursor").eq("id", runId).single()
  if (runRes.error) throw new Error(runRes.error.message)
  const run = runRes.data as RunRow
  const acquisition = await ensureLeadCandidateRunDomainsFetched(run)
  if (acquisition.upserted === 0) {
    await updateRun(run.id, { status: "failed", failure_count: Math.max(acquisition.failures.length, 1), completed_at: nowIso() })
    return { ok: false, runId, processed: 0, jobsEnqueued: 0, hasMore: false, failures: acquisition.failures.length > 0 ? acquisition.failures : [{ key: run.country_code, reason: "No candidate domains were fetched" }] }
  }
  if (run.verify_limit === 0) {
    return { ok: true, runId, processed: 0, jobsEnqueued: 0, hasMore: false, failures: acquisition.failures }
  }
  const batchSize = Math.min(Math.max(options.batchSize ?? DEFAULT_VERIFY_BATCH, 1), 250)
  const maxBatches = Math.min(Math.max(options.maxBatches ?? 1, 1), 20)
  let processed = 0
  let twentySynced = 0
  for (let batch = 0; batch < maxBatches; batch++) {
    const verified = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id", { count: "exact", head: true }).eq("run_id", runId).in("status", ["scored", "form_missing", "promoted"])
    const alreadyVerified = verified.count ?? 0
    if (alreadyVerified >= run.verify_limit) break
    const remaining = Math.max(1, run.verify_limit - alreadyVerified)
    const res = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).select("id, run_id, candidate_id, domain, root_url, attempts, meta").eq("run_id", runId).in("status", ["discovered", "failed"]).lt("attempts", 3).order("created_at", { ascending: true }).limit(Math.min(batchSize, remaining))
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
        return { techMatched: false, promoted: false, twentySynced: false }
      }
    })
    processed += items.length
    twentySynced += results.filter((item) => item.twentySynced).length
  }
  const refreshed = await refreshRunCounts(runId)
  return { ok: true, runId, processed, jobsEnqueued: 0, twentySynced, hasMore: refreshed.hasMore, failures: [...acquisition.failures, ...refreshed.failures].slice(0, 30) }
}

export async function triggerLeadCandidateRunner(runId: string): Promise<{ ok: boolean; error?: string }> {
  const fallback = await startFallbackRunner(runId)
  if (!fallback.started) return { ok: false, error: "Fallback runner already running" }
  return { ok: true }
}

async function startFallbackRunner(runId: string): Promise<{ started: boolean; alreadyRunning: boolean }> {
  try {
    const runner = await import("./lead-candidate-runner")
    return runner.startLeadCandidateRunFallback(runId)
  } catch (error) {
    console.error("[lead-candidate-runs] fallback runner import failed:", runId, error)
    return { started: false, alreadyRunning: false }
  }
}

export async function ingestLeadCandidatesDurable(input: DurableCandidateIngestInput): Promise<DurableCandidateAcquisitionSummary> {
  const normalized = normalizeInput(input)
  const run = await createRun(normalized)
  const trigger = await triggerLeadCandidateRunner(run.id)
  const fallback = await startFallbackRunner(run.id)
  const counts = await getSb().from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).select("status, verified_count, matched_technology_count, scored_count, promoted_count, jobs_enqueued_count, forms_checked_count, forms_qualified_count, twenty_synced_count, failure_count").eq("id", run.id).single()
  const row = counts.data as Record<string, unknown> | null
  const candidates = await listLeadCandidates({ countryCode: normalized.countryCode, technology: normalized.technology, limit: 30 })
  const runnerAvailable = trigger.ok || fallback.started || fallback.alreadyRunning
  return {
    ok: runnerAvailable,
    source: SOURCE,
    runId: run.id,
    status: String(row?.status ?? "queued") as DurableCandidateAcquisitionSummary["status"],
    fetched: 0,
    upserted: 0,
    verified: Number(row?.verified_count ?? 0),
    matchedTechnology: Number(row?.matched_technology_count ?? 0),
    scored: Number(row?.scored_count ?? 0),
    promoted: Number(row?.promoted_count ?? 0),
    jobsEnqueued: Number(row?.jobs_enqueued_count ?? 0),
    formsChecked: Number(row?.forms_checked_count ?? 0),
    formsQualified: Number(row?.forms_qualified_count ?? 0),
    twentySynced: Number(row?.twenty_synced_count ?? 0),
    hasMore: true,
    runnerTriggered: trigger.ok,
    fallbackRunnerStarted: fallback.started || fallback.alreadyRunning,
    failures: runnerAvailable ? [] : [{ key: "lead_candidate_runner", reason: trigger.error ?? "runner dispatch failed" }],
    candidates,
  }
}
