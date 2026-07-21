import type { ManualJapanEntryReportData } from "./manual-japan-entry-report-types"
import type { Industry } from "./types"
import type { BusinessModel } from "./japan-entry-projection"
import type { ManualMessageVariant } from "./manual-japan-entry-experiment"
import type { ManualMessageAngle } from "./manual-japan-entry-angle"
import type { ManualOutreachPlaybook, ManualPositioningConcept } from "./manual-japan-entry-playbook"
import type {
  ManualMasterLeadLedger,
  ManualQualificationLedger,
  ManualWorkSourceAttribution,
} from "./manual-japan-entry-source-ledger"

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

export const MANUAL_COMMERCIAL_SIGNAL_KINDS = [
  "foreign_currency_revenue",
  "global_customers",
  "funding",
  "founder_led",
  "employee_range",
  "international_operations",
] as const
export type ManualCommercialSignalKind = (typeof MANUAL_COMMERCIAL_SIGNAL_KINDS)[number]

export interface ManualCommercialSignal {
  kind: ManualCommercialSignalKind
  sourcePhrase: string
  detail: string
}

export type ManualMarketPriority = "global_priority" | "regional_core" | "precision" | "selective" | "individual_review"
export type ManualCommercialEvidenceStatus = "observed" | "partial" | "unverified"

export interface ManualMarketLens {
  priority: ManualMarketPriority
  label: string
  rationale: string
  focusIndustries: string[]
  commercialEvidenceStatus: ManualCommercialEvidenceStatus
  commercialSignalCount: number
  pricingPolicy: "no_automatic_country_adjustment"
  requiresHumanReview: true
}

export interface ManualDeepSeekStageUsage {
  stage: "company_classification"
  requests: number
  models: string[]
  promptTokens: number
  completionTokens: number
  cacheHitTokens: number
  cacheMissTokens: number
  elapsedMs: number
}

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
  outreachPlaybook: ManualOutreachPlaybook
  positioningConcept: ManualPositioningConcept | null
  commercialSignals?: ManualCommercialSignal[]
  marketLens?: ManualMarketLens
  analysisUsage?: ManualDeepSeekStageUsage
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
  message_variant_requested: ManualMessageVariant
  message_variant: ManualMessageVariant
  message_variant_fallback_reason: string | null
  message_angle_requested: ManualMessageAngle
  message_angle: ManualMessageAngle
  message_angle_fallback_reason: string | null
  outreach_playbook: ManualOutreachPlaybook
  qualification_ledger: ManualQualificationLedger | Record<string, never>
  master_lead_ledger: ManualMasterLeadLedger | Record<string, never>
  source_attributions: ManualWorkSourceAttribution[]
  report_data: ManualJapanEntryReportData | Record<string, unknown>
  report_url: string | null
  twenty_company_id: string | null
  twenty_sync_status: TwentySyncStatus
  error_message: string | null
  attempts: number
  sent: false
  manually_sent_at: string | null
  reply_received_at: string | null
  founder_forwarded_at: string | null
  meeting_converted_at: string | null
  created_at: string
  updated_at: string
}

export interface ManualWorkListResponse {
  ok: boolean
  items: ManualJapanEntryWorkRow[]
  error?: string
}
