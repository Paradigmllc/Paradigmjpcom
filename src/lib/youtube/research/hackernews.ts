/**
 * lib/youtube/research/hackernews.ts — Hacker News を先行指標として使う
 *
 * Reddit が匿名JSONアクセスを遮断した(403でHTMLブロックページを返す)ため、
 * 無認証で使える技術系の先行指標としてこちらを主軸にする。
 * Algolia の検索APIは認証不要・無料で、points と num_comments がそのまま取れる。
 *
 * 英語のみ。日本語の題材には rss.ts (Google News) を使う。
 */

import type { ResearchFetchResult, ResearchQuery, ResearchSignal } from "./types"
import { computeVelocityPerHour } from "./types"

const ALGOLIA_BASE = "https://hn.algolia.com/api/v1"

interface AlgoliaHit {
  objectID?: string
  title?: string
  url?: string | null
  points?: number
  num_comments?: number
  created_at?: string
  created_at_i?: number
  _tags?: string[]
}

interface AlgoliaResponse {
  hits?: AlgoliaHit[]
  nbHits?: number
}

export interface HackerNewsFetchOptions {
  fetchImpl?: typeof fetch
  now?: () => number
  timeoutMs?: number
}

/** タイトルから英単語を拾う。4文字未満と一般語は落とす。 */
const STOPWORDS = new Set([
  "the", "this", "that", "with", "from", "your", "have", "what", "when", "will",
  "about", "into", "than", "then", "they", "them", "just", "like", "over", "some",
])

export function extractHnKeywords(title: string, seedTerm: string): string[] {
  const words = title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word))
  return [...new Set([seedTerm, ...words])].slice(0, 8)
}

export async function fetchHackerNewsSignals(
  query: ResearchQuery,
  options: HackerNewsFetchOptions = {},
): Promise<ResearchFetchResult> {
  const fetchImpl = options.fetchImpl ?? fetch
  const now = options.now ?? (() => Date.now())
  const timeoutMs = options.timeoutMs ?? 20_000

  const since = Math.floor((now() - query.withinHours * 3_600_000) / 1000)
  const signals: ResearchSignal[] = []
  const errors: string[] = []
  const seen = new Set<string>()

  for (const term of query.terms) {
    const url =
      `${ALGOLIA_BASE}/search?query=${encodeURIComponent(term)}&tags=story` +
      `&numericFilters=created_at_i>${since}&hitsPerPage=${Math.min(query.limit, 50)}`

    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) })
      if (!response.ok) {
        errors.push(`"${term}": HTTP ${response.status}`)
        continue
      }

      const json = (await response.json()) as AlgoliaResponse
      for (const hit of json.hits ?? []) {
        if (!hit.objectID || !hit.title) continue
        if (seen.has(hit.objectID)) continue
        seen.add(hit.objectID)

        const publishedAt = hit.created_at ?? null
        const score = hit.points ?? 0

        signals.push({
          sourceId: "hackernews",
          externalId: `hn-${hit.objectID}`,
          title: hit.title,
          // 外部リンクではなく議論ページを根拠にする。論点はコメント側にあるため。
          url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
          publishedAt,
          metrics: {
            score,
            comments: hit.num_comments ?? 0,
            velocityPerHour: computeVelocityPerHour(score, publishedAt, now()),
          },
          keywords: extractHnKeywords(hit.title, term),
        })
      }
    } catch (error) {
      errors.push(`"${term}": ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return {
    // 0件は失敗ではない(検索語が刺さらなかっただけ)。エラーの有無で判定する。
    ok: errors.length === 0,
    sourceId: "hackernews",
    signals,
    quotaSpent: 0,
    error: errors.length > 0 ? errors.join(" / ") : undefined,
  }
}
