import { redirect } from "next/navigation"
import { ManualJapanEntryWorkConsole } from "@/components/work/ManualJapanEntryWorkConsole"
import { isCurrentRequestAdmin } from "@/lib/admin-page-auth"
import { listManualJapanEntryWork, listManualWorkExperimentMetrics } from "@/lib/sales/manual-japan-entry-store"
import { summarizeManualWorkExperiment, type ManualExperimentMetric } from "@/lib/sales/manual-japan-entry-experiment"
import type { ManualJapanEntryWorkRow } from "@/lib/sales/manual-japan-entry-types"

export const dynamic = "force-dynamic"

export default async function ManualJapanEntryWorkPage() {
  if (!(await isCurrentRequestAdmin())) redirect("/admin/login")
  let items: ManualJapanEntryWorkRow[] = []
  let metrics: ManualExperimentMetric[] = summarizeManualWorkExperiment([])
  let initialHistoryError: string | null = null
  try {
    ;[items, metrics] = await Promise.all([
      listManualJapanEntryWork(100),
      listManualWorkExperimentMetrics(),
    ])
  } catch (error) {
    console.error("[work-page] initial history failed:", error)
    initialHistoryError = error instanceof Error ? error.message : "履歴を取得できませんでした"
  }
  return <ManualJapanEntryWorkConsole initialItems={items} initialMetrics={metrics} initialHistoryError={initialHistoryError} />
}
