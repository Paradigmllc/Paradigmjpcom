/**
 * lib/sales/outreach/types.ts — ④フォーム営業の型定義 (Phase 3)
 *
 * 役割: outreach パイプライン (discovery→classify→preflight→submit) の
 *       共通型を一元定義。worker 側 (BrowserProvider 実装) も import する。
 *
 * 所有境界: 全て paradigm-HP 自己完結 (sales_companies 背骨)。
 *           Appexxme の outreach_campaign_items / RPC には依存しない。
 */

import type { Region } from "../types"

/* ───── form 分類 (Appexxme form-classifier を self-contained 移植) ───── */

export const FORM_CLASSIFICATIONS = [
  "safe_cf7", // Contact Form 7
  "safe_wpforms", // WPForms / Gravity
  "safe_generic", // 標準フォーム (HubSpot/Typeform 等)
  "risky_captcha", // reCAPTCHA/hCaptcha/Turnstile → 人間 escalate
  "risky_login", // ログイン要求 → skip
  "risky_iframe", // iframe 内 form → skip
  "skip_payment", // 決済フォーム → skip
  "skip_unknown", // 構造不明 → skip
] as const
export type FormClassification = (typeof FORM_CLASSIFICATIONS)[number]

export const isSafeForm = (c: FormClassification): boolean => c.startsWith("safe_")

/* ───── outreach の内部ステージ (state-machine.ts と一致) ───── */

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
  "manual_queue", // 人間 escalate (captcha 等)
] as const
export type OutreachStage = (typeof OUTREACH_STAGES)[number]

/* ───── BrowserProvider が返す submit 結果 ───── */

export type SubmitOutcome = "submitted" | "uncertain" | "failed" | "skipped"

export interface SubmitFormInput {
  formUrl: string
  /** name/email/message 等のフィールド値 (classifier の detectedFields に対応) */
  fields: Record<string, string>
  /** 本文 (message フィールドに入る営業文面・report_url 置換済) */
  message: string
  /** true = 実送信せず検証だけ (preflight / 監査用) */
  dryRun: boolean
  timeoutMs?: number
}

export interface SubmitFormResult {
  ok: boolean
  outcome: SubmitOutcome
  detail: string
  /** スクショ等の保存先 (worker が R2 等に保存した場合) */
  evidenceUrl?: string | null
}

/* ───── 1 件分の outreach 実行入力/結果 ───── */

export interface OutreachTarget {
  companyId: string
  region: Region
  domain: string
  companyName: string
  /** 既知のフォーム URL (meta.contact_form_url)。無ければ discovery する */
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
  items: OutreachItemResult[]
}
