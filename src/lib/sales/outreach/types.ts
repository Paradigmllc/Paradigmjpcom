import type { Region } from "../types"

export const FORM_CLASSIFICATIONS = [
  "safe_cf7",
  "safe_wpforms",
  "safe_generic",
  "risky_captcha",
  "risky_login",
  "risky_iframe",
  "skip_payment",
  "skip_unknown",
] as const

export type FormClassification = (typeof FORM_CLASSIFICATIONS)[number]

export const isSafeForm = (classification: FormClassification): boolean =>
  classification.startsWith("safe_")

export const OUTREACH_STAGES = [
  "queued",
  "discovering",
  "discovered",
  "discovery_failed",
  "classified_safe",
  "classified_risky",
  "classified_skip",
  "preflight_passed",
  "preflight_failed",
  "submitting",
  "submitted",
  "submit_uncertain",
  "submit_failed",
  "manual_queue",
] as const

export type OutreachStage = (typeof OUTREACH_STAGES)[number]

export type SubmitOutcome = "submitted" | "uncertain" | "failed" | "skipped"

export interface SubmitFormInput {
  formUrl: string
  fields: Record<string, string>
  message: string
  dryRun: boolean
  timeoutMs?: number
  cachedParsed?: CachedFormStructure | null
}

export interface CachedFormStructure {
  action: string
  method: string
  enctype: string
  inputNames: string[]
  cmsType: string
  cachedAt: string
}

export interface SubmitFormResult {
  ok: boolean
  outcome: SubmitOutcome
  detail: string
  evidenceUrl?: string | null
}

export interface OutreachTarget {
  companyId: string
  region: Region
  domain: string
  companyName: string
  knownFormUrl?: string | null
}

export interface OutreachItemResult {
  companyId: string
  domain: string
  finalStage: OutreachStage
  classification?: FormClassification
  formUrl?: string | null
  message?: string | null
  outcome?: SubmitOutcome
  reason: string
  dryRun: boolean
}

export interface OutreachBatchResult {
  processed: number
  submitted: number
  manualQueue: number
  skipped: number
  failed: number
  dryRun: boolean
  selection?: {
    requestedCompanyIds: string[]
    acceptedCompanyIds: string[]
    missingCompanyIds: string[]
    notReadyCompanyIds: string[]
  }
  items: OutreachItemResult[]
}
