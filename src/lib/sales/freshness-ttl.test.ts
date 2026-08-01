import { describe, expect, it } from "vitest"
import { checkFreshness, adjustScoreForFreshness } from "./freshness-ttl"

describe("freshness TTL", () => {
  it("returns fresh for very recent data", () => {
    const result = checkFreshness(new Date().toISOString(), "live")
    expect(result.status).toBe("fresh")
    expect(result.shouldReVerify).toBe(false)
  })

  it("returns aging for data approaching expiry", () => {
    const result = checkFreshness(new Date(Date.now() - 5 * 24 * 3600_000).toISOString(), "live")
    expect(result.status).toBe("aging")
  })

  it("returns expired for data without timestamp", () => {
    const result = checkFreshness(null)
    expect(result.status).toBe("expired")
    expect(result.shouldReVerify).toBe(true)
  })

  it("returns stale for old passive evidence", () => {
    const collectedAt = new Date(Date.now() - 95 * 24 * 3600_000).toISOString()
    const result = checkFreshness(collectedAt, "passive")
    expect(result.status).toBe("stale")
    expect(result.shouldReVerify).toBe(true)
  })

  it("applies correct score penalties", () => {
    const fresh = adjustScoreForFreshness(80, {
      status: "fresh", collectedAt: Date.now(), expiresAt: Date.now() + 86400000,
      ageDays: 1, remainingDays: 6, shouldReVerify: false,
    })
    expect(fresh.adjustedScore).toBe(80)
    expect(fresh.penalty).toBe(0)

    const stale = adjustScoreForFreshness(80, {
      status: "stale", collectedAt: Date.now() - 100 * 86400000, expiresAt: Date.now() - 10 * 86400000,
      ageDays: 100, remainingDays: -10, shouldReVerify: true,
    })
    expect(stale.adjustedScore).toBe(60)
    expect(stale.penalty).toBe(20)

    const expired = adjustScoreForFreshness(80, {
      status: "expired", collectedAt: 0, expiresAt: 0,
      ageDays: 999, remainingDays: -999, shouldReVerify: true,
    })
    expect(expired.adjustedScore).toBe(40)
    expect(expired.penalty).toBe(40)
  })

  it("respects configurable TTL", () => {
    const config = { passiveEvidenceDays: 3, bigQueryEvidenceDays: 3, liveEvidenceDays: 1, maxReVerifyAttempts: 2 }
    const result = checkFreshness(new Date(Date.now() - 5 * 24 * 3600_000).toISOString(), "passive", config)
    expect(result.status).toBe("stale")
    expect(result.shouldReVerify).toBe(true)
  })
})
