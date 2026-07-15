import type { DiagnosticReportData } from "./diagnostic"
import type { Industry } from "./types"
import type { BusinessModel } from "./japan-entry-projection"

export const MANUAL_WORK_STATUSES = [
  "processing",
  "needs_review",
  "completed",
  "failed",
  "duplicate",
  "rejected",
] as const
export type ManualWorkStatus = (typeof MANUAL_WORK_STATUSES)[number]

export const MANUAL_WORK_STAGES = [
  "fetching",
  "classifying",
  "form_discovery",
  "copy_generation",
  "report_generation",
  "twenty_sync",
  "complete",
  "failed",
] as const
export type ManualWorkStage = (typeof MANUAL_WORK_STAGES)[number]

export type QualificationStatus = "qualified" | "review_required" | "rejected"
export type TwentySyncStatus = "not_started" | "skipped" | "synced" | "failed" | "duplicate"

export interface ManualCompanyProfile {
  companyName: string
  countryCode: string | null
  isJapaneseCompany: boolean
  smbStatus: QualificationStatus
  smbConfidence: number
  smbEvidence: string[]
  japanEntryFitStatus: QualificationStatus
  japanEntryFitConfidence: number
  japanEntryFitEvidence: string[]
  businessModel: BusinessModel
  industry: Industry
  productContext: string
  observedFacts: string[]
}

export interface ManualJapanEntryWorkRow {
  id: string
  report_token: string
  input_url: string
  canonical_url: string
  domain: string
  status: ManualWorkStatus
  stage: ManualWorkStage
  company_name: string | null
  country_code: string | null
  is_japanese_company: boolean | null
  smb_status: QualificationStatus | null
  smb_confidence: number | null
  japan_entry_fit_status: QualificationStatus | null
  japan_entry_fit_confidence: number | null
  business_model: BusinessModel | null
  industry: Industry | null
  product_context: string | null
  profile: Record<string, unknown>
  evidence: Record<string, unknown>
  form_discovery: Record<string, unknown>
  form_url: string | null
  initial_message: string | null
  message_review: Record<string, unknown>
  report_data: DiagnosticReportData | Record<string, never>
  report_url: string | null
  twenty_company_id: string | null
  twenty_sync_status: TwentySyncStatus
  error_message: string | null
  attempts: number
  sent: false
  created_at: string
  updated_at: string
}

export interface ManualWorkListResponse {
  ok: boolean
  items: ManualJapanEntryWorkRow[]
  error?: string
}
