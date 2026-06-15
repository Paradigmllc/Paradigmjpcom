export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { startSalesPipelineWatchdog } = await import("@/lib/sales/sales-pipeline-watchdog")
  startSalesPipelineWatchdog()
}
