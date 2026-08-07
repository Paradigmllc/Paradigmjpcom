/**
 * lib/youtube/review/types.ts — 審査層の型と状態遷移
 *
 * なぜ審査が要るか: 公開前ゲートは構造とポリシー適合しか測れない。
 * 実測でも、ゲートを通過した台本が見出しに無い税率を創作していた。
 * 事実の正確さは人間が見るしかないので、承認されるまで公開経路に進ませない。
 */

import type { PolicyGateResult } from "../quality/policy-gate"
import type { VideoScript } from "../formats/types"

export type ReviewStatus =
  | "draft"
  | "rendering"
  | "review_required"
  | "approved"
  | "rejected"
  | "published"
  | "failed"

export type ReviewAction = "submitted" | "approved" | "rejected" | "published" | "reverted"

export interface ReviewVideo {
  id: string
  channelId: string | null
  formatId: string
  status: ReviewStatus
  title: string
  description: string
  tags: string[]
  thumbnailText: string[]
  script: VideoScript
  gate: PolicyGateResult | null
  research: Record<string, unknown>
  videoUrl: string | null
  durationSec: number | null
  llmCalls: number | null
  warnings: string[]
  reviewerNote: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  publishedAt: string | null
  youtubeVideoId: string | null
  createdAt: string
}

export interface ReviewEvent {
  id: string
  videoId: string
  action: ReviewAction
  note: string | null
  actor: string
  createdAt: string
}

/**
 * 許可する状態遷移。
 * 承認済みから直接公開へ進む経路だけを残し、審査を飛ばせないようにする。
 */
const ALLOWED_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  draft: ["rendering", "failed"],
  rendering: ["review_required", "failed"],
  review_required: ["approved", "rejected", "failed"],
  // 承認後に問題が見つかることがあるので、公開前なら審査に戻せる。
  approved: ["published", "review_required", "failed"],
  rejected: ["review_required"],
  // 公開済みからは戻さない。取り下げは YouTube 側の操作になる。
  published: [],
  failed: ["draft"],
}

export function canTransition(from: ReviewStatus, to: ReviewStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

export function allowedNextStatuses(from: ReviewStatus): ReviewStatus[] {
  return [...(ALLOWED_TRANSITIONS[from] ?? [])]
}

/** 審査画面の操作を状態に対応づける。 */
export function statusForDecision(decision: "approve" | "reject"): ReviewStatus {
  return decision === "approve" ? "approved" : "rejected"
}

export function actionForDecision(decision: "approve" | "reject"): ReviewAction {
  return decision === "approve" ? "approved" : "rejected"
}

/**
 * 審査者が最初に見るべき注意点を並べる。
 *
 * ゲートが通っていても安全とは限らない。実測で起きた失敗
 * (見出しに無い数値の創作、URLの捏造、同内容の言い換え)を
 * 具体的に指さないと、承認が形骸化する。
 */
export function buildReviewChecklist(video: ReviewVideo): string[] {
  const items: string[] = []
  const scenes = video.script?.scenes ?? []

  const unsourced = scenes.filter((scene) => scene.sources.length === 0)
  if (unsourced.length > 0) {
    items.push(`根拠が付いていないシーンが${unsourced.length}件あります (${unsourced.map((s) => s.id).join(", ")})。断定を含んでいないか確認してください。`)
  }

  const numeric = scenes.filter((scene) => /\d/.test(scene.narration))
  if (numeric.length > 0) {
    items.push(`数値を含むシーンが${numeric.length}件あります。その数値が出典に実在するか確認してください。モデルが知識から補うことがあります。`)
  }

  if (video.warnings.length > 0) {
    items.push(`生成時の警告が${video.warnings.length}件あります。捏造URLの破棄が含まれていないか確認してください。`)
  }

  const warnFindings = (video.gate?.findings ?? []).filter((finding) => finding.severity === "warn")
  if (warnFindings.length > 0) {
    items.push(`ゲートの警告が${warnFindings.length}件あります: ${warnFindings.map((f) => f.code).join(", ")}`)
  }

  if (video.videoUrl === null) {
    items.push("動画がまだ書き出されていません。映像を見ずに承認しないでください。")
  }

  return items
}
