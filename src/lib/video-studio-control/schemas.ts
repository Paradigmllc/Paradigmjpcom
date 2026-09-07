import { z } from "zod"

export const providers = ["auto", "vast_oss", "runway", "kling", "seedance", "heygen"] as const
export const shotKinds = ["avatar", "cinematic", "product", "social", "broll", "motion_graphics"] as const
export const qualityTiers = ["economy", "balanced", "premium"] as const

export const generationPreflightSchema = z.object({
  action: z.literal("preflight"),
  idempotencyKey: z.string().trim().min(8).max(200),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  projectId: z.union([z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,71}$/), z.literal("")]).optional().default(""),
  shotKind: z.enum(shotKinds),
  qualityTier: z.enum(qualityTiers),
  requestedProvider: z.enum(providers),
  estimatedCostCents: z.number().int().min(0).max(10_000_000),
  estimatedLlmTokens: z.number().int().min(0).max(10_000_000),
  estimatedGpuSeconds: z.number().int().min(0).max(86_400),
})

export const generationPolicySchema = z.object({
  action: z.literal("update_policy"),
  enabled: z.boolean(),
  dailyBudgetCents: z.number().int().min(0).max(10_000_000),
  perRunBudgetCents: z.number().int().min(0).max(10_000_000),
  perRunLlmTokenLimit: z.number().int().min(0).max(10_000_000),
  perRunGpuSecondsLimit: z.number().int().min(0).max(86_400),
  maxAttempts: z.number().int().min(1).max(10),
  circuitFailureThreshold: z.number().int().min(1).max(20),
  circuitCooldownMinutes: z.number().int().min(1).max(1_440),
  reservationTtlMinutes: z.number().int().min(1).max(240),
}).refine((value) => value.perRunBudgetCents <= value.dailyBudgetCents, {
  message: "1実行上限は日次上限以下にしてください",
  path: ["perRunBudgetCents"],
})

export const generationQualityReviewSchema = z.object({
  action: z.literal("review_quality"),
  runId: z.string().uuid(),
  identityScore: z.number().int().min(0).max(100),
  motionScore: z.number().int().min(0).max(100),
  promptScore: z.number().int().min(0).max(100),
  artifactScore: z.number().int().min(0).max(100),
  audioScore: z.number().int().min(0).max(100),
  commercialScore: z.number().int().min(0).max(100),
  approved: z.boolean(),
  note: z.string().trim().min(10).max(2_000),
})

export const generationControlMutationSchema = z.discriminatedUnion("action", [
  generationPreflightSchema,
  generationPolicySchema,
  generationQualityReviewSchema,
])

export type GenerationPreflightInput = z.infer<typeof generationPreflightSchema>
export type GenerationPolicyInput = z.infer<typeof generationPolicySchema>
export type GenerationQualityReviewInput = z.infer<typeof generationQualityReviewSchema>
