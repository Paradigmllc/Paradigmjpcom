import { redirect } from "next/navigation"
import { ManualJapanEntryWorkConsole } from "@/components/work/ManualJapanEntryWorkConsole"
import { isCurrentRequestAdmin } from "@/lib/admin-page-auth"
import { listManualJapanEntryWork, listManualLeadSourceCatalog, listManualWorkAngleMetrics, listManualWorkExperimentMetrics } from "@/lib/sales/manual-japan-entry-store"
import { summarizeManualWorkExperiment, type ManualExperimentMetric } from "@/lib/sales/manual-japan-entry-experiment"
import { summarizeManualWorkAngles, type ManualAngleMetric } from "@/lib/sales/manual-japan-entry-angle"
import type { ManualJapanEntryWorkRow } from "@/lib/sales/manual-japan-entry-types"
import type { ManualLeadSourceCatalogRow } from "@/lib/sales/manual-japan-entry-source-ledger"

export const dynamic = "force-dynamic"

export default async function ManualJapanEntryWorkPage() {
  if (!(await isCurrentRequestAdmin())) redirect("/admin/login?redirect=%2Fwork")
  let items: ManualJapanEntryWorkRow[] = []
  let metrics: ManualExperimentMetric[] = summarizeManualWorkExperiment([])
  let angleMetrics: ManualAngleMetric[] = summarizeManualWorkAngles([])
  let sources: ManualLeadSourceCatalogRow[] = []
  let initialHistoryError: string | null = null
  try {
    ;[items, metrics, angleMetrics, sources] = await Promise.all([
      listManualJapanEntryWork(100),
      listManualWorkExperimentMetrics(),
      listManualWorkAngleMetrics(),
      listManualLeadSourceCatalog(),
    ])
  } catch (error) {
    console.error("[work-page] initial history failed:", error)
    initialHistoryError = error instanceof Error ? error.message : "履歴を取得できませんでした"
  }
  return <ManualJapanEntryWorkConsole initialItems={items} initialMetrics={metrics} initialAngleMetrics={angleMetrics} initialSources={sources} initialHistoryError={initialHistoryError} />
}
