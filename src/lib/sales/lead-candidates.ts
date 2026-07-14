import { createHash } from "node:crypto"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { normalizeDomain, normalizeCompanyName } from "./dedup"
import { upsertCompanyByDomain } from "./companies"
import { enqueueCompanyEnrichment, triggerEnrichmentRunner } from "./enrichment-jobs"
import { salesScopeFromCountry } from "./locale-scope"
import { fetchCommonCrawlDomains } from "./sources/commoncrawl-domains"
import { detectTechStack, type TechItem } from "./sources/wappalyzer"
import type { SalesCompany } from "./types"
import {
  clampScore,
  inferCountrySignals,
  scoreCandidate,
  technologySlug,
  tldPatternsForCountry,
  type CandidateCountrySignal,
  type CandidateLane,
  type CandidateScore,
  type CandidateStatus,
} from "./lead-candidate-scoring"
import { listLeadCandidates, type CandidateListItem } from "./lead-candidate-list"

export { listLeadCandidates } from "./lead-candidate-list"
export type { CandidateListFilters, CandidateListItem } from "./lead-candidate-list"

export interface CommonCrawlCandidateInput {
  countryCode: string
  technology?: string | null
  limit?: number
  verifyLimit?: number
  promote?: boolean
  minOpportunityScore?: number
}

export interface LocalSmbInputRow {
  businessName: string
  countryCode: string
  listingUrl?: string | null
  category?: string | null
  address?: string | null
  phone?: string | null
  socialLinks?: string[]
  websiteUrl?: string | null
  sourceSlug?: string | null
  raw?: Record<string, unknown>
}

export interface CandidateAcquisitionSummary {
  ok: boolean
  source: string
  fetched: number
  upserted: number
  verified: number
  matchedTechnology: number
  scored: number
  promoted: number
  jobsEnqueued: number
  failures: Array<{ key: string; reason: string }>
  candidates: CandidateListItem[]
}

export interface CandidateRow {
  id: string
  domain: string
  root_url: string | null
  lane: CandidateLane
  source_slug: string
  status: CandidateStatus
  company_id: string | null
  last_seen_at: string
  meta: Record<string, unknown> | null
}

function identityHash(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 12)
}

export function guessedCompanyName(domain: string): string {
  const normalized = normalizeDomain(domain) ?? domain
  const label = normalized.split(".")[0] ?? normalized
  return label
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || normalized
}

function localSmbIdentity(row: LocalSmbInputRow): string {
  const nameKey = normalizeCompanyName(row.businessName) ?? row.businessName.trim().toLowerCase()
  const seed = [nameKey, row.countryCode.toUpperCase(), row.address ?? "", row.phone ?? "", row.listingUrl ?? ""].join("|")
  return `local-${identityHash(seed)}.no-website.local`
}

export async function upsertCandidateDomain(input: {
  domain: string
  rootUrl: string | null
  lane: CandidateLane
  sourceSlug: string
  sourceRunId?: string | null
  meta?: Record<string, unknown>
}): Promise<CandidateRow> {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")
  const normalized = input.lane === "no_website_local_smb" ? input.domain.trim().toLowerCase() : normalizeDomain(input.domain)
  if (!normalized) throw new Error(`invalid candidate domain: ${input.domain}`)

  const { data, error } = await sb
    .from(DB_TABLES.SALES_LEAD_CANDIDATE_DOMAINS)
    .upsert(
      {
        domain: normalized,
        root_url: input.rootUrl,
        lane: input.lane,
        source_slug: input.sourceSlug,
        source_run_id: input.sourceRunId ?? null,
        last_seen_at: new Date().toISOString(),
        meta: input.meta ?? {},
      },
      { onConflict: "domain", ignoreDuplicates: false },
    )
    .select("id, domain, root_url, lane, source_slug, status, company_id, last_seen_at, meta")
    .single()
  if (error) throw new Error(error.message)
  return data as CandidateRow
}

