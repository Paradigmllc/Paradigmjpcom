/**
 * lib/youtube/research/rank.ts — シグナルを企画候補に束ねて順位付けする
 *
 * 方針:
 *   - 点数の根拠を必ず reasons に残す。説明できないスコアは運用で使われない。
 *   - 複数ソースで同じ話題が立っていることを最重視する。
 *     単一ソースの盛り上がりはノイズのことが多い。
 *   - 直近作と題材が被る候補は減点する。反復性ゲートで後段が却下する前に、
 *     企画の時点で外しておくほうが安い。
 *
 * 話題のまとまり判定には quality/repetition.ts と同じ文字3-gramを使う。
 * 台本の反復判定と同じ尺度を使うことで、企画段階と公開前検査で
 * 「似ている」の基準がずれないようにする。
 */

import type { SourceRef } from "../formats/types"
import { characterShingles, jaccard } from "../quality/repetition"
import type { IdeaCandidate, ResearchSignal, ScriptIdeaAngleSource } from "./types"

/** 同一話題とみなすタイトル類似度の下限。 */
const TOPIC_GROUPING_THRESHOLD = 0.32

/** 直近作と被っているとみなす類似度の下限。 */
const RECENT_OVERLAP_THRESHOLD = 0.3

export interface RankOptions {
  /** 同一チャンネルの直近タイトル。被る候補を減点する。 */
  recentTitles?: string[]
  now?: () => number
  /** 返す候補数の上限。 */
  limit?: number
}

/** タイトル類似度でシグナルを話題ごとにまとめる。 */
export function groupSignalsByTopic(signals: ResearchSignal[]): ResearchSignal[][] {
  const groups: Array<{ shingles: Set<string>; members: ResearchSignal[] }> = []

  // 勢いの強い順に見て、既存グループに寄せるか新規に立てるかを決める。
  const ordered = [...signals].sort(
    (a, b) => (b.metrics.velocityPerHour ?? 0) - (a.metrics.velocityPerHour ?? 0),
  )

  for (const signal of ordered) {
    const shingles = characterShingles(signal.title)
    const match = groups.find((group) => jaccard(group.shingles, shingles) >= TOPIC_GROUPING_THRESHOLD)
    if (match) {
      match.members.push(signal)
      for (const s of shingles) match.shingles.add(s)
    } else {
      groups.push({ shingles, members: [signal] })
    }
  }

  return groups.map((group) => group.members)
}

/** YouTube より先に話題が立つ側のソース。 */
const LEADING_SOURCES = new Set(["hackernews", "reddit", "rss"])

/** 根拠の並びから、データに基づく切り口を導く。創作はしない。 */
export function deriveAngle(sourceIds: Set<string>): { angle: string; kind: ScriptIdeaAngleSource } {
  const hasReddit = [...sourceIds].some((id) => LEADING_SOURCES.has(id))
  const hasYoutube = sourceIds.has("youtube_data_api")

  if (hasReddit && hasYoutube) {
    return {
      angle: "既にYouTube側でも需要が立っている題材を、議論の論点まで踏み込んで扱う",
      kind: "corroborated",
    }
  }
  if (hasReddit) {
    return {
      angle: "YouTubeにまだ動画が少ない先行トピックを、最初に扱う",
      kind: "leading",
    }
  }
  return {
    angle: "既存動画が多い題材を、扱われていない切り口で扱う",
    kind: "saturated",
  }
}

function normalize(value: number, max: number): number {
  if (max <= 0) return 0
  return Math.min(1, value / max)
}

/**
 * 候補を0-100で採点する。
 * 配点: 勢い30 / 複数ソース20 / 報道の広がり15 / 反応の濃さ15 / 新しさ20。被りは最大30減点。
 *
 * 「報道の広がり」を独立配点にしているのは、RSS には点数もコメント数も無く
 * 勢いで測れないため。同じ話題を何件が扱っているかが唯一の量的シグナルになる。
 */
