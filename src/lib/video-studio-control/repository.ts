import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import type { SalesApiPrincipal } from "@/lib/sales/api-auth"
import type { GenerationPolicyInput, GenerationPreflightInput, GenerationQualityReviewInput } from "./schemas"
import type {
  GenerationControlDashboard,
  GenerationEvent,
  GenerationPolicy,
  GenerationQualityReview,
  GenerationRun,
  ProviderHealth,
} from "./types"

type Row = Record<string, unknown>

async function budgetRows(client: ReturnType<typeof database>, today: string, now: string): Promise<Row[]> {
  const rows: Row[] = []
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client.from(DB_TABLES.VIDEO_FACTORY_GENERATION_RUNS)
      .select("id,state,reserved_cost_cents,actual_cost_cents,llm_tokens_used,gpu_seconds_used,decision,expires_at,completed_at")
      .or(`created_at.gte.${today},updated_at.gte.${today},completed_at.gte.${today},state.in.(queued,running,retryable),and(state.eq.reserved,expires_at.gt.${now})`)
      .order("id").range(offset, offset + pageSize - 1)
    if (error) throw new Error(`Video Studio budget query failed: ${error.message}`)
    rows.push(...(data ?? []).map(record))
    if (!data || data.length < pageSize) return rows
  }
}

function database() {
  const client = getServiceSalesSupabase()
  if (!client) throw new Error("Video Studio database is unavailable")
  return client
}

function text(row: Row, key: string): string {
  return typeof row[key] === "string" ? row[key] : ""
}

function nullableText(row: Row, key: string): string | null {
  return typeof row[key] === "string" ? row[key] as string : null
}

function number(row: Row, key: string): number {
  return typeof row[key] === "number" ? row[key] : Number(row[key] ?? 0)
}

function record(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {}
}

function policyFrom(row: Row): GenerationPolicy {
  return {
    id: text(row, "id"), enabled: row.enabled === true,
    dailyBudgetCents: number(row, "daily_budget_cents"), perRunBudgetCents: number(row, "per_run_budget_cents"),
    perRunLlmTokenLimit: number(row, "per_run_llm_token_limit"), perRunGpuSecondsLimit: number(row, "per_run_gpu_seconds_limit"),
    maxAttempts: number(row, "max_attempts"), circuitFailureThreshold: number(row, "circuit_failure_threshold"),
    circuitCooldownMinutes: number(row, "circuit_cooldown_minutes"), reservationTtlMinutes: number(row, "reservation_ttl_minutes"),
    updatedBy: text(row, "updated_by"), updatedAt: text(row, "updated_at"),
  }
}

function providerFrom(row: Row): ProviderHealth {
  const state = text(row, "circuit_state")
  return {
    provider: text(row, "provider"),
    circuitState: state === "open" || state === "half_open" ? state : "closed",
    consecutiveFailures: number(row, "consecutive_failures"), retryAfter: nullableText(row, "retry_after"),
    lastFailureFingerprint: nullableText(row, "last_failure_fingerprint"), lastSuccessAt: nullableText(row, "last_success_at"),
    updatedAt: text(row, "updated_at"),
  }
}

function runFrom(row: Row): GenerationRun {
  const decision = text(row, "decision")
  return {
    id: text(row, "id"), idempotencyKey: text(row, "idempotency_key"), projectId: nullableText(row, "project_id"),
    shotKind: text(row, "shot_kind"), qualityTier: text(row, "quality_tier"), requestedProvider: text(row, "requested_provider"),
    selectedProvider: text(row, "selected_provider"), state: text(row, "state"),
    decision: decision === "block" || decision === "reuse" ? decision : "allow", blockReason: nullableText(row, "block_reason"),
    estimatedCostCents: number(row, "estimated_cost_cents"), reservedCostCents: number(row, "reserved_cost_cents"),
    actualCostCents: number(row, "actual_cost_cents"), estimatedLlmTokens: number(row, "estimated_llm_tokens"),
    llmTokensUsed: number(row, "llm_tokens_used"), estimatedGpuSeconds: number(row, "estimated_gpu_seconds"),
    gpuSecondsUsed: number(row, "gpu_seconds_used"), attemptCount: number(row, "attempt_count"), maxAttempts: number(row, "max_attempts"),
    cacheSourceRunId: nullableText(row, "cache_source_run_id"), requestedBy: text(row, "requested_by"),
    expiresAt: nullableText(row, "expires_at"), createdAt: text(row, "created_at"), completedAt: nullableText(row, "completed_at"),
  }
}

function eventFrom(row: Row): GenerationEvent {
  return {
    id: text(row, "id"), runId: nullableText(row, "run_id"), eventType: text(row, "event_type"),
    actor: text(row, "actor"), payload: record(row.payload), createdAt: text(row, "created_at"),
  }
}

function qualityFrom(row: Row): GenerationQualityReview {
  return {
    id: text(row, "id"), runId: text(row, "run_id"), identityScore: number(row, "identity_score"),
    motionScore: number(row, "motion_score"), promptScore: number(row, "prompt_score"), artifactScore: number(row, "artifact_score"),
    audioScore: number(row, "audio_score"), commercialScore: number(row, "commercial_score"), overallScore: number(row, "overall_score"),
    approved: row.approved === true, reviewer: text(row, "reviewer"), note: text(row, "note"), createdAt: text(row, "created_at"),
  }
}

