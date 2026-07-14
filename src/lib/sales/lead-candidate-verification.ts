import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { isCustomerFacingBusinessDomain } from "./data-quality-guard"
import { decideFormQualification, isEnterpriseLikeStack } from "./lead-factory-qualification"
import { evaluateLeadQualityGate, fetchHomepageQualityProfile } from "./lead-quality-gate"
import { promoteFormQualifiedCandidate } from "./lead-candidate-promotion"
import {
  inferCountrySignals,
  scoreCandidate,
  technologySlug,
  type CandidateCountrySignal,
  type CandidateLane,
  type CandidateScore,
} from "./lead-candidate-scoring"
import type { LeadSourceConfig, LeadSourceRecord } from "./lead-source-records"
import { salesScopeFromCountry } from "./locale-scope"
import { mergeTechItems } from "./passive-inventory-utils"
import { discoverFormUrl } from "./sources/form-discovery"
import { detectTechStack, type TechItem } from "./sources/wappalyzer"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>
type EvidenceSourceRecord = LeadSourceRecord & { source: LeadSourceConfig }

export const EVIDENCE_FIRST_SOURCE = "evidence_first_sources"

export interface LeadCandidateRunRow {
  id: string
  source_slug: string
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
  source_config_ids: string[]
  require_source_evidence: boolean
  fetched_count: number
  upserted_count: number
  cursor?: JsonRecord
}

export interface LeadCandidateRunItemRow {
  id: string
  run_id: string
  candidate_id: string | null
  domain: string
  root_url: string | null
  attempts: number
  meta?: JsonRecord | null
}

interface CandidateRow {
  id: string
  domain: string
  root_url: string | null
  lane: CandidateLane
  source_slug: string
}

function getSb(): ServiceSupabase {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")
  return sb
}

function nowIso(): string {
  return new Date().toISOString()
}

function readSourceRecord(item: LeadCandidateRunItemRow): EvidenceSourceRecord | null {
  const value = item.meta?.source_record
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const source = record.source
  if (!source || typeof source !== "object" || Array.isArray(source)) return null
  if (typeof record.id !== "string" || typeof record.company_name !== "string" || typeof record.domain !== "string" || typeof record.source_page_url !== "string") return null
  return value as EvidenceSourceRecord
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
    source_slug: EVIDENCE_FIRST_SOURCE,
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
      source_slug: EVIDENCE_FIRST_SOURCE,
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
  const current = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_DOMAINS).select("observation_count").eq("id", input.candidate.id).single()
  if (current.error) throw new Error(current.error.message)
  const currentCount = (current.data as { observation_count?: number } | null)?.observation_count ?? 0
  const updated = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_DOMAINS).update({ status: "scored", observation_count: currentCount + 1, last_seen_at: observedAt }).eq("id", input.candidate.id)
  if (updated.error) throw new Error(updated.error.message)
}

async function closeWithoutPromotion(item: LeadCandidateRunItemRow, patch: JsonRecord) {
  const result = await getSb().from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).update({
    attempts: item.attempts + 1,
    tech_matched: false,
    form_verified: false,
    twenty_synced: false,
    error_message: null,
    processed_at: nowIso(),
    ...patch,
  }).eq("id", item.id)
  if (result.error) throw new Error(result.error.message)
  return { techMatched: false, promoted: false, twentySynced: false }
}

