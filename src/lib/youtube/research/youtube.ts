/**
 * lib/youtube/research/youtube.ts — YouTube Data API v3 での需要観測
 *
 * コスト構造が重要:
 *   search.list  = 100 ユニット
 *   videos.list  =   1 ユニット (最大50件まとめて取れる)
 * 検索1語につき 101 ユニット。既定枠 10,000 の1割を予備に残すと
 * 実質 1日89語しか検索できない。複数チャンネルを回すなら
 * 検索語は絞り、統計取得はまとめて1回にする。
 *
 * search.list は統計値を返さないため、ID を集めてから videos.list で
 * 再生数を取る2段構えが必須になる。
 */

import { optionalEnv } from "@/lib/sales/japan-readiness-utils"
import type { ResearchFetchResult, ResearchQuery, ResearchSignal } from "./types"
import { computeVelocityPerHour } from "./types"
import { QuotaExceededError, type QuotaGuard } from "./quota"

const API_BASE = "https://www.googleapis.com/youtube/v3"

/** videos.list が一度に受け取れる ID の上限。 */
const VIDEOS_BATCH_SIZE = 50

interface SearchResponse {
  items?: Array<{ id?: { videoId?: string } }>
  error?: { message?: string }
}

interface VideosResponse {
  items?: Array<{
    id?: string
    snippet?: { title?: string; publishedAt?: string; tags?: string[]; channelTitle?: string }
    statistics?: { viewCount?: string; commentCount?: string }
  }>
  error?: { message?: string }
}

export interface YoutubeFetchOptions {
  quota: QuotaGuard
  apiKey?: string | null
  fetchImpl?: typeof fetch
  now?: () => number
  timeoutMs?: number
  /** 検索の並び順。ニュース用途では date、企画発掘では viewCount が向く。 */
  order?: "relevance" | "viewCount" | "date"
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export async function fetchYoutubeSignals(
  query: ResearchQuery,
  options: YoutubeFetchOptions,
): Promise<ResearchFetchResult> {
  const apiKey = options.apiKey ?? optionalEnv("YOUTUBE_API_KEY")
  if (!apiKey) {
    return {
      ok: false,
      sourceId: "youtube_data_api",
      signals: [],
      quotaSpent: 0,
      notConfigured: true,
      error: "YOUTUBE_API_KEY が未設定です。",
    }
  }

  const fetchImpl = options.fetchImpl ?? fetch
  const now = options.now ?? (() => Date.now())
  const timeoutMs = options.timeoutMs ?? 20_000
  const order = options.order ?? "viewCount"
  const publishedAfter = new Date(now() - query.withinHours * 3_600_000).toISOString()

  const errors: string[] = []
  const videoIds: string[] = []
  const seedByVideoId = new Map<string, string>()
  let quotaSpent = 0

  /* ───── 1段目: 検索して動画IDを集める ───── */
  for (const term of query.terms) {
    try {
      await options.quota.spend("search")
      quotaSpent += 100
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        // 枠切れは失敗ではなく打ち切り。集まった分は返す。
        errors.push(error.message)
        break
      }
      throw error
    }

    const url =
      `${API_BASE}/search?part=id&type=video&maxResults=${Math.min(query.limit, 50)}` +
      `&order=${order}&q=${encodeURIComponent(term)}&publishedAfter=${publishedAfter}` +
      `&relevanceLanguage=${encodeURIComponent(query.locale)}&key=${encodeURIComponent(apiKey)}`

    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) })
      const json = (await response.json()) as SearchResponse
      if (!response.ok || json.error) {
        errors.push(`"${term}": ${json.error?.message ?? `HTTP ${response.status}`}`)
        continue
      }
      for (const item of json.items ?? []) {
        const id = item.id?.videoId
        if (!id || seedByVideoId.has(id)) continue
        seedByVideoId.set(id, term)
        videoIds.push(id)
      }
    } catch (error) {
      errors.push(`"${term}": ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /* ───── 2段目: まとめて統計を取る ───── */
  const signals: ResearchSignal[] = []

  for (const batch of chunk(videoIds, VIDEOS_BATCH_SIZE)) {
    try {
      await options.quota.spend("videos")
      quotaSpent += 1
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        errors.push(error.message)
        break
      }
      throw error
    }

    const url =
      `${API_BASE}/videos?part=snippet,statistics&id=${batch.join(",")}` +
      `&key=${encodeURIComponent(apiKey)}`

    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) })
      const json = (await response.json()) as VideosResponse
      if (!response.ok || json.error) {
        errors.push(json.error?.message ?? `videos.list HTTP ${response.status}`)
        continue
      }

      for (const item of json.items ?? []) {
        if (!item.id || !item.snippet?.title) continue
        const publishedAt = item.snippet.publishedAt ?? null
        const score = Number(item.statistics?.viewCount ?? 0)
        const seed = seedByVideoId.get(item.id) ?? ""

        signals.push({
          sourceId: "youtube_data_api",
          externalId: item.id,
          title: item.snippet.title,
          url: `https://www.youtube.com/watch?v=${item.id}`,
          publishedAt,
          metrics: {
            score,
            comments: Number(item.statistics?.commentCount ?? 0),
            velocityPerHour: computeVelocityPerHour(score, publishedAt, now()),
          },
          keywords: [...new Set([seed, ...(item.snippet.tags ?? [])].filter(Boolean))].slice(0, 10),
        })
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  return {
    // 0件は失敗ではない(検索語が刺さらなかっただけ)。エラーの有無で判定する。
    ok: errors.length === 0,
    sourceId: "youtube_data_api",
    signals,
    quotaSpent,
    error: errors.length > 0 ? errors.join(" / ") : undefined,
  }
}
