/**
 * lib/youtube/research/reddit.ts — Reddit を先行指標として使う
 *
 * なぜ Reddit か: 認証不要・完全無料で、話題が YouTube の検索需要に先行して立つ。
 * vidiq は月150クレジット(outlier 1回5クレジット)しかなく日次リサーチに使えないため、
 * 日次の発見はここと YouTube Data API の無料枠で賄う。
 *
 * 公開 JSON エンドポイントを使う。API キーは不要だが、
 * 素性の分かる User-Agent を付けないと 429 で弾かれる。
 */

import type { ResearchFetchResult, ResearchQuery, ResearchSignal } from "./types"
import { computeVelocityPerHour } from "./types"

const REDDIT_BASE = "https://www.reddit.com"

/** Reddit は匿名アクセスでも識別可能な UA を要求する。 */
const USER_AGENT = "paradigm-youtube-research/1.0 (contact: contact@paradigmjp.com)"

interface RedditListing {
  data?: {
    children?: Array<{
      data?: {
        id?: string
        title?: string
        permalink?: string
        created_utc?: number
        score?: number
        num_comments?: number
        subreddit?: string
        over_18?: boolean
        stickied?: boolean
      }
    }>
  }
}

/** withinHours を Reddit の t パラメータに丸める。 */
export function redditTimeframe(withinHours: number): "hour" | "day" | "week" | "month" {
  if (withinHours <= 2) return "hour"
  if (withinHours <= 24) return "day"
  if (withinHours <= 24 * 7) return "week"
  return "month"
}

/** タイトルから素朴にキーワードを拾う。日本語は分かち書きできないので語句そのものを残す。 */
export function extractKeywords(title: string, seedTerm: string): string[] {
  const latin = title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4)
  return [...new Set([seedTerm, ...latin])].slice(0, 8)
}

export interface RedditFetchOptions {
  fetchImpl?: typeof fetch
  now?: () => number
  timeoutMs?: number
  /** 特定サブレディットに絞る場合に指定する。省略時は Reddit 全体を検索する。 */
  subreddits?: string[]
}

export async function fetchRedditSignals(
  query: ResearchQuery,
  options: RedditFetchOptions = {},
): Promise<ResearchFetchResult> {
  const fetchImpl = options.fetchImpl ?? fetch
  const now = options.now ?? (() => Date.now())
  const timeoutMs = options.timeoutMs ?? 20_000
  const timeframe = redditTimeframe(query.withinHours)

  const signals: ResearchSignal[] = []
  const errors: string[] = []
  const seen = new Set<string>()

  for (const term of query.terms) {
    const url = options.subreddits?.length
      ? `${REDDIT_BASE}/r/${options.subreddits.join("+")}/search.json?q=${encodeURIComponent(term)}` +
        `&restrict_sr=1&sort=top&t=${timeframe}&limit=${query.limit}&type=link`
      : `${REDDIT_BASE}/search.json?q=${encodeURIComponent(term)}` +
        `&sort=top&t=${timeframe}&limit=${query.limit}&type=link`

    try {
      const response = await fetchImpl(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (!response.ok) {
        // 2026-08 時点で Reddit は匿名の公開JSONを 403 で遮断し、HTMLのブロックページを返す。
        // 設定不足として扱い、運用者に OAuth アプリ登録が要ることを伝える。
        if (response.status === 403 || response.status === 401) {
          return {
            ok: false,
            sourceId: "reddit",
            signals: [],
            quotaSpent: 0,
            notConfigured: true,
            error:
              "Reddit は匿名アクセスを遮断しています(403)。reddit.com/prefs/apps でアプリを登録し、OAuth の client_credentials を設定してください。無認証で使うなら hackernews / rss ソースを利用してください。",
          }
        }
        errors.push(`"${term}": HTTP ${response.status}`)
        continue
      }

      const listing = (await response.json()) as RedditListing
      for (const child of listing.data?.children ?? []) {
        const post = child.data
        if (!post?.id || !post.title) continue
        // 固定投稿とNSFWは題材として使わない。
        if (post.stickied || post.over_18) continue
        if (seen.has(post.id)) continue
        seen.add(post.id)

        const publishedAt = post.created_utc
          ? new Date(post.created_utc * 1000).toISOString()
          : null
        const score = post.score ?? 0

        signals.push({
          sourceId: "reddit",
          externalId: post.id,
          title: post.title,
          url: post.permalink ? `${REDDIT_BASE}${post.permalink}` : `${REDDIT_BASE}/comments/${post.id}`,
          publishedAt,
          metrics: {
            score,
            comments: post.num_comments ?? 0,
            velocityPerHour: computeVelocityPerHour(score, publishedAt, now()),
          },
          keywords: extractKeywords(post.title, term),
        })
      }
    } catch (error) {
      errors.push(`"${term}": ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return {
    ok: signals.length > 0 || errors.length === 0,
    sourceId: "reddit",
    signals,
    // Reddit は無料。割当管理の対象外。
    quotaSpent: 0,
    error: errors.length > 0 ? errors.join(" / ") : undefined,
  }
}
