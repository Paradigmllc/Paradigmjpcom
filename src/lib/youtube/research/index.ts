/**
 * lib/youtube/research/index.ts — リサーチ層の入口
 *
 * 無料ソース(Reddit / YouTube Data API)を並行して叩き、
 * シグナルを1つに束ねて企画候補に順位付けする。
 *
 * vidiq はここに含めない。月150クレジット(outlier 1回5クレジット)しかなく、
 * 日次で回すと3日で枯れる。月次のキャリブレーションとタイトル/サムネ採点に用途を限定する。
 */

import { queriesForSource, type ChannelFormat } from "../formats/types"
import type { ScriptIdea } from "../script/types"
import { createQuotaGuard, type QuotaGuard } from "./quota"
import { fetchRedditSignals } from "./reddit"
import { fetchHackerNewsSignals } from "./hackernews"
import { fetchRssSignals } from "./rss"
import { fetchYoutubeSignals } from "./youtube"
import { rankIdeaCandidates } from "./rank"
import type { IdeaCandidate, ResearchFetchResult, ResearchQuery, ResearchSignal } from "./types"

export * from "./types"
export { createQuotaGuard, createInMemoryQuotaStore, QuotaExceededError, YOUTUBE_API_UNIT_COST } from "./quota"
export { fetchRedditSignals } from "./reddit"
export { fetchHackerNewsSignals } from "./hackernews"
export { fetchRssSignals, parseRssItems, googleNewsParams } from "./rss"
export { fetchYoutubeSignals } from "./youtube"
export { rankIdeaCandidates, groupSignalsByTopic, deriveAngle } from "./rank"

export interface ResearchRunInput {
  format: ChannelFormat
  /** 同一チャンネルの直近タイトル。被る企画を減点する。 */
  recentTitles?: string[]
  withinHours?: number
  limitPerSource?: number
  /** 返す企画候補の上限。 */
  limit?: number
  quota?: QuotaGuard
  now?: () => number
}

export interface ResearchRunResult {
  candidates: IdeaCandidate[]
  /** ソースごとの取得結果。設定不足や枠切れをそのまま運用者に見せる。 */
  fetches: ResearchFetchResult[]
  quotaSpent: number
}

/**
 * 形式定義の research 設定に従ってシグナルを集め、企画候補を返す。
 *
 * 1ソースが失敗しても全体は止めない。Reddit だけで回すことも、
 * YouTube だけで回すこともできる状態を保つ。
 */
export async function runResearch(input: ResearchRunInput): Promise<ResearchRunResult> {
  const { format } = input
  const quota = input.quota ?? createQuotaGuard({ now: input.now })
  const now = input.now ?? (() => Date.now())

  const baseQuery = {
    locale: format.locale,
    withinHours: input.withinHours ?? 72,
    limit: input.limitPerSource ?? 20,
  }
  // 検索語はソースごとに変える。同じ語を全ソースに投げると当たらないソースが出る。
  const queryFor = (source: Parameters<typeof queriesForSource>[1]): ResearchQuery => ({
    ...baseQuery,
    terms: queriesForSource(format.research, source),
  })

  const sources = new Set(format.research.sources)
  const tasks: Array<Promise<ResearchFetchResult>> = []

  if (sources.has("hackernews")) {
    tasks.push(fetchHackerNewsSignals(queryFor("hackernews"), { now }))
  }
  if (sources.has("rss")) {
    tasks.push(fetchRssSignals(queryFor("rss"), { now }))
  }
  if (sources.has("reddit")) {
    tasks.push(fetchRedditSignals(queryFor("reddit"), { now }))
  }
  if (sources.has("youtube_data_api")) {
    tasks.push(fetchYoutubeSignals(queryFor("youtube_data_api"), { quota, now }))
  }

  const fetches = await Promise.all(tasks)
  const signals: ResearchSignal[] = fetches.flatMap((result) => result.signals)

  const candidates = rankIdeaCandidates(signals, {
    recentTitles: input.recentTitles,
    now,
    limit: input.limit,
  })

  return {
    candidates,
    fetches,
    quotaSpent: fetches.reduce((sum, result) => sum + result.quotaSpent, 0),
  }
}

/** 企画候補を台本層の入力に変換する。 */
export function toScriptIdea(candidate: IdeaCandidate): ScriptIdea {
  return {
    topic: candidate.topic,
    angle: candidate.angle,
    keywords: candidate.keywords,
    sources: candidate.sources,
    contextHeadlines: candidate.contextHeadlines,
    notes: candidate.reasons.join(" / "),
  }
}