export async function getGenerationControlDashboard(): Promise<GenerationControlDashboard> {
  const client = database()
  const now = new Date()
  const tokyoParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now)
  const datePart = (type: "year" | "month" | "day") => Number(tokyoParts.find((part) => part.type === type)?.value ?? 0)
  const todayStart = new Date(Date.UTC(datePart("year"), datePart("month") - 1, datePart("day")) - 9 * 60 * 60 * 1_000)
  const [policyResult, providerResult, runResult, eventResult, qualityResult, todayResult] = await Promise.all([
    client.from(DB_TABLES.VIDEO_FACTORY_GENERATION_POLICIES).select("*").eq("id", "studio-default").single(),
    client.from(DB_TABLES.VIDEO_FACTORY_PROVIDER_HEALTH).select("*").order("provider"),
    client.from(DB_TABLES.VIDEO_FACTORY_GENERATION_RUNS).select("*").order("created_at", { ascending: false }).limit(100),
    client.from(DB_TABLES.VIDEO_FACTORY_GENERATION_EVENTS).select("*").order("created_at", { ascending: false }).limit(50),
    client.from(DB_TABLES.VIDEO_FACTORY_GENERATION_QUALITY_REVIEWS).select("*").order("created_at", { ascending: false }).limit(100),
    budgetRows(client, todayStart.toISOString(), now.toISOString()),
  ])
  const failure = policyResult.error ?? providerResult.error ?? runResult.error ?? eventResult.error ?? qualityResult.error
  if (failure) throw new Error(`Video Studio dashboard query failed: ${failure.message}`)
  const policy = policyFrom(record(policyResult.data))
  const providers = (providerResult.data ?? []).map((row) => providerFrom(record(row)))
  const runs = (runResult.data ?? []).map((row) => runFrom(record(row)))
  const events = (eventResult.data ?? []).map((row) => eventFrom(record(row)))
  const qualityReviews = (qualityResult.data ?? []).map((row) => qualityFrom(record(row)))
  const todayRows = todayResult
  const runProviders = new Map(runs.map((run) => [run.id, run.selectedProvider]))
  const providerBenchmarks = providers.map(({ provider }) => {
    const reviews = qualityReviews.filter((review) => runProviders.get(review.runId) === provider)
    return {
      provider, reviewCount: reviews.length,
      averageScore: reviews.length ? Math.round(reviews.reduce((sum, review) => sum + review.overallScore, 0) / reviews.length * 10) / 10 : 0,
      approvalRate: reviews.length ? Math.round(reviews.filter((review) => review.approved).length / reviews.length * 100) : 0,
    }
  })
  return {
    generatedAt: now.toISOString(), policy, providers, runs, events, qualityReviews, providerBenchmarks,
    totals: {
      todayCommittedCents: todayRows.reduce((sum, row) => {
        const state = text(row, "state")
        const expiry = nullableText(row, "expires_at")
        const active = ["queued", "running", "retryable"].includes(state)
          || (state === "reserved" && expiry !== null && new Date(expiry) > now)
        return sum + (active ? Math.max(number(row, "actual_cost_cents"), number(row, "reserved_cost_cents")) : number(row, "actual_cost_cents"))
      }, 0),
      todayActualCents: todayRows.reduce((sum, row) => sum + number(row, "actual_cost_cents"), 0),
      todayLlmTokens: todayRows.reduce((sum, row) => sum + number(row, "llm_tokens_used"), 0),
      todayGpuSeconds: todayRows.reduce((sum, row) => sum + number(row, "gpu_seconds_used"), 0),
      blockedRuns: todayRows.filter((row) => text(row, "decision") === "block").length,
      cacheHits: todayRows.filter((row) => text(row, "decision") === "reuse").length,
    },
  }
}

export async function recordGenerationQualityReview(input: GenerationQualityReviewInput, principal: SalesApiPrincipal) {
  const { data, error } = await database().from(DB_TABLES.VIDEO_FACTORY_GENERATION_QUALITY_REVIEWS).insert({
    run_id: input.runId, identity_score: input.identityScore, motion_score: input.motionScore,
    prompt_score: input.promptScore, artifact_score: input.artifactScore, audio_score: input.audioScore,
    commercial_score: input.commercialScore, approved: input.approved, reviewer: principal.key, note: input.note,
  }).select("*").single()
  if (error) throw new Error(`Video generation quality review failed: ${error.message}`)
  return qualityFrom(record(data))
}

export async function reserveGenerationRun(input: GenerationPreflightInput, principal: SalesApiPrincipal) {
  const { data, error } = await database().rpc("video_factory_reserve_generation_run", {
    p_idempotency_key: input.idempotencyKey, p_content_hash: input.contentHash, p_project_id: input.projectId,
    p_shot_kind: input.shotKind, p_quality_tier: input.qualityTier, p_requested_provider: input.requestedProvider,
    p_estimated_cost_cents: input.estimatedCostCents, p_estimated_llm_tokens: input.estimatedLlmTokens,
    p_estimated_gpu_seconds: input.estimatedGpuSeconds, p_requested_by: principal.key,
  })
  if (error) throw new Error(`Video generation preflight failed: ${error.message}`)
  return record(data)
}

export async function updateGenerationPolicy(input: GenerationPolicyInput, principal: SalesApiPrincipal) {
  const { data, error } = await database().from(DB_TABLES.VIDEO_FACTORY_GENERATION_POLICIES).update({
    enabled: input.enabled, daily_budget_cents: input.dailyBudgetCents, per_run_budget_cents: input.perRunBudgetCents,
    per_run_llm_token_limit: input.perRunLlmTokenLimit, per_run_gpu_seconds_limit: input.perRunGpuSecondsLimit,
    max_attempts: input.maxAttempts, circuit_failure_threshold: input.circuitFailureThreshold,
    circuit_cooldown_minutes: input.circuitCooldownMinutes, reservation_ttl_minutes: input.reservationTtlMinutes,
    updated_by: principal.key, updated_at: new Date().toISOString(),
  }).eq("id", "studio-default").select("*").single()
  if (error) throw new Error(`Video generation policy update failed: ${error.message}`)
  return policyFrom(record(data))
}
