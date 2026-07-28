import { isReadinessGapOnlyJapanEntryRejection } from "./manual-japan-entry-fit-policy"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"

type RecoveryState = Pick<ManualJapanEntryWorkRow, "status"> & Partial<Pick<
  ManualJapanEntryWorkRow,
  | "twenty_sync_status"
  | "manually_sent_at"
  | "reply_received_at"
  | "founder_forwarded_at"
  | "meeting_converted_at"
  | "is_japanese_company"
  | "country_code"
  | "business_model"
  | "japan_entry_fit_status"
  | "profile"
  | "evidence"
  | "message_review"
>>

function hasLegacyReadinessInversion(item: RecoveryState): boolean {
  const evidence = Array.isArray(item.profile?.japanEntryFitEvidence)
    ? item.profile.japanEntryFitEvidence.filter((value): value is string => typeof value === "string")
    : []
  const observedFacts = Array.isArray(item.profile?.observedFacts)
    ? item.profile.observedFacts.filter((value): value is string => typeof value === "string")
    : []
  const productContext = typeof item.profile?.productContext === "string" ? item.profile.productContext : undefined
  if (!item.business_model || !item.japan_entry_fit_status) return false
  return isReadinessGapOnlyJapanEntryRejection({
    isJapaneseCompany: item.is_japanese_company === true,
    businessModel: item.business_model,
    japanEntryFitStatus: item.japan_entry_fit_status,
    japanEntryFitEvidence: evidence,
    productContext,
    observedFacts,
  })
}

function isFastQualification(item: RecoveryState): boolean {
  return item.evidence?.analysis_mode === "fast_qualification"
    || item.message_review?.purpose === "fast_qualification"
}

function isGpt56Editorial(item: RecoveryState): boolean {
  const mode = item.evidence?.analysis_mode
  const status = item.message_review?.generation_status
  return (typeof mode === "string" && mode.startsWith("gpt56_editorial"))
    || (typeof status === "string" && status.includes("gpt56_editorial"))
    || item.message_review?.purpose === "editorial_generation"
}

function isNonJapanese(item: RecoveryState): boolean {
  return item.is_japanese_company !== true && item.country_code !== "JP"
}

export function isManualWorkRecoveryAvailable(item: RecoveryState): boolean {
  const hasRecordedOutcome = Boolean(
    item.manually_sent_at || item.reply_received_at || item.founder_forwarded_at || item.meeting_converted_at,
  )
  if (hasRecordedOutcome) return false
  const generationStatus = typeof item.message_review?.generation_status === "string"
    ? item.message_review.generation_status
    : ""
  if (item.status === "processing") return generationStatus === "retry_required"
  if (isFastQualification(item)) return isNonJapanese(item)
  if (isGpt56Editorial(item)) return isNonJapanese(item)
  if (isNonJapanese(item) && ["completed", "needs_review", "failed"].includes(item.status)) return true
  if (item.status === "rejected" && item.twenty_sync_status !== "failed") return false
  const generationFailed = ["failed", "failed_quality_gate", "retry_required"].includes(generationStatus)
  return item.status === "failed"
    || item.twenty_sync_status === "failed"
    || generationFailed
    || hasLegacyReadinessInversion(item)
}

export function isExplicitManualWorkArtifactRefresh(item: RecoveryState, retryRequested: boolean): boolean {
  const standardRefresh = ["completed", "needs_review"].includes(item.status)
  const fastRejectedRefresh = item.status === "rejected" && isFastQualification(item)
  if (!retryRequested || (!standardRefresh && !fastRejectedRefresh)) return false
  return !Boolean(item.manually_sent_at || item.reply_received_at || item.founder_forwarded_at || item.meeting_converted_at)
}
