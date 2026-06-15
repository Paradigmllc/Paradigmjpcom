import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import {
  clampScore,
  technologySlug,
  type CandidateCountrySignal,
  type CandidateLane,
  type CandidateScore,
  type CandidateStatus,
} from "./lead-candidate-scoring"

export interface CandidateListFilters {
  countryCode?: string | null
  technology?: string | null
  status?: CandidateStatus | null
  lane?: CandidateLane | null
  minScore?: number | null
  limit?: number | null
}

export interface CandidateListItem {
  id: string
  domain: string
  rootUrl: string | null
  lane: CandidateLane
  sourceSlug: string
  status: CandidateStatus
  companyId: string | null
  lastSeenAt: string
  meta: Record<string, unknown>
  score: CandidateScore | null
  countries: CandidateCountrySignal[]
  technologies: Array<{
    name: string
    slug: string
    category: string | null
    confidence: number
    evidenceUrl: string | null
    sourceSlug: string
  }>
}

interface CandidateRow {
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

interface ScoreRow {
  candidate_id: string
  stack_fit_score: number
  smb_score: number
  freshness_score: number
  geo_confidence: number
  contactability_score: number
  website_absence_score: number
  opportunity_score: number
  false_positive_risk: number
  details: Record<string, unknown> | null
}

function toScore(row: ScoreRow | undefined): CandidateScore | null {
  if (!row) return null
  return {
    stackFitScore: row.stack_fit_score,
    smbScore: row.smb_score,
    freshnessScore: row.freshness_score,
    geoConfidence: row.geo_confidence,
    contactabilityScore: row.contactability_score,
    websiteAbsenceScore: row.website_absence_score,
    opportunityScore: row.opportunity_score,
    falsePositiveRisk: row.false_positive_risk,
    details: row.details ?? {},
  }
}

export async function listLeadCandidates(filters: CandidateListFilters = {}): Promise<CandidateListItem[]> {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 500)
  let candidateIds: Set<string> | null = null

  if (filters.countryCode) {
    const { data, error } = await sb
      .from(DB_TABLES.SALES_LEAD_CANDIDATE_COUNTRY_SIGNALS)
      .select("candidate_id")
      .eq("country_code", filters.countryCode.trim().toUpperCase())
      .gte("confidence", 35)
      .limit(limit * 10)
    if (error) throw new Error(error.message)
    candidateIds = new Set((data ?? []).map((row) => String(row.candidate_id)))
  }

  if (filters.technology) {
    const { data, error } = await sb
      .from(DB_TABLES.SALES_LEAD_CANDIDATE_TECH_DETECTIONS)
      .select("candidate_id")
      .eq("technology_slug", technologySlug(filters.technology))
      .gte("confidence", 50)
      .limit(limit * 10)
    if (error) throw new Error(error.message)
    const techIds = new Set((data ?? []).map((row) => String(row.candidate_id)))
    candidateIds = candidateIds ? new Set([...candidateIds].filter((id) => techIds.has(id))) : techIds
  }

  if (filters.minScore !== null && filters.minScore !== undefined) {
    const { data, error } = await sb
      .from(DB_TABLES.SALES_LEAD_CANDIDATE_SCORES)
      .select("candidate_id")
      .gte("opportunity_score", clampScore(filters.minScore))
      .limit(limit * 10)
    if (error) throw new Error(error.message)
    const scoreIds = new Set((data ?? []).map((row) => String(row.candidate_id)))
    candidateIds = candidateIds ? new Set([...candidateIds].filter((id) => scoreIds.has(id))) : scoreIds
  }

  if (candidateIds && candidateIds.size === 0) return []

  let query = sb
    .from(DB_TABLES.SALES_LEAD_CANDIDATE_DOMAINS)
    .select("id, domain, root_url, lane, source_slug, status, company_id, last_seen_at, meta")
    .order("last_seen_at", { ascending: false })
    .limit(limit)
  if (filters.status) query = query.eq("status", filters.status)
  if (filters.lane) query = query.eq("lane", filters.lane)
  if (candidateIds) query = query.in("id", [...candidateIds].slice(0, limit * 10))

  const { data: rows, error } = await query
  if (error) throw new Error(error.message)
  const candidates = (rows ?? []) as CandidateRow[]
  const ids = candidates.map((candidate) => candidate.id)
  if (ids.length === 0) return []

  const [scoreResult, countryResult, techResult] = await Promise.all([
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_SCORES).select("*").in("candidate_id", ids),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_COUNTRY_SIGNALS).select("*").in("candidate_id", ids),
    sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_TECH_DETECTIONS).select("*").in("candidate_id", ids),
  ])
  if (scoreResult.error) throw new Error(scoreResult.error.message)
  if (countryResult.error) throw new Error(countryResult.error.message)
  if (techResult.error) throw new Error(techResult.error.message)

  const scores = new Map((scoreResult.data ?? []).map((row) => [String(row.candidate_id), row as ScoreRow]))
  const countriesById = new Map<string, CandidateCountrySignal[]>()
  for (const row of countryResult.data ?? []) {
    const list = countriesById.get(String(row.candidate_id)) ?? []
    list.push({
      countryCode: String(row.country_code),
      signalType: String(row.signal_type),
      confidence: Number(row.confidence),
      evidence: String(row.evidence ?? ""),
    })
    countriesById.set(String(row.candidate_id), list)
  }
  const techById = new Map<string, CandidateListItem["technologies"]>()
  for (const row of techResult.data ?? []) {
    const list = techById.get(String(row.candidate_id)) ?? []
    list.push({
      name: String(row.technology_name),
      slug: String(row.technology_slug),
      category: row.category ? String(row.category) : null,
      confidence: Number(row.confidence),
      evidenceUrl: row.evidence_url ? String(row.evidence_url) : null,
      sourceSlug: String(row.source_slug),
    })
    techById.set(String(row.candidate_id), list)
  }

  return candidates
    .map((candidate) => ({
      id: candidate.id,
      domain: candidate.domain,
      rootUrl: candidate.root_url,
      lane: candidate.lane,
      sourceSlug: candidate.source_slug,
      status: candidate.status,
      companyId: candidate.company_id,
      lastSeenAt: candidate.last_seen_at,
      meta: candidate.meta ?? {},
      score: toScore(scores.get(candidate.id)),
      countries: countriesById.get(candidate.id) ?? [],
      technologies: techById.get(candidate.id) ?? [],
    }))
    .sort((a, b) => (b.score?.opportunityScore ?? 0) - (a.score?.opportunityScore ?? 0))
}
