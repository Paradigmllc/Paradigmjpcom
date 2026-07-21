export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  // Permanent infra rule: do not start cron-like watchdog loops from app boot.
  // These two bounded startup events recover both an immediately open queue and a
  // drain lease left by a terminated process. They are not a periodic watchdog.
  for (const delayMs of [3_000, 370_000] as const) {
    setTimeout(() => {
      void import("@/lib/sales/manual-japan-entry-batch-schedule")
        .then(({ resumeManualWorkBatchQueue }) => resumeManualWorkBatchQueue())
        .catch((error: unknown) => {
          console.error("[instrumentation] manual work queue startup recovery failed:", error)
        })
    }, delayMs)
  }
}
