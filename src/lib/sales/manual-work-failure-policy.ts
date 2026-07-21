import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"

export interface ManualWorkFailureDisposition {
  status: "failed" | "rejected"
  stage: "failed" | "complete"
  message: string
}

const SOURCE_UNAVAILABLE = [
  "fetch failed",
  "timed out",
  "aborted due to timeout",
  "no public pages were available",
  "homepage evidence could not be reused",
] as const

export function classifyManualWorkFailure(
  stage: ManualJapanEntryWorkRow["stage"],
  error: unknown,
): ManualWorkFailureDisposition {
  const raw = error instanceof Error ? error.message : "Manual Japan Entry processing failed"
  const normalized = raw.toLowerCase()
  if (stage === "fetching") {
    if (normalized.includes("homepage returned http")) {
      return {
        status: "rejected",
        stage: "complete",
        message: "Public company website returned a terminal HTTP response after automatic recovery; excluded from outreach.",
      }
    }
    if (normalized.includes("did not provide enough grounded product context")) {
      return {
        status: "rejected",
        stage: "complete",
        message: "Public company website did not provide sufficient grounded product evidence; excluded from outreach.",
      }
    }
    if (SOURCE_UNAVAILABLE.some((phrase) => normalized.includes(phrase))) {
      return {
        status: "rejected",
        stage: "complete",
        message: "Public company website remained unreachable after automatic recovery; excluded from outreach.",
      }
    }
  }
  return {
    status: "failed",
    stage: "failed",
    message: raw.slice(0, 2_000),
  }
}