export async function verifyLeadCandidateItem(run: LeadCandidateRunRow, item: LeadCandidateRunItemRow) {
  const sb = getSb()
  const candidateRes = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_DOMAINS).select("id, domain, root_url, lane, source_slug").eq("id", item.candidate_id).single()
  if (candidateRes.error) throw new Error(candidateRes.error.message)
  const candidate = candidateRes.data as CandidateRow
  if (!isCustomerFacingBusinessDomain(candidate.domain)) {
    return closeWithoutPromotion(item, {
      status: "skipped",
      quality_status: "rejected",
      quality_reasons: ["non_customer_facing_domain"],
      quality_gate: { status: "rejected", reasons: ["non_customer_facing_domain"] },
    })
  }
  const rootUrl = candidate.root_url ?? item.root_url ?? `https://${candidate.domain}`
  const sourceRecord = readSourceRecord(item)
  if (!sourceRecord) {
    return closeWithoutPromotion(item, {
      status: "rejected",
      quality_status: "rejected",
      quality_reasons: ["invalid_source_evidence"],
      quality_gate: { status: "rejected", reasons: ["invalid_source_evidence"] },
    })
  }
  const homepage = await fetchHomepageQualityProfile(rootUrl)
  const activeDetection = await detectTechStack(rootUrl)
  const detection = { ...activeDetection, tech: mergeTechItems(activeDetection.tech) }
  const countrySignals = inferCountrySignals({ domain: candidate.domain, targetCountry: run.country_code, evidenceText: `${homepage.title} ${homepage.description} ${homepage.visibleText}` })
  const enterpriseLike = isEnterpriseLikeStack(detection.tech)
  const qualityGate = evaluateLeadQualityGate({ sourceRecord, homepage, countrySignals, detections: detection.tech, enterpriseLike })
  if (qualityGate.status !== "passed") {
    return closeWithoutPromotion(item, {
      status: qualityGate.status,
      quality_status: qualityGate.status,
      quality_gate: qualityGate,
      quality_reasons: qualityGate.reasons,
    })
  }

  const form = await discoverFormUrl({
    homeUrl: rootUrl,
    homepageHtml: homepage.html,
    region: salesScopeFromCountry({ targetCountry: run.country_code }).region,
    enableLlm: false,
    enableCrawl4Ai: true,
    timeoutMs: 5_000,
  })
  const qualification = decideFormQualification(form, run.min_form_confidence)
  if (!qualification.qualified) {
    return closeWithoutPromotion(item, {
      status: "form_missing",
      quality_status: "review_required",
      quality_gate: { ...qualityGate, status: "review_required", form: { qualified: false, reason: qualification.reason, discovery: form } },
      quality_reasons: [`form:${qualification.reason}`],
      form_url: null,
      form_method: form.method,
      form_confidence: form.confidence,
      form_checked_at: nowIso(),
      form_qualification_reason: qualification.reason,
    })
  }

  const requestedSlug = run.technology ? technologySlug(run.technology) : null
  const techMatched = requestedSlug ? detection.tech.some((tech) => technologySlug(tech.name) === requestedSlug) : qualityGate.offerFit.passed
  const score = scoreCandidate({
    requestedTechnology: run.technology,
    detections: detection.tech,
    countrySignals,
    lane: "tech_footprint",
    hasWebsite: true,
    hasContactSignal: true,
    source: EVIDENCE_FIRST_SOURCE,
    isEnterpriseLike: enterpriseLike,
    smbEvidenceScore: qualityGate.smb.score,
    marketFitScore: qualityGate.offerFit.score,
  })
  await saveEvidence({
    candidate,
    runId: run.id,
    observedUrl: rootUrl,
    rawEvidence: { server: detection.server, country_code: run.country_code, requested_technology: run.technology, source_record: sourceRecord, quality_gate: qualityGate, form_discovery: form, form_qualification: qualification },
    signatureHits: detection.tech,
    countrySignals,
    score,
  })

  let companyId: string | null = null
  let twentySynced = false
  let twentyCompanyId: string | null = null
  let status = "scored"
  const eligibleByScore = score.opportunityScore >= run.min_opportunity_score && score.smbScore >= run.min_smb_score && techMatched
  if (run.promote && eligibleByScore) {
    const promotion = await promoteFormQualifiedCandidate({
      runId: run.id,
      countryCode: run.country_code,
      syncTwenty: run.sync_twenty,
      candidateId: candidate.id,
      companyName: sourceRecord.company_name,
      domain: candidate.domain,
      sourcePageUrl: sourceRecord.source_page_url,
      qualityGate,
      score,
      detections: detection.tech,
      form,
      source: EVIDENCE_FIRST_SOURCE,
    })
    if (!promotion.promoted) throw new Error(promotion.error ?? "promotion failed")
    companyId = promotion.companyId ?? null
    twentySynced = promotion.twentySynced
    twentyCompanyId = promotion.twentyCompanyId ?? null
    status = "promoted"
  }
  const update = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS).update({
    status,
    attempts: item.attempts + 1,
    tech_matched: techMatched,
    job_enqueued: false,
    opportunity_score: score.opportunityScore,
    company_id: companyId,
    quality_status: "passed",
    quality_gate: { ...qualityGate, form: { qualified: true, discovery: form } },
    quality_reasons: [],
    form_url: form.formUrl,
    form_method: form.method,
    form_confidence: form.confidence,
    form_verified: true,
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
