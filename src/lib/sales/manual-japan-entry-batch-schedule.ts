import { after } from "next/server"
import { dispatchManualWorkBatchDrain } from "./manual-japan-entry-batch-drain"
import {
  clearManualWorkBatchDispatchError,
  promoteNextManualWorkBatch,
  recordManualWorkBatchDispatchError,
} from "./manual-japan-entry-batch-store"

const DISPATCH_RETRY_DELAYS_MS = [0, 500, 1_500] as const

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function dispatchWithRecovery(batchId: string): Promise<void> {
  let finalError = "Automatic drain dispatch failed"
  for (const delayMs of DISPATCH_RETRY_DELAYS_MS) {
    if (delayMs > 0) await wait(delayMs)
    const dispatched = await dispatchManualWorkBatchDrain(batchId)
    if (dispatched.ok) {
      try {
        await clearManualWorkBatchDispatchError(batchId)
      } catch (error) {
        console.error("[manual-work-batch-schedule] dispatch recovery state clear failed:", error)
      }
      return
    }
    finalError = dispatched.error ?? finalError
    console.error("[manual-work-batch-schedule] automatic drain dispatch failed:", finalError)
  }
  try {
    await recordManualWorkBatchDispatchError(batchId, finalError)
  } catch (error) {
    console.error("[manual-work-batch-schedule] dispatch error persistence failed:", error)
  }
}

export function scheduleManualWorkBatchDrain(batchId: string): void {
  after(async () => {
    await dispatchWithRecovery(batchId)
  })
}

export async function resumeManualWorkBatchQueue(): Promise<void> {
  const active = await promoteNextManualWorkBatch()
  if (!active) return
  await dispatchWithRecovery(active.snapshot.batch.id)
}
