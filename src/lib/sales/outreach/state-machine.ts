/**
 * lib/sales/outreach/state-machine.ts — outreach ステージ遷移 (Phase 3)
 *
 * 役割: ④フォーム営業の内部ステージ遷移を純関数で検証する。
 *       Appexxme の 7-Stage 状態機械を self-contained 移植 (RPC 非依存)。
 *
 * 永続化は sales_companies.pipeline_status + sales_activity_log に行う
 * (このファイルは「遷移の正当性」だけを判定する純粋ロジック・テスト容易)。
 */

import type { OutreachStage } from "./types"
import type { PipelineStatus } from "../types"

const ALLOWED: Record<OutreachStage, readonly OutreachStage[]> = {
  queued: ["discovering"],
  discovering: ["discovered", "discovery_failed"],
  discovered: ["classified_safe", "classified_risky", "classified_skip"],
  discovery_failed: [],
  classified_safe: ["preflight_passed", "preflight_failed"],
  classified_risky: ["manual_queue", "classified_skip"], // captcha 等 → 人間 escalate
  classified_skip: [],
  preflight_passed: ["submitting"],
  preflight_failed: [],
  submitting: ["submitted", "submit_uncertain", "submit_failed"],
  submitted: [],
  submit_uncertain: ["submitted", "submit_failed", "manual_queue"],
  submit_failed: [],
  manual_queue: [],
}

export const TERMINAL_STAGES: ReadonlySet<OutreachStage> = new Set<OutreachStage>([
  "discovery_failed",
  "classified_skip",
  "preflight_failed",
  "submitted",
  "submit_failed",
  "manual_queue",
])

/** from → to が許可された遷移か (純関数) */
export function isAllowedTransition(from: OutreachStage, to: OutreachStage): boolean {
  return ALLOWED[from]?.includes(to) ?? false
}

export function isTerminalStage(stage: OutreachStage): boolean {
  return TERMINAL_STAGES.has(stage)
}

/**
 * 終端ステージ → sales_companies.pipeline_status へのマッピング。
 * 'sent' = 送信成功 / 'manual_queue' = 人間対応待ち / 'report_ready' = 再試行可。
 */
export function stageToPipelineStatus(stage: OutreachStage): PipelineStatus {
  switch (stage) {
    case "submitted":
      return "sent"
    case "manual_queue":
    case "classified_risky":
      return "manual_queue"
    case "submit_uncertain":
      return "manual_queue"
    case "submit_failed":
    case "discovery_failed":
    case "preflight_failed":
    case "classified_skip":
      return "report_ready" // 再試行可能なまま戻す
    default:
      return "scanning"
  }
}
