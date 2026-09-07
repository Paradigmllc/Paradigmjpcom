import type { BenchmarkEvidence, BenchmarkGroup } from "./benchmark"

export type GenerationPolicy = {
  id: string
  enabled: boolean
  dailyBudgetCents: number
  perRunBudgetCents: number
  perRunLlmTokenLimit: number
  perRunGpuSecondsLimit: number
  maxAttempts: number
  circuitFailureThreshold: number
  circuitCooldownMinutes: number
  reservationTtlMinutes: number
  updatedBy: string
  updatedAt: string
}

export type ProviderHealth = {
  provider: string
  circuitState: "closed" | "open" | "half_open"
  consecutiveFailures: number
  retryAfter: string | null
  lastFailureFingerprint: string | null
  lastSuccessAt: string | null
  updatedAt: string
}

export type GenerationRun = {
  id: string
  idempotencyKey: string
  projectId: string | null
  shotKind: string
  qualityTier: string
  requestedProvider: string
  selectedProvider: string
  state: string
  decision: "allow" | "block" | "reuse"
  blockReason: string | null
  estimatedCostCents: number
  reservedCostCents: number
  actualCostCents: number
  estimatedLlmTokens: number
  llmTokensUsed: number
  estimatedGpuSeconds: number
  gpuSecondsUsed: number
  attemptCount: number
  maxAttempts: number
  cacheSourceRunId: string | null
  requestedBy: string
  expiresAt: string | null
  createdAt: string
  completedAt: string | null
}

export type GenerationEvent = {
  id: string
  runId: string | null
  eventType: string
  actor: string
  payload: Record<string, unknown>
  createdAt: string
}

export type GenerationQualityReview = {
  id: string
  runId: string
  identityScore: number
  motionScore: number
  promptScore: number
  artifactScore: number
  audioScore: number
  commercialScore: number
  overallScore: number
  approved: boolean
  reviewer: string
  note: string
  createdAt: string
  benchmark: BenchmarkEvidence | null
}

export type GenerationControlDashboard = {
  generatedAt: string
  policy: GenerationPolicy
  providers: ProviderHealth[]
  runs: GenerationRun[]
  events: GenerationEvent[]
  qualityReviews: GenerationQualityReview[]
  providerBenchmarks: Array<{ provider: string; reviewCount: number; averageScore: number; approvalRate: number }>
  benchmarkGroups: BenchmarkGroup[]
  totals: {
    todayCommittedCents: number
    todayActualCents: number
    todayLlmTokens: number
    todayGpuSeconds: number
    blockedRuns: number
    cacheHits: number
  }
}
