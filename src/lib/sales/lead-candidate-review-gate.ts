import type { CandidateScore } from "./lead-candidate-scoring"
import type { LeadQualityGate } from "./lead-quality-gate"
import type { LeadSourceConfig, LeadSourceRecord } from "./lead-source-records"
import { isAllowedFormUrlForOrigin } from "./sources/external-form-discovery"
import type { FormDiscoveryResult } from "./sources/form-discovery"
import type { TechItem } from "./sources/wappalyzer"

type JsonRecord = Record<string, unknown>

export interface ReviewItemRow {
  id: string
  run_id: string
  candidate_id: string
  source_config_id: string
  source_record_id: string
  domain: string
  company_name: string
  source_page_url: string
  status: string
  quality_status: string
  opportunity_score: number | null
  form_url: string | null
  form_verified: boolean
  form_checked_at: string | null
  review_status: string
  promotion_attempts: number
  meta: JsonRecord
}

export type PromotionSourceRecord = LeadSourceRecord & { source: LeadSourceConfig }

export interface PromotionSnapshot {
  sourceRecord: PromotionSourceRecord
  qualityGate: LeadQualityGate
  score: CandidateScore
  detections: TechItem[]
  form: FormDiscoveryResult
  countryCode: string
  techMatched: boolean
  verifiedAt: string
}

interface CurrentSourceConfig {
  active?: boolean
  approval_status?: string
}

interface CurrentSourceRecord {
  active?: boolean
  observed_at?: unknown
}

const REVIEW_FRESHNESS_MS = 14 * 24 * 60 * 60_000
const SOURCE_FRESHNESS_MS = 45 * 24 * 60 * 60_000

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null
}

export function parsePromotionSnapshot(item: ReviewItemRow): PromotionSnapshot | null {
  const snapshot = asRecord(item.meta.promotion_snapshot)
  if (!snapshot) return null
  const sourceRecord = asRecord(snapshot.sourceRecord)
  const qualityGate = asRecord(snapshot.qualityGate)
  const score = asRecord(snapshot.score)
  const form = asRecord(snapshot.form)
  const inspection = asRecord(form?.inspection)
  const inspectionFields = inspection && Array.isArray(inspection.fields) ? inspection.fields : null
  if (!sourceRecord || !qualityGate || !score || !form) return null
  if (typeof sourceRecord.company_name !== "string" || typeof sourceRecord.source_page_url !== "string") return null
  if (qualityGate.status !== "passed" || typeof score.opportunityScore !== "number" || typeof score.smbScore !== "number") return null
  if (typeof form.formUrl !== "string" || form.verification !== "form" || typeof form.confidence !== "number") return null
  if (!inspection || inspection.status !== "form" || !inspectionFields) return null
  if (!["email", "message", "submit"].every((field) => inspectionFields.includes(field))) return null
  if (!Array.isArray(snapshot.detections) || typeof snapshot.countryCode !== "string" || snapshot.techMatched !== true || typeof snapshot.verifiedAt !== "string") return null
  return snapshot as unknown as PromotionSnapshot
}

function isFreshAt(value: string | null, maxAgeMs: number, nowMs: number): boolean {
  if (!value) return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && timestamp <= nowMs && nowMs - timestamp <= maxAgeMs
}

function isApprovedFormDestination(url: string, domain: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" && isAllowedFormUrlForOrigin(`https://${domain}`, parsed.toString())
  } catch (error) {
    console.warn("[lead-candidate-review-gate] invalid form URL:", error)
    return false
  }
}

export function promotionEligibilityReason(input: {
  item: ReviewItemRow
  minOpportunityScore: number
  minSmbScore: number
  sourceConfig: CurrentSourceConfig | undefined
  sourceRecord: CurrentSourceRecord | undefined
  nowMs?: number
}): string | null {
  const { item, sourceConfig, sourceRecord } = input
  const snapshot = parsePromotionSnapshot(item)
  const nowMs = input.nowMs ?? Date.now()
  if (item.status !== "awaiting_review" || !["pending", "promotion_failed"].includes(item.review_status)) return "candidate_not_pending_review"
  if (item.promotion_attempts >= 20) return "promotion_attempt_limit_reached"
  if (item.quality_status !== "passed" || !item.form_verified || !item.form_url) return "verification_gate_not_passed"
  if (!snapshot) return "promotion_snapshot_missing"
  if (item.form_url !== snapshot.form.formUrl) return "form_url_changed_since_verification"
  if (snapshot.score.opportunityScore < input.minOpportunityScore || snapshot.score.smbScore < input.minSmbScore) return "score_below_current_threshold"
  if (!isFreshAt(item.form_checked_at, REVIEW_FRESHNESS_MS, nowMs) || !isFreshAt(snapshot.verifiedAt, REVIEW_FRESHNESS_MS, nowMs)) return "verification_stale"
  if (!isApprovedFormDestination(item.form_url, item.domain)) return "form_url_not_approved_https_destination"
  if (!sourceConfig || sourceConfig.active !== true || sourceConfig.approval_status !== "approved") return "source_not_currently_approved"
  if (!sourceRecord || sourceRecord.active !== true || !isFreshAt(String(sourceRecord.observed_at ?? ""), SOURCE_FRESHNESS_MS, nowMs)) return "source_record_stale"
  return null
}