export async function saveCandidateEvidence(input: {
  candidate: CandidateRow
  sourceSlug: string
  observedUrl: string | null
  rawEvidence: Record<string, unknown>
  signatureHits: TechItem[]
  countrySignals: CandidateCountrySignal[]
  score: CandidateScore
}): Promise<void> {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")

  const now = new Date().toISOString()
  const { error: observationError } = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_OBSERVATIONS).insert({
    candidate_id: input.candidate.id,
    source_slug: input.sourceSlug,
    observed_url: input.observedUrl,
    observed_at: now,
    raw_evidence: input.rawEvidence,
    signature_hits: input.signatureHits,
  })
  if (observationError) throw new Error(observationError.message)

  if (input.countrySignals.length > 0) {
    const { error } = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_COUNTRY_SIGNALS).insert(
      input.countrySignals.map((signal) => ({
        candidate_id: input.candidate.id,
        country_code: signal.countryCode,
        signal_type: signal.signalType,
        confidence: signal.confidence,
        evidence: signal.evidence,
        observed_at: now,
      })),
    )
    if (error) throw new Error(error.message)
  }

  if (input.signatureHits.length > 0) {
    const { error } = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_TECH_DETECTIONS).upsert(
      input.signatureHits.map((tech) => ({
        candidate_id: input.candidate.id,
        technology_name: tech.name,
        technology_slug: technologySlug(tech.name),
        category: tech.category,
        confidence: tech.confidence ?? 0,
        evidence_url: input.observedUrl,
        evidence_type: "homepage",
        source_slug: input.sourceSlug,
        detected_at: now,
      })),
      { onConflict: "candidate_id,technology_slug,source_slug,evidence_type", ignoreDuplicates: false },
    )
    if (error) throw new Error(error.message)
  }

  const { error: scoreError } = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_SCORES).upsert(
    {
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
      scored_at: now,
    },
    { onConflict: "candidate_id", ignoreDuplicates: false },
  )
  if (scoreError) throw new Error(scoreError.message)

  const { data: currentCandidate } = await sb
    .from(DB_TABLES.SALES_LEAD_CANDIDATE_DOMAINS)
    .select("observation_count")
    .eq("id", input.candidate.id)
    .single()
  const currentCount = (currentCandidate as { observation_count?: number } | null)?.observation_count ?? 0
  const { error: updateError } = await sb
    .from(DB_TABLES.SALES_LEAD_CANDIDATE_DOMAINS)
    .update({ status: "scored", observation_count: currentCount + 1, last_seen_at: now })
    .eq("id", input.candidate.id)
  if (updateError) throw new Error(updateError.message)
}

export async function promoteCandidate(input: {
  candidate: CandidateRow
  countryCode: string
  sourceSlug: string
  companyName: string
  score: CandidateScore
  detections: TechItem[]
}): Promise<{ ok: boolean; company?: SalesCompany; jobQueued?: boolean; error?: string }> {
  const scope = salesScopeFromCountry({ targetCountry: input.countryCode })
  const saved = await upsertCompanyByDomain({
    domain: input.candidate.domain,
    company_name: input.companyName,
    region: scope.region,
    report_locale: scope.reportLocale,
    target_country: scope.targetCountry,
    source: input.sourceSlug,
    pipeline_status: "scanning",
    tech_stack: { detections: input.detections, source: input.sourceSlug },
    meta: {
      lead_candidate: {
        id: input.candidate.id,
        lane: input.candidate.lane,
        source: input.sourceSlug,
        score: input.score,
        promoted_at: new Date().toISOString(),
      },
    },
  })
  if (!saved.ok || !saved.company) return { ok: false, error: saved.error ?? "company upsert failed" }

  const sb = getServiceSalesSupabase()
  if (sb) {
    const { error } = await sb
      .from(DB_TABLES.SALES_LEAD_CANDIDATE_DOMAINS)
      .update({ status: "promoted", company_id: saved.company.id })
      .eq("id", input.candidate.id)
    if (error) {
      console.error("[lead-candidates] candidate promotion marker failed:", error.message)
      return { ok: false, error: `candidate marker update failed: ${error.message}` }
    }
  } else {
    console.error("[lead-candidates] Supabase not available for candidate marker update")
    return { ok: false, error: "Supabase service_role not configured" }
  }

  const queued = await enqueueCompanyEnrichment({
    companyId: saved.company.id,
    source: input.sourceSlug,
    triggeredBy: "lead_candidate_acquisition",
    priority: 72,
    payload: {
      candidate_id: input.candidate.id,
      country_code: input.countryCode,
      opportunity_score: input.score.opportunityScore,
      technologies: input.detections.map((tech) => tech.name),
    },
  })
  return { ok: true, company: saved.company, jobQueued: queued.ok, error: queued.error }
}

