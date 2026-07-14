export const DEMO_BATCH_MAX_ITEMS = 300
export const DEMO_BATCH_ENQUEUE_CONCURRENCY = 8
export const DEMO_BATCH_DISPLAY_LIMIT = 300

export type DemoBatchJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled"

export interface DemoBatchWaveJob {
  status: string
  result_payload?: Record<string, unknown> | null
}

export interface DemoBatchWaveSummary {
  total: number
  queued: number
  running: number
  completed: number
  failed: number
  cancelled: number
  qualityPassed: number
  finished: number
  progressPercent: number
}

function qualityPassed(job: DemoBatchWaveJob): boolean {
  const report = job.result_payload?.quality_report
  return Boolean(
    report
    && typeof report === "object"
    && !Array.isArray(report)
    && (report as Record<string, unknown>).passed === true,
  )
}

export function summarizeDemoBatchWave(jobs: DemoBatchWaveJob[]): DemoBatchWaveSummary {
  const counts: Record<DemoBatchJobStatus, number> = {
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  }
  for (const job of jobs) {
    if (job.status in counts) counts[job.status as DemoBatchJobStatus]++
  }
  const finished = counts.completed + counts.failed + counts.cancelled
  return {
    total: jobs.length,
    ...counts,
    qualityPassed: jobs.filter(qualityPassed).length,
    finished,
    progressPercent: jobs.length > 0 ? Math.round((finished / jobs.length) * 100) : 0,
  }
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  const safeConcurrency = Math.max(1, Math.min(Math.floor(concurrency), items.length || 1))
  let nextIndex = 0

  await Promise.all(Array.from({ length: safeConcurrency }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await worker(items[index], index)
    }
  }))

  return results
}

export function chunkDemoBatch<T>(items: readonly T[], size: number): T[][] {
  const safeSize = Math.max(1, Math.floor(size))
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += safeSize) {
    chunks.push(items.slice(index, index + safeSize))
  }
  return chunks
}
