/**
 * lib/youtube/research/types.ts — リサーチ層の共通契約
 *
 * 設計方針:
 *   - ソース(YouTube / Reddit / RSS / vidiq)は同じ ResearchSignal を返す。
 *     ソースを1つ足すのはファイル1枚で済ませる。形式レジストリと同じ思想。
 *   - 生の指標をそのまま持ち、スコアリングは rank.ts に集約する。
 *     ソース側が独自に点を付けると比較不能になる。
 *   - 有料/枠制限のあるソース(vidiq)と無料ソースを型で区別しない。
 *     枠管理は quota.ts の責務にする。
 */

import type { ResearchSourceId, SourceRef } from "../formats/types"

export type { ResearchSourceId }

/** 各ソースから取れた1件の観測。 */
export interface ResearchSignal {
  sourceId: ResearchSourceId
  /** ソース内での一意ID。重複排除に使う。 */
  externalId: string
  title: string
  url: string
  /** ISO8601。取得できない場合は取得時刻を入れず null にする。 */
  publishedAt: string | null
  metrics: {
    /** 再生数、upvote 数など、ソースにおける主要な量。 */
    score: number
    comments: number
    /** 公開からの経過時間で割った勢い。publishedAt が無ければ null。 */
    velocityPerHour: number | null
  }
  keywords: string[]
  /**
   * 同一事象を扱う他媒体の見出し。
   * 記事本文が取れないソース(Google News RSS)では、これが台本層に渡せる
   * 唯一の実質的な材料になる。複数媒体が共通して書いている内容は
   * 事実としての確度が相対的に高いという判断に使う。
   */
  relatedHeadlines?: Array<{ title: string; source: string | null; url: string | null }>
}

export interface ResearchQuery {
  /** 検索語。ソースごとに解釈は異なる。 */
  terms: string[]
  locale: string
  /** 何時間前までを対象にするか。 */
  withinHours: number
  /** ソースあたりの最大取得件数。 */
  limit: number
}

export interface ResearchFetchResult {
  ok: boolean
  sourceId: ResearchSourceId
  signals: ResearchSignal[]
  /** このソースが消費した割当量。無料ソースは0。 */
  quotaSpent: number
  error?: string
  /** 取得できなかった理由のうち、設定不足によるもの。運用者に見せる。 */
  notConfigured?: boolean
}

/** 経過時間あたりの勢いを求める。未来日付や0除算を避ける。 */
export function computeVelocityPerHour(
  score: number,
  publishedAt: string | null,
  now: number,
): number | null {
  if (!publishedAt) return null
  const published = Date.parse(publishedAt)
  if (Number.isNaN(published)) return null
  const hours = (now - published) / 3_600_000
  // 公開直後は分母が小さすぎて勢いが発散するため、最低1時間として扱う。
  return score / Math.max(1, hours)
}

/* ───── 企画候補 ───── */

/**
 * 根拠の並びから導かれる切り口の種類。
 * corroborated: 複数ソースで裏が取れている / leading: 先行トピック / saturated: 既に飽和
 */
export type ScriptIdeaAngleSource = "corroborated" | "leading" | "saturated"

export interface IdeaCandidate {
  topic: string
  angle: string
  keywords: string[]
  sources: SourceRef[]
  /** 0-100。rank.ts が算出する。 */
  score: number
  /** なぜこの点数になったかの説明。運用者が納得できないスコアは使えない。 */
  reasons: string[]
  /**
   * 同一事象に対する複数媒体の見出し。台本層に渡す事実材料。
   * 本文が取れない以上、複数の独立した言い回しから共通項を読むしかない。
   */
  contextHeadlines: Array<{ title: string; source: string | null; url: string | null }>
  signals: ResearchSignal[]
}