export async function ingestCommonCrawlCandidates(input: CommonCrawlCandidateInput): Promise<CandidateAcquisitionSummary> {
  const countryCode = input.countryCode.trim().toUpperCase()
  const source = "common_crawl_domains"
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 1000)
  const verifyLimit = Math.min(Math.max(input.verifyLimit ?? Math.min(limit, 30), 0), Math.min(limit, 120))
  const minOpportunityScore = clampScore(input.minOpportunityScore ?? 68)
  const patterns = tldPatternsForCountry(countryCode)
  const failures: Array<{ key: string; reason: string }> = []
  const domains = new Set<string>()

  for (const pattern of patterns) {
    const result = await fetchCommonCrawlDomains(pattern, Math.ceil(limit / patterns.length))
    if (!result.ok) failures.push({ key: pattern, reason: result.error ?? "Common Crawl returned no domains" })
    for (const domain of result.domains) domains.add(domain)
  }

  let upserted = 0
  let verified = 0
  let matchedTechnology = 0
  let scored = 0
  let promoted = 0
  let jobsEnqueued = 0
  const output: CandidateListItem[] = []

  for (const domain of [...domains].slice(0, limit)) {
    try {
      const rootUrl = `https://${domain}`
      const candidate = await upsertCandidateDomain({
        domain,
        rootUrl,
        lane: "tech_footprint",
        sourceSlug: source,
        meta: { country_code: countryCode, requested_technology: input.technology ?? null },
      })
      upserted++

      if (verified >= verifyLimit) continue
      verified++
      const detection = await detectTechStack(rootUrl)
      const detections = detection.tech
      const countrySignals = inferCountrySignals({ domain, targetCountry: countryCode })
      const requestedSlug = input.technology ? technologySlug(input.technology) : null
      const isStackMatch = requestedSlug ? detections.some((tech) => technologySlug(tech.name) === requestedSlug) : detections.length > 0
      if (isStackMatch) matchedTechnology++
      const score = scoreCandidate({
        requestedTechnology: input.technology,
        detections,
        countrySignals,
        lane: "tech_footprint",
        hasWebsite: true,
        hasContactSignal: false,
        source,
      })
      await saveCandidateEvidence({
        candidate,
        sourceSlug: source,
        observedUrl: rootUrl,
        rawEvidence: { server: detection.server, country_code: countryCode, requested_technology: input.technology ?? null },
        signatureHits: detections,
        countrySignals,
        score,
      })
      scored++

      if (input.promote && score.opportunityScore >= minOpportunityScore && isStackMatch) {
        const promotion = await promoteCandidate({
          candidate,
          countryCode,
          sourceSlug: source,
          companyName: guessedCompanyName(domain),
          score,
          detections,
        })
        if (promotion.ok) {
          promoted++
          if (promotion.jobQueued) jobsEnqueued++
        } else {
          failures.push({ key: domain, reason: promotion.error ?? "promotion failed" })
        }
      }
    } catch (error) {
      console.error("[lead-candidates] Common Crawl ingestion failed:", domain, error)
      failures.push({ key: domain, reason: error instanceof Error ? error.message : "ingestion failed" })
    }
  }

  if (jobsEnqueued > 0) {
    const trigger = await triggerEnrichmentRunner(Math.min(jobsEnqueued, 3))
    if (!trigger.ok) failures.push({ key: "trigger_enrichment_runner", reason: trigger.error ?? "trigger failed" })
  }

  output.push(...await listLeadCandidates({ countryCode, technology: input.technology, limit: 30 }))
  return { ok: failures.length === 0 || upserted > 0, source, fetched: domains.size, upserted, verified, matchedTechnology, scored, promoted, jobsEnqueued, failures: failures.slice(0, 30), candidates: output }
}

