import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { approveLeadCandidateItems } from "./lead-candidate-review"
import { parsePromotionSnapshot, type ReviewItemRow } from "./lead-candidate-review-gate"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

const activeRuns = new Set<string>()
const MAX_BATCHES = 500
const BATCH_SIZE = 20

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
  const result = await getSb().from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS)
    .select("id, run_id, candidate_id, source_config_id, source_record_id, domain, company_name, source_page_url, status, quality_status, opportunity_score, form_url, form_verified, form_checked_at, review_status, promotion_attempts, meta")
    .eq("run_id", runId)
    .eq("status", "awaiting_review")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true })
    .limit(100)
  if (result.error) throw new Error(result.error.message)
  return ((result.data ?? []) as ReviewItemRow[]).filter(isHighConfidenceAutoPromotionItem).slice(0, BATCH_SIZE).map((item) => item.id)
}

async function runHighConfidencePromotion(input: { runId: string; operatorName: string; note: string }): Promise<void> {
  try {
    for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
      const itemIds = await nextEligibleIds(input.runId)
      if (itemIds.length === 0) return
      const result = await approveLeadCandidateItems({ ...input, itemIds })
      if (result.approved === 0 && result.failed === 0) return
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
