import type { ManualMessageAngleSelection } from "./manual-japan-entry-angle"
import type { ManualMessageVariantSelection } from "./manual-japan-entry-experiment"

export const MANUAL_WORK_BATCH_MAX_URLS = 500
export const MANUAL_WORK_BATCH_DRAIN_SIZE = 3
export const MANUAL_WORK_BATCH_QUEUE_MAX_BATCHES = 20

export type ManualWorkBatchStatus =
  | "queued"
  | "running"
  | "completed"
  | "completed_with_errors"
  | "failed"

export type ManualWorkBatchItemStatus =
  | "queued"
  | "processing"
  | "completed"
  | "needs_review"
  | "rejected"
  | "failed"
  | "duplicate"

export interface ManualWorkBatchRow {
  id: string
  status: ManualWorkBatchStatus
  total_count: number
  queued_count: number
  processing_count: number
  completed_count: number
  needs_review_count: number
  rejected_count: number
  failed_count: number
  duplicate_count: number
  message_variant_requested: ManualMessageVariantSelection
  message_angle_requested: ManualMessageAngleSelection
  source_slug: string
  source_page_url: string | null
  observed_on: string | null
  last_error: string | null
  sent: false
  started_at: string | null
  completed_at: string | null
  notified_at: string | null
  drain_claim_token: string | null
  drain_claimed_at: string | null
  created_at: string
  updated_at: string
}

export interface ManualWorkBatchQueueSummary {
  batchCount: number
  companyCount: number
  runningBatchId: string | null
  queuedBatchCount: number
  queuedCompanyCount: number
}

export interface ManualWorkBatchItemRow {
  id: string
  batch_id: string
  position: number
  input_url: string
  canonical_url: string
  domain: string
  status: ManualWorkBatchItemStatus
  work_id: string | null
  retry_requested: boolean
  expected_work_id: string | null
  attempts: number
  claim_token: string | null
  claimed_at: string | null
  finished_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface ManualWorkBatchSnapshot {
  batch: ManualWorkBatchRow
  items: ManualWorkBatchItemRow[]
  counts: Record<ManualWorkBatchItemStatus, number>
  finished: number
  remaining: number
}

export function isManualWorkBatchTerminal(status: ManualWorkBatchStatus): boolean {
  return status === "completed" || status === "completed_with_errors" || status === "failed"
}
