import { describe, expect, it } from "vitest"

import {
  createInMemoryQuotaStore,
  createQuotaGuard,
  pacificDateKey,
  QuotaExceededError,
  YOUTUBE_API_UNIT_COST,
} from "./quota"

describe("pacificDateKey", () => {
  it("太平洋時間の暦日で数える", () => {
    // 2026-08-06T06:30Z は PDT(UTC-7) では 8/5 23:30。
    expect(pacificDateKey(Date.parse("2026-08-06T06:30:00Z"))).toBe("2026-08-05")
    // 07:30Z は 8/6 00:30 なので日付が繰り上がる。
    expect(pacificDateKey(Date.parse("2026-08-06T07:30:00Z"))).toBe("2026-08-06")
  })
})

describe("createQuotaGuard", () => {
  const at = (iso: string) => () => Date.parse(iso)

  it("検索は100ユニット、統計取得は1ユニット消費する", async () => {
    expect(YOUTUBE_API_UNIT_COST.search).toBe(100)
    expect(YOUTUBE_API_UNIT_COST.videos).toBe(1)

    const guard = createQuotaGuard({ now: at("2026-08-06T18:00:00Z") })
    await guard.spend("search")
    await guard.spend("videos")
    expect((await guard.status()).spent).toBe(101)
  })

  it("既定で1割を予備に残す", async () => {
    const guard = createQuotaGuard({ now: at("2026-08-06T18:00:00Z") })
    const status = await guard.status()
    expect(status.limit).toBe(10_000)
    expect(status.usable).toBe(9_000)
    expect(status.remaining).toBe(9_000)
  })

  it("枠を超える消費は QuotaExceededError にする", async () => {
    const guard = createQuotaGuard({ dailyQuota: 250, reserveRatio: 0, now: at("2026-08-06T18:00:00Z") })
    await guard.spend("search")
    await guard.spend("search")
    // 残り50ユニットなので search(100) は通らない。
    let thrown: unknown = null
    try {
      await guard.spend("search")
    } catch (error) {
      thrown = error
    }
    expect(thrown instanceof QuotaExceededError).toBe(true)
    // 失敗した消費は記録されない。
    expect((await guard.status()).spent).toBe(200)
  })

  it("canSpend は副作用なしで判定する", async () => {
    const guard = createQuotaGuard({ dailyQuota: 100, reserveRatio: 0, now: at("2026-08-06T18:00:00Z") })
    expect(await guard.canSpend("search")).toBe(true)
    expect((await guard.status()).spent).toBe(0)
    await guard.spend("search")
    expect(await guard.canSpend("search")).toBe(false)
    expect(await guard.canSpend("videos")).toBe(false)
  })

  it("太平洋時間の日付が変われば枠が戻る", async () => {
    const store = createInMemoryQuotaStore()
    let clock = Date.parse("2026-08-06T18:00:00Z")
    const guard = createQuotaGuard({ store, dailyQuota: 200, reserveRatio: 0, now: () => clock })

    await guard.spend("search")
    expect((await guard.status()).remaining).toBe(100)

    // 翌日の PT 午前1時へ進める。
    clock = Date.parse("2026-08-07T08:00:00Z")
    const next = await guard.status()
    expect(next.dateKey).toBe("2026-08-07")
    expect(next.spent).toBe(0)
    expect(next.remaining).toBe(200)
  })
})
