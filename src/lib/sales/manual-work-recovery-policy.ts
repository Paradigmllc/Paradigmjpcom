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

export function isManualWorkRecoveryAvailable(item: RecoveryState): boolean {
  const hasRecordedOutcome = Boolean(
    item.manually_sent_at || item.reply_received_at || item.founder_forwarded_at || item.meeting_converted_at,
  )
  if (hasRecordedOutcome) return false
  if (isFastQualification(item)) return item.is_japanese_company !== true
  if (item.status === "rejected" && item.twenty_sync_status !== "failed") return false
  const generationStatus = typeof item.message_review?.generation_status === "string"
    ? item.message_review.generation_status
    : ""
  const generationFailed = ["failed", "retry_required"].includes(generationStatus)
  return item.status === "failed"
    || item.twenty_sync_status === "failed"
    || generationFailed
    || hasLegacyReadinessInversion(item)
}

export function isExplicitManualWorkArtifactRefresh(item: RecoveryState, retryRequested: boolean): boolean {
  if (!retryRequested || !["completed", "needs_review", "rejected"].includes(item.status)) return false
  return !Boolean(item.manually_sent_at || item.reply_received_at || item.founder_forwarded_at || item.meeting_converted_at)
}
