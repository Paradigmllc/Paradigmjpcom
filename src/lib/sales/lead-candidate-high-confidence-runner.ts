import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { approveLeadCandidateItems } from "./lead-candidate-review"
import { parsePromotionSnapshot, type ReviewItemRow } from "./lead-candidate-review-gate"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

const activeRuns = new Set<string>()
const MAX_BATCHES = 500
const PAGE_SIZE = 100
const MAX_SCAN_ITEMS = 10_000
export const HIGH_CONFIDENCE_TWENTY_WRITE_POLICY = {
  // Twenty's live OpenAPI supports 60-record batch upserts and the official
  // request limit is 100/minute. Three requests per batch (lookup, upsert,
  // direct read-back) with a five-second gap stays below half that budget.
  batchSize: 60,
  windowMs: 5_000,
} as const
const BATCH_SIZE = HIGH_CONFIDENCE_TWENTY_WRITE_POLICY.batchSize
const TWENTY_RATE_WINDOW_MS = HIGH_CONFIDENCE_TWENTY_WRITE_POLICY.windowMs

function getSb(): ServiceSupabase {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")
  return sb
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null
}

export function isHighConfidenceAutoPromotionItem(item: ReviewItemRow): boolean {
  const snapshot = parsePromotionSnapshot(item)
  if (!snapshot) return false
  const officialSmb = snapshot.sourceRecord.source.trust_tier >= 3
    && snapshot.qualityGate.smb.passed
    && snapshot.qualityGate.smb.score >= 90
    && snapshot.qualityGate.smb.evidence.some((value) => value.startsWith("employee_count:") || value.startsWith("official_sme_flag:"))
  const aiReview = asRecord(snapshot.qualityGate.aiReview)
  const aiQuotes = aiReview && Array.isArray(aiReview.evidenceQuotes) ? aiReview.evidenceQuotes.filter((value): value is string => typeof value === "string") : []
  const aiRisks = aiReview && Array.isArray(aiReview.riskFlags) ? aiReview.riskFlags : []
  const highConfidenceAi = aiReview?.passed === true
    && typeof aiReview.confidence === "number"
    && aiReview.confidence >= 0.96
    && aiQuotes.length >= 2
    && aiRisks.length === 0
    && snapshot.qualityGate.smb.evidence.some((value) => value.startsWith("deepseek_v4_pro:"))
  return officialSmb || highConfidenceAi
}

async function nextEligibleIds(runId: string): Promise<string[]> {
  const ids: string[] = []
  for (let offset = 0; offset < MAX_SCAN_ITEMS && ids.length < BATCH_SIZE; offset += PAGE_SIZE) {
    const result = await getSb().from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS)
      .select("id, run_id, candidate_id, source_config_id, source_record_id, domain, company_name, source_page_url, status, quality_status, opportunity_score, form_url, form_verified, form_checked_at, review_status, promotion_attempts, meta")
      .eq("run_id", runId)
      .eq("status", "awaiting_review")
      .eq("review_status", "pending")
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)
    if (result.error) throw new Error(result.error.message)
    const rows = (result.data ?? []) as ReviewItemRow[]
    ids.push(...rows.filter(isHighConfidenceAutoPromotionItem).map((item) => item.id).slice(0, BATCH_SIZE - ids.length))
    if (rows.length < PAGE_SIZE) break
  }
  return ids
}

function waitForTwentyRateWindow(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, TWENTY_RATE_WINDOW_MS))
}

async function runHighConfidencePromotion(input: { runId: string; operatorName: string; note: string }): Promise<void> {
  try {
    let itemIds = await nextEligibleIds(input.runId)
    for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
      if (itemIds.length === 0) return
      const result = await approveLeadCandidateItems({ ...input, itemIds })
      if (result.approved === 0 && result.failed === 0) return
      itemIds = await nextEligibleIds(input.runId)
      if (itemIds.length === 0) return
      await waitForTwentyRateWindow()
    }
    throw new Error(`High-confidence promotion exceeded ${MAX_BATCHES} batches`)
  } catch (error) {
    console.error("[lead-candidate-high-confidence-runner] failed:", input.runId, error)
  } finally {
    activeRuns.delete(input.runId)
  }
}

export function startHighConfidencePromotion(input: { runId: string; operatorName: string; note: string }): { started: boolean; alreadyRunning: boolean } {
  if (activeRuns.has(input.runId)) return { started: false, alreadyRunning: true }
  activeRuns.add(input.runId)
  setTimeout(() => { void runHighConfidencePromotion(input) }, 0)
  return { started: true, alreadyRunning: false }
}
