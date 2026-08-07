import { describe, expect, it } from "vitest"

import { createQuotaGuard } from "./quota"
import { extractKeywords, fetchRedditSignals, redditTimeframe } from "./reddit"
import { fetchYoutubeSignals } from "./youtube"
import type { ResearchQuery } from "./types"

const NOW = Date.parse("2026-08-06T12:00:00Z")
const now = () => NOW

const QUERY: ResearchQuery = {
  terms: ["floating point"],
  locale: "en",
  withinHours: 24,
  limit: 10,
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function stubFetch(responses: Response[], urls: string[] = []): typeof fetch {
  let index = 0
  return (async (url: string | URL) => {
    urls.push(String(url))
    const response = responses[Math.min(index, responses.length - 1)]
    index += 1
    return response
  }) as unknown as typeof fetch
}

/* ───── Reddit ───── */

function redditPost(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      id: "abc123",
      title: "Why floating point addition is not associative",
      permalink: "/r/programming/comments/abc123/x/",
      created_utc: (NOW - 2 * 3_600_000) / 1000,
      score: 1200,
      num_comments: 240,
      subreddit: "programming",
      over_18: false,
      stickied: false,
      ...overrides,
    },
  }
}

describe("redditTimeframe", () => {
  it("時間幅を Reddit の t パラメータに丸める", () => {
    expect(redditTimeframe(1)).toBe("hour")
    expect(redditTimeframe(24)).toBe("day")
    expect(redditTimeframe(100)).toBe("week")
    expect(redditTimeframe(1000)).toBe("month")
  })
})

describe("extractKeywords", () => {
  it("検索語と英単語を拾い、短い語は落とす", () => {
    const keywords = extractKeywords("Why floating point is odd", "floating point")
    expect(keywords).toContain("floating point")
    expect(keywords).toContain("floating")
    // 4文字未満は落とす。
    expect(keywords.includes("why")).toBe(false)
    expect(keywords.includes("odd")).toBe(false)
  })
})

describe("fetchRedditSignals", () => {
  it("投稿をシグナルに変換し、勢いを計算する", async () => {
    const urls: string[] = []
    const result = await fetchRedditSignals(QUERY, {
      fetchImpl: stubFetch([jsonResponse({ data: { children: [redditPost()] } })], urls),
      now,
    })

    expect(result.ok).toBe(true)
    expect(result.quotaSpent).toBe(0)
    expect(result.signals.length).toBe(1)

    const signal = result.signals[0]
    expect(signal.sourceId).toBe("reddit")
    expect(signal.metrics.score).toBe(1200)
    // 2時間前の投稿で1200点 → 600/時
    expect(signal.metrics.velocityPerHour).toBe(600)
    expect(signal.url).toBe("https://www.reddit.com/r/programming/comments/abc123/x/")
    expect(urls[0]).toContain("t=day")
  })

  it("固定投稿とNSFWを除外する", async () => {
    const result = await fetchRedditSignals(QUERY, {
      fetchImpl: stubFetch([
        jsonResponse({
          data: {
            children: [
              redditPost({ id: "s1", stickied: true }),
              redditPost({ id: "s2", over_18: true }),
              redditPost({ id: "s3" }),
            ],
          },
        }),
      ]),
      now,
    })
    expect(result.signals.map((s) => s.externalId)).toEqual(["s3"])
  })

  it("サブレディット指定を URL に反映する", async () => {
    const urls: string[] = []
    await fetchRedditSignals(QUERY, {
      fetchImpl: stubFetch([jsonResponse({ data: { children: [] } })], urls),
      now,
      subreddits: ["programming", "compsci"],
    })
    expect(urls[0]).toContain("/r/programming+compsci/search.json")
    expect(urls[0]).toContain("restrict_sr=1")
  })

  it("HTTPエラーは握りつぶさずerrorに残す", async () => {
    const result = await fetchRedditSignals(QUERY, {
      fetchImpl: stubFetch([new Response("rate limited", { status: 429 })]),
      now,
    })
    expect(result.signals.length).toBe(0)
    expect(result.error).toContain("429")
  })
})

/* ───── YouTube Data API ───── */

describe("fetchYoutubeSignals", () => {
  it("APIキーが無ければ notConfigured を返し、枠を消費しない", async () => {
    const quota = createQuotaGuard({ now })
    const result = await fetchYoutubeSignals(QUERY, { quota, apiKey: null, now })

    expect(result.ok).toBe(false)
    expect(result.notConfigured).toBe(true)
    expect(result.quotaSpent).toBe(0)
    expect((await quota.status()).spent).toBe(0)
  })

  it("search→videos の2段で取得し、101ユニット消費する", async () => {
    const quota = createQuotaGuard({ now })
    const urls: string[] = []
    const fetchImpl = stubFetch(
      [
        jsonResponse({ items: [{ id: { videoId: "vid1" } }] }),
        jsonResponse({
          items: [
            {
              id: "vid1",
              snippet: {
                title: "Floating point explained",
                publishedAt: new Date(NOW - 4 * 3_600_000).toISOString(),
                tags: ["ieee754"],
              },
              statistics: { viewCount: "8000", commentCount: "150" },
            },
          ],
        }),
      ],
      urls,
    )

    const result = await fetchYoutubeSignals(QUERY, { quota, apiKey: "k", fetchImpl, now })

    expect(result.ok).toBe(true)
    expect(result.quotaSpent).toBe(101)
    expect((await quota.status()).spent).toBe(101)
    expect(result.signals[0].metrics.score).toBe(8000)
    // 4時間前で8000再生 → 2000/時
    expect(result.signals[0].metrics.velocityPerHour).toBe(2000)
    expect(result.signals[0].url).toBe("https://www.youtube.com/watch?v=vid1")
    expect(urls[0]).toContain("/search?")
    expect(urls[1]).toContain("/videos?")
  })

  it("枠が足りなければ検索を打ち切り、集まった分を返す", async () => {
    // 検索1回分しか許さない枠にする。
    const quota = createQuotaGuard({ dailyQuota: 150, reserveRatio: 0, now })
    const multiTerm: ResearchQuery = { ...QUERY, terms: ["a", "b", "c"] }
    const fetchImpl = stubFetch([
      jsonResponse({ items: [{ id: { videoId: "vid1" } }] }),
      jsonResponse({
        items: [
          {
            id: "vid1",
            snippet: { title: "T", publishedAt: new Date(NOW - 3_600_000).toISOString() },
            statistics: { viewCount: "10", commentCount: "1" },
          },
        ],
      }),
    ])

    const result = await fetchYoutubeSignals(multiTerm, { quota, apiKey: "k", fetchImpl, now })

    // search 100 + videos 1 = 101 まで。2語目の search(100) は残49で通らない。
    expect(result.quotaSpent).toBe(101)
    expect(result.error).toContain("ユニット")
    expect(result.signals.length).toBe(1)
  })

  it("APIエラーメッセージを error に残す", async () => {
    const quota = createQuotaGuard({ now })
    const fetchImpl = stubFetch([jsonResponse({ error: { message: "quotaExceeded" } }, 403)])
    const result = await fetchYoutubeSignals(QUERY, { quota, apiKey: "k", fetchImpl, now })
    expect(result.ok).toBe(false)
    expect(result.error).toContain("quotaExceeded")
  })
})
