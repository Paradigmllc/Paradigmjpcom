import { markLeadCandidateRunFailed, processLeadCandidateRun } from "./lead-candidate-runs"

const DEFAULT_VERIFY_BATCH = 120
const FALLBACK_RUN_MAX_ITERATIONS = 500
const MAX_CONCURRENT_FALLBACK_RUNS = 2
const activeFallbackRuns = new Set<string>()
const pendingFallbackRuns: string[] = []

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runLeadCandidateFallbackLoop(runId: string): Promise<void> {
  try {
    for (let iteration = 0; iteration < FALLBACK_RUN_MAX_ITERATIONS; iteration++) {
      const result = await processLeadCandidateRun(runId, { batchSize: DEFAULT_VERIFY_BATCH, maxBatches: 1 })
      if (!result.hasMore) return
      await sleep(1_000)
    }
    await markLeadCandidateRunFailed(runId, new Error(`fallback runner exceeded ${FALLBACK_RUN_MAX_ITERATIONS} iterations`))
  } catch (error) {
    console.error("[lead-candidate-runner] fallback runner failed:", runId, error)
    await markLeadCandidateRunFailed(runId, error).catch((markError) => {
      console.error("[lead-candidate-runner] failed to mark fallback run as failed:", runId, markError)
    })
  } finally {
    activeFallbackRuns.delete(runId)
    drainPendingFallbackRuns()
  }
}

function drainPendingFallbackRuns(): void {
  while (activeFallbackRuns.size < MAX_CONCURRENT_FALLBACK_RUNS) {
    const runId = pendingFallbackRuns.shift()
    if (!runId) return
    if (activeFallbackRuns.has(runId)) continue
    activeFallbackRuns.add(runId)
    setTimeout(() => {
      void runLeadCandidateFallbackLoop(runId)
    }, 0)
  }
}

export function startLeadCandidateRunFallback(runId: string): { started: boolean; alreadyRunning: boolean } {
  if (activeFallbackRuns.has(runId) || pendingFallbackRuns.includes(runId)) return { started: false, alreadyRunning: true }
  pendingFallbackRuns.push(runId)
  drainPendingFallbackRuns()
  return { started: true, alreadyRunning: false }
}
