import { z } from "zod"
import type { GenerationQualityReview, GenerationRun } from "./types"

export const benchmarkGenres = ["explainer", "avatar", "anime", "manga", "product", "landscape", "music", "brand"] as const
export const benchmarkAxes = [
  { key: "identity", label: "被写体の一貫性", weight: 20, optional: true },
  { key: "direction", label: "演出指示の遵守", weight: 15, optional: false },
  { key: "motion", label: "動きの自然さ", weight: 15, optional: false },
  { key: "visual", label: "画作り", weight: 15, optional: false },
  { key: "brand", label: "商品・ブランドの正確さ", weight: 10, optional: true },
  { key: "audio", label: "音声・字幕", weight: 10, optional: true },
  { key: "editing", label: "編集完成度", weight: 10, optional: false },
  { key: "delivery", label: "納品適合性", weight: 5, optional: false },
] as const
export const benchmarkDefects = ["identity_break", "product_distortion", "frozen_motion", "unreadable_text", "audio_desync", "rights_unresolved", "watermark", "corrupt_output"] as const
const score = z.number().int().min(0).max(100)
export const benchmarkSchema = z.object({
  rubricVersion: z.literal("studio-8axis-v1"),
  genre: z.enum(benchmarkGenres),
  caseId: z.string().regex(/^[a-z0-9][a-z0-9-]{2,99}$/),
  protocolHash: z.string().regex(/^[a-f0-9]{64}$/),
  artifactSha256: z.string().regex(/^[a-f0-9]{64}$/),
  scores: z.object({ identity: score.nullable(), direction: score, motion: score, visual: score,
    brand: score.nullable(), audio: score.nullable(), editing: score, delivery: score }).strict(),
  blockingDefects: z.array(z.enum(benchmarkDefects)).max(8).refine((items) => new Set(items).size === items.length),
  totalCostCents: z.number().int().min(0).max(10_000_000).nullable(),
  repairMinutes: z.number().int().min(0).max(100_000).nullable(),
}).strict()
export type BenchmarkEvidence = z.infer<typeof benchmarkSchema>

export function benchmarkScore(evidence: BenchmarkEvidence): number {
  const applicable = benchmarkAxes.filter((axis) => evidence.scores[axis.key] !== null)
  const weighted = applicable.reduce((sum, axis) => sum + (evidence.scores[axis.key] ?? 0) * axis.weight, 0)
  return Math.round(weighted / applicable.reduce((sum, axis) => sum + axis.weight, 0) * 100) / 100
}

// Provisional review thresholds, not a promise of SaaS parity or delivery approval.
export function benchmarkThreshold(tier: string): number {
  return tier === "economy" ? 75 : tier === "balanced" ? 85 : 90
}

export const benchmarkReviewSchema = z.object({
  action: z.literal("review_benchmark"), runId: z.string().uuid(),
  benchmark: benchmarkSchema, approved: z.boolean(), note: z.string().trim().min(10).max(2_000),
}).strict().refine((review) => !review.approved || review.benchmark.blockingDefects.length === 0, {
  message: "重大欠陥がある映像は合格にできません", path: ["approved"],
})
export type BenchmarkReviewInput = z.infer<typeof benchmarkReviewSchema>

export type BenchmarkGroup = {
  provider: string; qualityTier: string; genre: BenchmarkEvidence["genre"]; caseId: string; protocolHash: string; applicability: string
  reviewCount: number; averageScore: number; approvalRate: number
  costPerAcceptedCents: number | null; repairMinutes: number | null
}

export function buildBenchmarkGroups(runs: GenerationRun[], reviews: GenerationQualityReview[]): BenchmarkGroup[] {
  const byRun = new Map(runs.map((run) => [run.id, run]))
  const latest = new Map<string, GenerationQualityReview>()
  // An old pass must never outweigh a newer rejection, including a legacy rejection.
  for (const review of [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))) {
    if (!latest.has(review.runId)) latest.set(review.runId, review)
  }
  const groups = new Map<string, { group: BenchmarkGroup; scores: number[]; costs: Array<number | null>; repairs: Array<number | null>; accepted: number }>()
  for (const review of latest.values()) {
    const run = byRun.get(review.runId)
    const evidence = review.benchmark
    if (!run || run.state !== "succeeded" || !evidence) continue
    const applicability = benchmarkAxes.filter((axis) => evidence.scores[axis.key] !== null).map((axis) => axis.key).join(",")
    const key = JSON.stringify([run.selectedProvider, run.qualityTier, evidence.genre, evidence.caseId, evidence.protocolHash, applicability])
    const item = groups.get(key) ?? { group: { provider: run.selectedProvider, qualityTier: run.qualityTier, genre: evidence.genre, caseId: evidence.caseId,
      protocolHash: evidence.protocolHash, applicability, reviewCount: 0, averageScore: 0, approvalRate: 0,
      costPerAcceptedCents: null, repairMinutes: null }, scores: [], costs: [], repairs: [], accepted: 0 }
    item.scores.push(benchmarkScore(evidence)); item.costs.push(evidence.totalCostCents); item.repairs.push(evidence.repairMinutes)
    if (review.approved && evidence.blockingDefects.length === 0 && benchmarkScore(evidence) >= benchmarkThreshold(run.qualityTier)) item.accepted++
    groups.set(key, item)
  }
  return [...groups.values()].map(({ group, scores, costs, repairs, accepted }) => ({
    ...group, reviewCount: scores.length, averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100,
    approvalRate: Math.round(accepted / scores.length * 100),
    costPerAcceptedCents: accepted > 0 && costs.every((cost) => cost !== null)
      ? Math.round(costs.reduce<number>((sum, cost) => sum + (cost ?? 0), 0) / accepted) : null,
    repairMinutes: repairs.every((minutes) => minutes !== null) ? repairs.reduce<number>((sum, minutes) => sum + (minutes ?? 0), 0) : null,
  }))
}
