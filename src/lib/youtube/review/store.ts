/**
 * lib/youtube/review/store.ts — 審査対象の保存と取得
 *
 * 台本とゲート結果を丸ごと保存する。審査時に何を見て判断したのかを
 * 後から再現できないと、問題が起きたときに検証できない。
 */

import { getServiceSupabase } from "@/lib/supabase"
import type { VideoScript } from "../formats/types"
import type { PolicyGateResult } from "../quality/policy-gate"
import {
  canTransition,
  type ReviewAction,
  type ReviewEvent,
  type ReviewStatus,
  type ReviewVideo,
} from "./types"

const VIDEO_COLUMNS =
  "id,channel_id,format_id,status,title,description,tags,thumbnail_text,script,gate,research,video_url,duration_sec,llm_calls,warnings,reviewer_note,reviewed_by,reviewed_at,published_at,youtube_video_id,created_at"

interface VideoRow {
  id: string
  channel_id: string | null
  format_id: string
  status: ReviewStatus
  title: string
  description: string | null
  tags: string[] | null
  thumbnail_text: string[] | null
  script: VideoScript
  gate: PolicyGateResult | null
  research: Record<string, unknown> | null
  video_url: string | null
  duration_sec: number | string | null
  llm_calls: number | null
  warnings: string[] | null
  reviewer_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  published_at: string | null
  youtube_video_id: string | null
  created_at: string
}

function toVideo(row: VideoRow): ReviewVideo {
  return {
    id: row.id,
    channelId: row.channel_id,
    formatId: row.format_id,
    status: row.status,
    title: row.title,
    description: row.description ?? "",
    tags: row.tags ?? [],
    thumbnailText: row.thumbnail_text ?? [],
    script: row.script,
    gate: row.gate,
    research: row.research ?? {},
    videoUrl: row.video_url,
    durationSec: row.duration_sec === null ? null : Number(row.duration_sec),
    llmCalls: row.llm_calls,
    warnings: row.warnings ?? [],
    reviewerNote: row.reviewer_note,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    publishedAt: row.published_at,
    youtubeVideoId: row.youtube_video_id,
    createdAt: row.created_at,
  }
}

export interface StoreResult<T> {
  ok: boolean
  data?: T
  error?: string
}

function noClient<T>(): StoreResult<T> {
  return { ok: false, error: "Supabase に接続できません。SUPABASE のサービスキーを確認してください。" }
}

/** 審査待ちを新しい順に取得する。status 未指定なら未承認のものだけ。 */
export async function listReviewVideos(options: {
  statuses?: ReviewStatus[]
  limit?: number
} = {}): Promise<StoreResult<ReviewVideo[]>> {
  const supabase = getServiceSupabase()
  if (!supabase) return noClient()

  const statuses = options.statuses ?? ["review_required", "approved", "rejected"]
  const { data, error } = await supabase
    .from("yt_videos")
    .select(VIDEO_COLUMNS)
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 50)

  if (error) {
    console.error("[youtube/review] list failed", error)
    return { ok: false, error: "審査対象を取得できませんでした。" }
  }
  return { ok: true, data: (data as unknown as VideoRow[]).map(toVideo) }
}

export async function getReviewVideo(id: string): Promise<StoreResult<ReviewVideo>> {
  const supabase = getServiceSupabase()
  if (!supabase) return noClient()

  const { data, error } = await supabase.from("yt_videos").select(VIDEO_COLUMNS).eq("id", id).single()
  if (error || !data) {
    console.error("[youtube/review] get failed", error)
    return { ok: false, error: "対象の動画が見つかりません。" }
  }
  return { ok: true, data: toVideo(data as unknown as VideoRow) }
}

export interface SubmitForReviewInput {
  channelId?: string | null
  formatId: string
  script: VideoScript
  gate: PolicyGateResult
  research?: Record<string, unknown>
  videoUrl?: string | null
  durationSec?: number | null
  llmCalls?: number | null
  warnings?: string[]
}

