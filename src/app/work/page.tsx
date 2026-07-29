import { redirect } from "next/navigation"
import { ManualJapanEntryWorkConsole } from "@/components/work/ManualJapanEntryWorkConsole"
import { isCurrentRequestAdmin } from "@/lib/admin-page-auth"
import {
  getManualWorkDashboardSummary,
  listManualJapanEntryWorkPage,
  listManualLeadSourceCatalog,
} from "@/lib/sales/manual-japan-entry-store"
import type { ManualJapanEntryWorkRow } from "@/lib/sales/manual-japan-entry-types"
import type { ManualLeadSourceCatalogRow } from "@/lib/sales/manual-japan-entry-source-ledger"
import { summarizeManualWorkDashboard, type ManualWorkDashboardSummary } from "@/lib/sales/manual-work-dashboard"

export const dynamic = "force-dynamic"

export default async function ManualJapanEntryWorkPage() {
  if (!(await isCurrentRequestAdmin())) redirect("/admin/login?redirect=%2Fwork")
  let items: ManualJapanEntryWorkRow[] = []
  let sources: ManualLeadSourceCatalogRow[] = []
  let historyTotal = 0
  let summary: ManualWorkDashboardSummary = summarizeManualWorkDashboard([])
  let initialHistoryError: string | null = null
  try {
    const [history, loadedSummary, loadedSources] = await Promise.all([
      listManualJapanEntryWorkPage({ pageSize: 100 }),
      getManualWorkDashboardSummary(),
      listManualLeadSourceCatalog(),
    ])
    items = history.items
    historyTotal = history.total
    summary = loadedSummary
    sources = loadedSources
  } catch (error) {
    console.error("[work-page] initial history failed:", error)
    initialHistoryError = error instanceof Error ? error.message : "履歴を取得できませんでした"
  }
  return <ManualJapanEntryWorkConsole
    initialItems={items}
    initialHistoryTotal={historyTotal}
    initialSummary={summary}
    initialSources={sources}
    initialHistoryError={initialHistoryError}
  />
}
