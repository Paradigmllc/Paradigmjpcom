import { redirect } from "next/navigation"
import { ManualJapanEntryWorkConsole } from "@/components/work/ManualJapanEntryWorkConsole"
import { isCurrentRequestAdmin } from "@/lib/admin-page-auth"
import { getManualWorkDashboardSummary, listManualJapanEntryWorkPage, listManualLeadSourceCatalog, listManualWorkAngleMetrics, listManualWorkExperimentMetrics } from "@/lib/sales/manual-japan-entry-store"
import { summarizeManualWorkExperiment, type ManualExperimentMetric } from "@/lib/sales/manual-japan-entry-experiment"
import { summarizeManualWorkAngles, type ManualAngleMetric } from "@/lib/sales/manual-japan-entry-angle"
import type { ManualJapanEntryWorkRow } from "@/lib/sales/manual-japan-entry-types"
import type { ManualLeadSourceCatalogRow } from "@/lib/sales/manual-japan-entry-source-ledger"
import { summarizeManualWorkDashboard, type ManualWorkDashboardSummary } from "@/lib/sales/manual-work-dashboard"

export const dynamic = "force-dynamic"

export default async function ManualJapanEntryWorkPage() {
  if (!(await isCurrentRequestAdmin())) redirect("/admin/login?redirect=%2Fwork")
  let items: ManualJapanEntryWorkRow[] = []
  let metrics: ManualExperimentMetric[] = summarizeManualWorkExperiment([])
  let angleMetrics: ManualAngleMetric[] = summarizeManualWorkAngles([])
  let sources: ManualLeadSourceCatalogRow[] = []
  let historyTotal = 0
  let summary: ManualWorkDashboardSummary = summarizeManualWorkDashboard([])
  let initialHistoryError: string | null = null
  try {
    const [history, loadedSummary, loadedMetrics, loadedAngleMetrics, loadedSources] = await Promise.all([
      listManualJapanEntryWorkPage({ pageSize: 100 }),
      getManualWorkDashboardSummary(),
      listManualWorkExperimentMetrics(),
      listManualWorkAngleMetrics(),
      listManualLeadSourceCatalog(),
    ])
    items = history.items
    historyTotal = history.total
    summary = loadedSummary
    metrics = loadedMetrics
    angleMetrics = loadedAngleMetrics
    sources = loadedSources
  } catch (error) {
    console.error("[work-page] initial history failed:", error)
    initialHistoryError = error instanceof Error ? error.message : "履歴を取得できませんでした"
  }
  return <ManualJapanEntryWorkConsole initialItems={items} initialHistoryTotal={historyTotal} initialSummary={summary} initialMetrics={metrics} initialAngleMetrics={angleMetrics} initialSources={sources} initialHistoryError={initialHistoryError} />
}
