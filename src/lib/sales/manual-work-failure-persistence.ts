import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"
import { updateManualWork } from "./manual-japan-entry-store"
import { classifyManualWorkFailure } from "./manual-work-failure-policy"
import {
  buildLastGoodArtifactRestorePatch,
  type ManualWorkLastGoodArtifacts,
} from "./manual-work-last-good"

export async function failManualWork(
  item: ManualJapanEntryWorkRow,
  error: unknown,
  lastGoodArtifacts: ManualWorkLastGoodArtifacts | null,
): Promise<ManualJapanEntryWorkRow> {
  const disposition = classifyManualWorkFailure(item.stage, error)
  console.error("[manual-work] processing stopped:", {
    id: item.id,
    stage: item.stage,
    disposition: disposition.status,
    error,
  })
  return updateManualWork(
    item.id,
    lastGoodArtifacts
      ? buildLastGoodArtifactRestorePatch(lastGoodArtifacts, disposition.message)
      : {
          status: disposition.status,
          stage: disposition.stage,
          error_message: disposition.message,
          twenty_sync_status: "skipped",
        },
  )
}
