import { describe, expect, it } from "vitest"

import { deriveAngle, groupSignalsByTopic, rankIdeaCandidates } from "./rank"
import type { ResearchSignal } from "./types"

const NOW = Date.parse("2026-08-06T12:00:00Z")

function signal(overrides: Partial<ResearchSignal> & { title: string }): ResearchSignal {
  return {
    sourceId: "reddit",
    externalId: overrides.title.slice(0, 8),
    url: "https://example.com/a",
    publishedAt: new Date(NOW - 3_600_000).toISOString(),
    metrics: { score: 100, comments: 10, velocityPerHour: 100 },
    keywords: ["kw"],
    ...overrides,
  }
}

describe("groupSignalsByTopic", () => {
  it("似たタイトルを1つの話題にまとめる", () => {
    const groups = groupSignalsByTopic([
      signal({ title: "浮動小数点の計算順序で誤差が変わる話", externalId: "a" }),
      signal({ title: "浮動小数点の計算順序で誤差が変わる理由", externalId: "b" }),
      signal({ title: "地図の投影方法で面積の見え方が変わる", externalId: "c" }),
    ])
    expect(groups.length).toBe(2)
    expect(groups.find((g) => g.length === 2)).toBeTruthy()
  })

  it("題材が違えば別グループになる", () => {
    const groups = groupSignalsByTopic([
      signal({ title: "地図の投影方法の違い", externalId: "a" }),
      signal({ title: "音色は倍音の重なりで決まる", externalId: "b" }),
    ])
    expect(groups.length).toBe(2)
  })
})

describe("deriveAngle", () => {
  it("複数ソースで裏が取れていれば corroborated", () => {
    expect(deriveAngle(new Set(["reddit", "youtube_data_api"])).kind).toBe("corroborated")
  })

  it("Reddit のみなら先行トピック扱い", () => {
    expect(deriveAngle(new Set(["reddit"])).kind).toBe("leading")
  })

  it("YouTube のみなら飽和扱い", () => {
    expect(deriveAngle(new Set(["youtube_data_api"])).kind).toBe("saturated")
  })
})

describe("rankIdeaCandidates", () => {
  it("複数ソースで観測された話題を単一ソースより高く評価する", () => {
    const both = [
      signal({ title: "新しい圧縮方式が話題になっている", externalId: "r1", sourceId: "reddit" }),
      signal({
        title: "新しい圧縮方式が話題になっている件",
        externalId: "y1",
        sourceId: "youtube_data_api",
        url: "https://youtube.com/watch?v=1",
      }),
    ]
    const single = [signal({ title: "全く別の話題である地図投影の比較", externalId: "r2" })]

    const ranked = rankIdeaCandidates([...both, ...single], { now: () => NOW })

    expect(ranked[0].topic).toContain("圧縮方式")
    expect(ranked[0].reasons.join()).toContain("複数ソースで観測")
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score)
  })

  it("直近作と題材が被る候補を減点する", () => {
    const signals = [signal({ title: "浮動小数点の計算順序と誤差の話", externalId: "a" })]

    const clean = rankIdeaCandidates(signals, { now: () => NOW })
    const overlapping = rankIdeaCandidates(signals, {
      now: () => NOW,
      recentTitles: ["浮動小数点の計算順序と誤差の話"],
    })

    expect(overlapping[0].score).toBeGreaterThan(-1)
    expect(clean[0].score > overlapping[0].score).toBe(true)
    expect(overlapping[0].reasons.join()).toContain("直近作と題材が重複")
  })

  it("古い話題より新しい話題を高く評価する", () => {
    const fresh = signal({
      title: "たった今起きた出来事についての報告",
      externalId: "fresh",
      publishedAt: new Date(NOW - 3_600_000).toISOString(),
    })
    const old = signal({
      title: "一週間前に起きた別件の顛末まとめ",
      externalId: "old",
      publishedAt: new Date(NOW - 7 * 24 * 3_600_000).toISOString(),
    })

    const ranked = rankIdeaCandidates([fresh, old], { now: () => NOW })
    const freshCandidate = ranked.find((c) => c.topic.includes("たった今"))
    const oldCandidate = ranked.find((c) => c.topic.includes("一週間前"))
    expect(freshCandidate!.score > oldCandidate!.score).toBe(true)
  })

  it("採点の根拠を必ず残す", () => {
    const ranked = rankIdeaCandidates([signal({ title: "何らかの話題" })], { now: () => NOW })
    expect(ranked[0].reasons.length).toBeGreaterThan(3)
    expect(ranked[0].reasons.join()).toContain("勢い")
  })

  it("根拠URLを SourceRef に変換する", () => {
    const ranked = rankIdeaCandidates(
      [signal({ title: "何らかの話題", url: "https://reddit.com/r/x/comments/1" })],
      { now: () => NOW },
    )
    expect(ranked[0].sources[0].url).toBe("https://reddit.com/r/x/comments/1")
    expect(ranked[0].sources[0].retrievedAt).toBe(new Date(NOW).toISOString())
  })

  it("シグナルが無ければ空を返す", () => {
    expect(rankIdeaCandidates([], { now: () => NOW })).toEqual([])
  })

  it("limit で件数を絞れる", () => {
    // 語彙を完全に分けないと groupSignalsByTopic が同一話題としてまとめてしまう。
    const titles = [
      "地図の投影方法による面積のゆがみ",
      "倍音の重なりが音色を決める仕組み",
      "圧縮アルゴリズムの選び方と限界",
      "為替介入が市場に与える短期の影響",
      "菌類のネットワークと森林の栄養輸送",
    ]
    const many = titles.map((title, i) => signal({ title, externalId: `s${i}` }))
    expect(rankIdeaCandidates(many, { now: () => NOW }).length).toBe(5)
    expect(rankIdeaCandidates(many, { now: () => NOW, limit: 2 }).length).toBe(2)
  })
})