export function rankIdeaCandidates(
  signals: ResearchSignal[],
  options: RankOptions = {},
): IdeaCandidate[] {
  const now = (options.now ?? (() => Date.now()))()
  const recentTitles = options.recentTitles ?? []
  const recentShingles = recentTitles.map((title) => characterShingles(title))

  const groups = groupSignalsByTopic(signals)
  if (groups.length === 0) return []

  const groupVelocity = (group: ResearchSignal[]): number =>
    group.reduce((sum, signal) => sum + (signal.metrics.velocityPerHour ?? 0), 0)

  const maxVelocity = Math.max(...groups.map(groupVelocity))
  const maxGroupSize = Math.max(...groups.map((group) => group.length))

  const candidates = groups.map((group) => {
    const reasons: string[] = []
    const lead = group.reduce((best, signal) =>
      (signal.metrics.velocityPerHour ?? 0) > (best.metrics.velocityPerHour ?? 0) ? signal : best,
    )
    const sourceIds = new Set(group.map((signal) => signal.sourceId))

    // 勢い
    const velocity = groupVelocity(group)
    const velocityPoints = Math.round(normalize(velocity, maxVelocity) * 30)
    reasons.push(`勢い ${Math.round(velocity)}/時 → ${velocityPoints}点`)

    // 複数ソースでの裏取り
    const corroborationPoints = sourceIds.size >= 2 ? 20 : 0
    reasons.push(
      sourceIds.size >= 2
        ? `${[...sourceIds].join(" と ")} の複数ソースで観測 → 20点`
        : `${[...sourceIds][0]} のみ → 0点`,
    )

    // 報道の広がり。点数の無い RSS ではこれが唯一の量的シグナルになる。
    const coveragePoints = Math.round(normalize(group.length, maxGroupSize) * 15)
    reasons.push(`関連記事 ${group.length}件 → ${coveragePoints}点`)

    // 反応の濃さ (コメント / スコア)
    const totalScore = group.reduce((sum, s) => sum + s.metrics.score, 0)
    const totalComments = group.reduce((sum, s) => sum + s.metrics.comments, 0)
    const engagement = totalScore > 0 ? totalComments / totalScore : 0
    // 絶対量が小さいと比率が暴れる(2点2コメントで100%になってしまう)。
    // 母数が小さいうちは満点を出さないよう信頼度で減衰させる。
    const volumeConfidence = Math.min(1, totalScore / 50)
    const engagementPoints = Math.round(Math.min(1, engagement * 20) * volumeConfidence * 15)
    reasons.push(
      `議論の濃さ ${(engagement * 100).toFixed(1)}% (母数${totalScore}, 信頼度${volumeConfidence.toFixed(2)}) → ${engagementPoints}点`,
    )

    // 新しさ
    const ages = group
      .map((s) => (s.publishedAt ? (now - Date.parse(s.publishedAt)) / 3_600_000 : null))
      .filter((h): h is number => h !== null && !Number.isNaN(h))
    const youngestHours = ages.length > 0 ? Math.min(...ages) : null
    const freshnessPoints =
      youngestHours === null ? 0 : Math.round(Math.max(0, 1 - youngestHours / 72) * 20)
    reasons.push(
      youngestHours === null
        ? "公開日時が不明 → 0点"
        : `最新 ${Math.round(youngestHours)}時間前 → ${freshnessPoints}点`,
    )

    // 直近作との被り
    const leadShingles = characterShingles(lead.title)
    const overlap = recentShingles.reduce((max, prev) => Math.max(max, jaccard(prev, leadShingles)), 0)
    const overlapPenalty = overlap >= RECENT_OVERLAP_THRESHOLD ? Math.round(overlap * 30) : 0
    if (overlapPenalty > 0) {
      reasons.push(`直近作と題材が重複 (類似度 ${overlap.toFixed(2)}) → -${overlapPenalty}点`)
    }

    const score = Math.max(
      0,
      velocityPoints +
        corroborationPoints +
        coveragePoints +
        engagementPoints +
        freshnessPoints -
        overlapPenalty,
    )

    const retrievedAt = new Date(now).toISOString()
    const sources: SourceRef[] = []
    const seenSourceUrls = new Set<string>()
    const addSource = (claim: string, url: string | null) => {
      if (!url || seenSourceUrls.has(url)) return
      seenSourceUrls.add(url)
      sources.push({ claim, url, retrievedAt })
    }

    for (const signal of group) addSource(signal.title, signal.url)
    // 関連見出しも引用先として登録する。これが無いと、ある媒体の記述に
    // 別媒体のURLを付ける誤帰属が起きる。主張ごとに正しい出典を選ばせる。
    for (const signal of group) {
      for (const headline of signal.relatedHeadlines ?? []) addSource(headline.title, headline.url)
    }

    const keywords = [...new Set(group.flatMap((signal) => signal.keywords))].filter(Boolean).slice(0, 12)

    // 関連見出しを重複を除いて集約する。台本層が事実を読み取る材料になる。
    const seenHeadlines = new Set<string>()
    const contextHeadlines: IdeaCandidate["contextHeadlines"] = []
    for (const signal of group) {
      for (const headline of signal.relatedHeadlines ?? []) {
        if (seenHeadlines.has(headline.title)) continue
        seenHeadlines.add(headline.title)
        contextHeadlines.push(headline)
      }
    }

    return {
      topic: lead.title,
      angle: deriveAngle(sourceIds).angle,
      keywords,
      sources,
      score,
      reasons,
      contextHeadlines,
      signals: group,
    } satisfies IdeaCandidate
  })

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? candidates.length)
}