/** レンダリング済みの動画を審査待ちとして登録する。 */
export async function submitForReview(input: SubmitForReviewInput): Promise<StoreResult<ReviewVideo>> {
  const supabase = getServiceSupabase()
  if (!supabase) return noClient()

  const { data, error } = await supabase
    .from("yt_videos")
    .insert({
      channel_id: input.channelId ?? null,
      format_id: input.formatId,
      status: "review_required",
      title: input.script.title,
      description: input.script.description,
      tags: input.script.tags,
      thumbnail_text: input.script.thumbnailText,
      script: input.script,
      gate: input.gate,
      research: input.research ?? {},
      video_url: input.videoUrl ?? null,
      duration_sec: input.durationSec ?? null,
      llm_calls: input.llmCalls ?? null,
      warnings: input.warnings ?? [],
    })
    .select(VIDEO_COLUMNS)
    .single()

  if (error || !data) {
    console.error("[youtube/review] submit failed", error)
    return { ok: false, error: "審査待ちに登録できませんでした。" }
  }

  const video = toVideo(data as unknown as VideoRow)
  await recordEvent(video.id, "submitted", null, "pipeline")
  return { ok: true, data: video }
}

async function recordEvent(
  videoId: string,
  action: ReviewAction,
  note: string | null,
  actor: string,
): Promise<void> {
  const supabase = getServiceSupabase()
  if (!supabase) return
  const { error } = await supabase
    .from("yt_review_events")
    .insert({ video_id: videoId, action, note, actor })
  // 履歴が残らなくても本処理は止めない。ただし黙らせない。
  if (error) console.error("[youtube/review] event insert failed", error)
}

export interface DecideInput {
  videoId: string
  decision: "approve" | "reject"
  note?: string | null
  actor: string
}

/**
 * 承認または却下する。
 * 状態遷移を検査してから書き込む。審査を飛ばした公開を防ぐのが目的。
 */
export async function decideReviewVideo(input: DecideInput): Promise<StoreResult<ReviewVideo>> {
  const supabase = getServiceSupabase()
  if (!supabase) return noClient()

  const current = await getReviewVideo(input.videoId)
  if (!current.ok || !current.data) return current

  const nextStatus: ReviewStatus = input.decision === "approve" ? "approved" : "rejected"
  if (!canTransition(current.data.status, nextStatus)) {
    return {
      ok: false,
      error: `${current.data.status} から ${nextStatus} へは変更できません。`,
    }
  }

  const { data, error } = await supabase
    .from("yt_videos")
    .update({
      status: nextStatus,
      reviewer_note: input.note ?? null,
      reviewed_by: input.actor,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.videoId)
    // 取得後に他の審査者が動かしていたら書き込まない。
    .eq("status", current.data.status)
    .select(VIDEO_COLUMNS)
    .single()

  if (error || !data) {
    console.error("[youtube/review] decide failed", error)
    return { ok: false, error: "状態を更新できませんでした。他の審査者が同時に操作した可能性があります。" }
  }

  await recordEvent(input.videoId, input.decision === "approve" ? "approved" : "rejected", input.note ?? null, input.actor)
  return { ok: true, data: toVideo(data as unknown as VideoRow) }
}

export async function listReviewEvents(videoId: string): Promise<StoreResult<ReviewEvent[]>> {
  const supabase = getServiceSupabase()
  if (!supabase) return noClient()

  const { data, error } = await supabase
    .from("yt_review_events")
    .select("id,video_id,action,note,actor,created_at")
    .eq("video_id", videoId)
    .order("created_at", { ascending: false })

  if (error) return { ok: false, error: "審査履歴を取得できませんでした。" }
  return {
    ok: true,
    data: (data ?? []).map((row) => ({
      id: row.id as string,
      videoId: row.video_id as string,
      action: row.action as ReviewAction,
      note: (row.note as string | null) ?? null,
      actor: row.actor as string,
      createdAt: row.created_at as string,
    })),
  }
}
