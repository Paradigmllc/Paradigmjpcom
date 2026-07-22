import { MANUAL_JAPAN_ENTRY_REPORT_SCHEMA } from "./manual-japan-entry-report-types"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"

const LAST_GOOD_ARTIFACT_FIELDS = [
  "company_name",
  "country_code",
  "is_japanese_company",
  "smb_status",
  "smb_confidence",
  "japan_entry_fit_status",
  "japan_entry_fit_confidence",
  "business_model",
  "industry",
  "product_context",
  "profile",
  "evidence",
  "form_discovery",
  "form_url",
  "initial_message",
  "message_review",
  "qualification_ledger",
  "master_lead_ledger",
  "report_data",
  "report_url",
  "legacy_report_slug",
  "message_variant_requested",
  "message_variant",
  "message_variant_fallback_reason",
  "message_angle_requested",
  "message_angle",
  "message_angle_fallback_reason",
  "outreach_playbook",
  "twenty_company_id",
  "twenty_sync_status",
] as const

type LastGoodArtifactField = (typeof LAST_GOOD_ARTIFACT_FIELDS)[number]

export type ManualWorkLastGoodArtifacts = Pick<ManualJapanEntryWorkRow, LastGoodArtifactField>

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function hasCurrentCopyInvalidation(existing: ManualJapanEntryWorkRow): boolean {
  const review = existing.message_review
  const priorFailure = isRecord(review.last_regeneration_failure)
    && review.last_regeneration_failure.artifacts_preserved === true
  if (priorFailure) return true

  const company = existing.company_name?.trim()
  if (!company || !existing.initial_message) return false
  const paragraphs = existing.initial_message
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n\s*\n/)
    .map((value) => value.trim())
    .filter(Boolean)
  const opening = /^hello\b/i.test(paragraphs[0] ?? "") ? paragraphs[1] ?? "" : paragraphs[0] ?? ""
  const escaped = company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`^${escaped}\\s+(?:is|are)\\s+(?:an?\\s+)?`, "i").test(opening)
}

export function captureManualWorkLastGoodArtifacts(
  existing: ManualJapanEntryWorkRow | null,
): ManualWorkLastGoodArtifacts | null {
  if (!existing?.initial_message?.trim() || !existing.report_url) return null
  if (existing.message_review.passed !== true) return null
  if (hasCurrentCopyInvalidation(existing)) return null
  if (!isRecord(existing.report_data) || existing.report_data.schemaVersion !== MANUAL_JAPAN_ENTRY_REPORT_SCHEMA) return null

  return Object.fromEntries(
    LAST_GOOD_ARTIFACT_FIELDS.map((field) => [field, existing[field]]),
  ) as ManualWorkLastGoodArtifacts
}

export function buildLastGoodArtifactRestorePatch(
  snapshot: ManualWorkLastGoodArtifacts,
  errorMessage: string,
  failedAt = new Date().toISOString(),
): Record<string, unknown> {
  return {
    ...snapshot,
    status: "needs_review",
    stage: "complete",
    error_message: errorMessage.slice(0, 2_000),
    message_review: {
      ...snapshot.message_review,
      last_regeneration_failure: {
        failed_at: failedAt,
        message: errorMessage.slice(0, 1_500),
        artifacts_preserved: true,
      },
    },
  }
}
