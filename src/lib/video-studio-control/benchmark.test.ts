import { describe, expect, it } from "vitest"
import { benchmarkReviewSchema, benchmarkSchema, benchmarkScore, buildBenchmarkGroups } from "./benchmark"
import type { GenerationQualityReview, GenerationRun } from "./types"

export const evidence = {
  rubricVersion: "studio-8axis-v1" as const, genre: "product" as const, caseId: "coffee-steam-v1",
  protocolHash: "a".repeat(64), artifactSha256: "b".repeat(64),
  scores: { identity: 90, direction: 90, motion: 90, visual: 90, brand: 90, audio: 90, editing: 90, delivery: 90 },
  blockingDefects: [], totalCostCents: 120, repairMinutes: 3,
}
const run = { id: "run-1", selectedProvider: "vast_oss", qualityTier: "premium", state: "succeeded" } as GenerationRun
const review = { id: "review-1", runId: run.id, approved: true, benchmark: evidence,
  createdAt: "2026-09-07T00:00:00Z", overallScore: 90,
  identityScore: 90, motionScore: 90, promptScore: 90, artifactScore: 90,
  audioScore: 90, commercialScore: 90, reviewer: "test:reviewer", note: "Fixture only" } satisfies GenerationQualityReview

describe("eight-axis evidence benchmark", () => {
  it("weights scores without converting missing evidence to a high score", () => {
    expect(benchmarkScore(evidence)).toBe(90)
    expect(benchmarkScore({ ...evidence, scores: { ...evidence.scores, identity: 0 } })).toBe(72)
    expect(benchmarkSchema.safeParse({ ...evidence, scores: {} }).success).toBe(false)
  })
  it("renormalizes explicit non-applicable axes only", () => {
    expect(benchmarkScore({ ...evidence, scores: { ...evidence.scores, identity: null, brand: null, audio: null } })).toBe(90)
    expect(benchmarkSchema.safeParse({ ...evidence, scores: { ...evidence.scores, motion: null } }).success).toBe(false)
  })
  it("rejects a high-scoring approval with any critical defect", () => {
    expect(benchmarkReviewSchema.safeParse({ action: "review_benchmark", runId: "11111111-1111-4111-8111-111111111111",
      benchmark: { ...evidence, blockingDefects: ["frozen_motion"] }, approved: true, note: "Frozen from 2.0 seconds" }).success).toBe(false)
  })
  it("rejects unknown, duplicate and malformed evidence", () => {
    for (const change of [{ totalCostCents: -1 }, { artifactSha256: "https://private.example" }, { blockingDefects: ["unknown"] },
      { blockingDefects: ["watermark", "watermark"] }, { scores: { ...evidence.scores, motion: 101 } }, { overrides: true }]) {
      expect(benchmarkSchema.safeParse({ ...evidence, ...change }).success).toBe(false)
    }
  })
  it("uses only the latest review and does not average away a rejection", () => {
    const latest = { ...review, id: "review-2", approved: false, createdAt: "2026-09-07T01:00:00Z" }
    expect(buildBenchmarkGroups([run], [review, latest])[0]).toMatchObject({ reviewCount: 1, approvalRate: 0, costPerAcceptedCents: null })
  })
  it("does not treat cache hits, legacy reviews or pending jobs as benchmark footage", () => {
    expect(buildBenchmarkGroups([{ ...run, state: "cache_hit" }], [review])).toEqual([])
    expect(buildBenchmarkGroups([run], [{ ...review, benchmark: null }])).toEqual([])
    expect(buildBenchmarkGroups([{ ...run, state: "running" }], [review])).toEqual([])
  })
  it("separates genres, conditions, tiers and applicable axes", () => {
    for (const change of [{ genre: "anime" as const }, { protocolHash: "c".repeat(64) }, { scores: { ...evidence.scores, audio: null } }]) {
      expect(buildBenchmarkGroups([run, { ...run, id: "run-2" }], [review, { ...review, runId: "run-2", benchmark: { ...evidence, ...change } }])).toHaveLength(2)
    }
    expect(buildBenchmarkGroups([run, { ...run, id: "run-2", qualityTier: "economy" }], [review, { ...review, runId: "run-2" }])).toHaveLength(2)
  })
  it("includes reviewed failed-quality attempts in adopted-shot cost and preserves unknown costs", () => {
    const runs = [run, { ...run, id: "run-2" }]
    const rejected = { ...review, runId: "run-2", approved: false }
    expect(buildBenchmarkGroups(runs, [review, rejected])[0]).toMatchObject({ costPerAcceptedCents: 240, approvalRate: 50, repairMinutes: 6 })
    expect(buildBenchmarkGroups(runs, [review, { ...rejected, benchmark: { ...evidence, totalCostCents: null } }])[0].costPerAcceptedCents).toBeNull()
  })
})