export async function ingestLocalSmbCandidates(rows: LocalSmbInputRow[], promote = false): Promise<CandidateAcquisitionSummary> {
  const sourceSlugs = [...new Set(rows.map((row) => row.sourceSlug?.trim()).filter((value): value is string => Boolean(value)))]
  const source = sourceSlugs.length === 1 ? sourceSlugs[0] : "local_smb_directory"
  const failures: Array<{ key: string; reason: string }> = []
  let upserted = 0
  let scored = 0
  let promoted = 0
  let jobsEnqueued = 0

  for (const row of rows.slice(0, 500)) {
    try {
      const sourceSlug = row.sourceSlug?.trim() || "local_smb_directory"
      const countryCode = row.countryCode.trim().toUpperCase()
      const hasWebsite = Boolean(row.websiteUrl?.trim())
      const identity = hasWebsite ? normalizeDomain(row.websiteUrl) ?? localSmbIdentity(row) : localSmbIdentity(row)
      const evidenceText = [row.businessName, row.category, row.address, row.phone, row.listingUrl, ...(row.socialLinks ?? [])]
        .filter(Boolean)
        .join("\n")
      const candidate = await upsertCandidateDomain({
        domain: identity,
        rootUrl: hasWebsite ? row.websiteUrl?.trim() ?? null : null,
        lane: "no_website_local_smb",
        sourceSlug,
        meta: {
          business_name: row.businessName,
          category: row.category ?? null,
          address: row.address ?? null,
          phone: row.phone ?? null,
          listing_url: row.listingUrl ?? null,
          social_links: row.socialLinks ?? [],
          has_website: hasWebsite,
          raw: row.raw ?? {},
        },
      })
      upserted++

      const countrySignals = inferCountrySignals({ domain: identity, targetCountry: countryCode, evidenceText })
      const score = scoreCandidate({
        countrySignals,
        lane: "no_website_local_smb",
        hasWebsite,
        hasContactSignal: Boolean(row.phone || row.listingUrl || (row.socialLinks?.length ?? 0) > 0),
        source: sourceSlug,
      })
      await saveCandidateEvidence({
        candidate,
        sourceSlug,
        observedUrl: row.listingUrl ?? row.websiteUrl ?? null,
        rawEvidence: { ...row, identity, country_code: countryCode },
        signatureHits: [],
        countrySignals,
        score,
      })
      scored++

      if (promote && score.opportunityScore >= 62) {
        const promotion = await promoteCandidate({
          candidate,
          countryCode,
          sourceSlug,
          companyName: row.businessName,
          score,
          detections: [],
        })
        if (promotion.ok) {
          promoted++
          if (promotion.jobQueued) jobsEnqueued++
        } else {
          failures.push({ key: row.businessName, reason: promotion.error ?? "promotion failed" })
        }
      }
    } catch (error) {
      console.error("[lead-candidates] local SMB ingestion failed:", row.businessName, error)
      failures.push({ key: row.businessName, reason: error instanceof Error ? error.message : "local SMB ingestion failed" })
    }
  }

  if (jobsEnqueued > 0) {
    const trigger = await triggerEnrichmentRunner(Math.min(jobsEnqueued, 3))
    if (!trigger.ok) failures.push({ key: "trigger_enrichment_runner", reason: trigger.error ?? "trigger failed" })
  }

  const countryCode = rows[0]?.countryCode ?? null
  const candidates = await listLeadCandidates({
    countryCode,
    lane: "no_website_local_smb",
    sourceSlug: sourceSlugs.length === 1 ? sourceSlugs[0] : null,
    limit: 100,
  })
  return { ok: failures.length === 0 || upserted > 0, source, fetched: rows.length, upserted, verified: rows.length, matchedTechnology: 0, scored, promoted, jobsEnqueued, failures: failures.slice(0, 30), candidates }
}
