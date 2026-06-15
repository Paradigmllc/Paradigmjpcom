import { runEnrichmentJobs } from "./enrichment-jobs"

export function startLeadCandidateEnrichmentFallback(limit: number): void {
  setTimeout(async () => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const result = await runEnrichmentJobs(limit)
        if (result.processed === 0) break
      } catch (error) {
        console.error("[lead-candidate-runs] enrichment fallback failed:", error)
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 5_000))
    }
  }, 0)
}
