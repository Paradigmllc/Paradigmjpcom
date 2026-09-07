import { describe, expect, it } from "vitest"
import { generationControlMutationSchema } from "./schemas"

const preflight = {
  action: "preflight", idempotencyKey: "studio-request-001", contentHash: "a".repeat(64), projectId: "",
  shotKind: "cinematic", qualityTier: "balanced", requestedProvider: "auto",
  estimatedCostCents: 300, estimatedLlmTokens: 4_000, estimatedGpuSeconds: 180,
}

describe("video studio generation control schemas", () => {
  it("accepts a no-cost preflight contract", () => {
    expect(generationControlMutationSchema.safeParse(preflight).success).toBe(true)
  })

  it("rejects malformed hashes and unlimited estimates", () => {
    expect(generationControlMutationSchema.safeParse({ ...preflight, contentHash: "raw prompt" }).success).toBe(false)
    expect(generationControlMutationSchema.safeParse({ ...preflight, estimatedGpuSeconds: 86_401 }).success).toBe(false)
  })

  it("requires the per-run cost ceiling to remain below the daily ceiling", () => {
    const result = generationControlMutationSchema.safeParse({
      action: "update_policy", enabled: true, dailyBudgetCents: 500,
      perRunBudgetCents: 600, perRunLlmTokenLimit: 30_000, perRunGpuSecondsLimit: 900,
      maxAttempts: 2, circuitFailureThreshold: 3, circuitCooldownMinutes: 30, reservationTtlMinutes: 20,
    })
    expect(result.success).toBe(false)
  })

  it("requires bounded six-axis quality evidence", () => {
    const review = { action: "review_quality", runId: "11111111-1111-4111-8111-111111111111", identityScore: 90, motionScore: 88, promptScore: 91, artifactScore: 84, audioScore: 86, commercialScore: 89, approved: true, note: "Commercial review passed" }
    expect(generationControlMutationSchema.safeParse(review).success).toBe(true)
    expect(generationControlMutationSchema.safeParse({ ...review, motionScore: 101 }).success).toBe(false)
  })
})
