import { describe, expect, it } from "vitest"
import { getSalesRunLastActivityAt, isSalesRunStale, SALES_RUN_STALE_AFTER_MS } from "./run-staleness"

const NOW = Date.parse("2026-07-14T12:00:00.000Z")

describe("sales run staleness", () => {
  it("marks an active run stale after five minutes without activity", () => {
    expect(isSalesRunStale({
      status: "running",
      heartbeat_at: "2026-07-14T11:54:59.000Z",
    }, NOW)).toBe(true)
  })

  it("keeps recently active and terminal runs out of recovery", () => {
    expect(isSalesRunStale({
      status: "queued",
      heartbeat_at: new Date(NOW - SALES_RUN_STALE_AFTER_MS).toISOString(),
    }, NOW)).toBe(false)
    expect(isSalesRunStale({
      status: "partial",
      heartbeat_at: "2026-07-14T10:00:00.000Z",
    }, NOW)).toBe(false)
  })

  it("uses the newest valid activity timestamp", () => {
    const run = {
      status: "running",
      heartbeat_at: "invalid",
      updated_at: "2026-07-14T11:58:00.000Z",
      created_at: "2026-07-14T10:00:00.000Z",
    }
    expect(getSalesRunLastActivityAt(run)).toBe(Date.parse(run.updated_at))
    expect(isSalesRunStale(run, NOW)).toBe(false)
  })
})
