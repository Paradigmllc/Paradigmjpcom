import { after } from "next/server"
import { dispatchManualWorkBatchDrain } from "./manual-japan-entry-batch-drain"
import { recordManualWorkBatchDispatchError } from "./manual-japan-entry-batch-store"

export function scheduleManualWorkBatchDrain(batchId: string): void {
  after(async () => {
    const dispatched = await dispatchManualWorkBatchDrain(batchId)
    if (dispatched.ok) return
    console.error("[manual-work-batch-schedule] automatic drain dispatch failed:", dispatched.error)
    try {
      await recordManualWorkBatchDispatchError(batchId, dispatched.error ?? "Automatic drain dispatch failed")
    } catch (error) {
      console.error("[manual-work-batch-schedule] dispatch error persistence failed:", error)
    }
  })
}
