import { describe, expect, it } from "vitest"
import {
  chunkDemoBatch,
  DEMO_BATCH_ENQUEUE_CONCURRENCY,
  DEMO_BATCH_MAX_ITEMS,
  mapWithConcurrency,
  summarizeDemoBatchWave,
} from "./demo-batch-wave"

describe("demo batch wave", () => {
  it("summarizes a multi-status wave without treating a failed job as complete", () => {
    expect(summarizeDemoBatchWave([
      { status: "queued" },
      { status: "running" },
      { status: "completed", result_payload: { quality_report: { passed: true } } },
      { status: "completed", result_payload: { quality_report: { passed: false } } },
      { status: "failed" },
    ])).toEqual({
      total: 5,
      queued: 1,
      running: 1,
      completed: 2,
      failed: 1,
      cancelled: 0,
      qualityPassed: 1,
      finished: 3,
      progressPercent: 60,
    })
  })

  it("processes 300 records with bounded concurrency and stable result order", async () => {
    const items = Array.from({ length: DEMO_BATCH_MAX_ITEMS }, (_, index) => index)
    let active = 0
    let maxActive = 0
    const results = await mapWithConcurrency(items, DEMO_BATCH_ENQUEUE_CONCURRENCY, async (item) => {
      active++
      maxActive = Math.max(maxActive, active)
      await Promise.resolve()
      active--
      return item * 2
    })

    expect(maxActive).toBeLessThanOrEqual(DEMO_BATCH_ENQUEUE_CONCURRENCY)
    expect(results).toHaveLength(DEMO_BATCH_MAX_ITEMS)
    expect(results[0]).toBe(0)
    expect(results.at(-1)).toBe((DEMO_BATCH_MAX_ITEMS - 1) * 2)
  })

  it("splits portal imports and URL issuance into bounded requests", () => {
    expect(chunkDemoBatch(Array.from({ length: 300 }, (_, index) => index), 50).map((chunk) => chunk.length))
      .toEqual([50, 50, 50, 50, 50, 50])
  })
})
