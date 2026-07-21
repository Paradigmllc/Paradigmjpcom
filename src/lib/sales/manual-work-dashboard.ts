import type { ManualJapanEntryWorkRow, ManualWorkStatus } from "./manual-japan-entry-types"

export type ManualWorkHistoryFilter = "all" | "action_required" | "completed" | "sent" | "failed"

export interface ManualWorkDashboardSummary {
  total: number
  actionRequired: number
  completed: number
  formReady: number
  manuallySent: number
  meetings: number
}

const FAILURE_STATUSES: ManualWorkStatus[] = ["failed", "rejected"]

export function summarizeManualWorkDashboard(items: ManualJapanEntryWorkRow[]): ManualWorkDashboardSummary {
  return items.reduce<ManualWorkDashboardSummary>((summary, item) => {
    summary.total += 1
    if (item.status === "needs_review") summary.actionRequired += 1
    if (item.twenty_sync_status === "synced" || item.twenty_sync_status === "duplicate") summary.completed += 1
    if (item.form_url) summary.formReady += 1
    if (item.manually_sent_at) summary.manuallySent += 1
    if (item.meeting_converted_at) summary.meetings += 1
    return summary
  }, { total: 0, actionRequired: 0, completed: 0, formReady: 0, manuallySent: 0, meetings: 0 })
}

export function filterManualWorkItems(
  items: ManualJapanEntryWorkRow[],
  filter: ManualWorkHistoryFilter,
  query: string,
): ManualJapanEntryWorkRow[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  return items.filter((item) => {
    const matchesFilter = filter === "all"
      || (filter === "action_required" && item.status === "needs_review")
      || (filter === "completed" && (item.twenty_sync_status === "synced" || item.twenty_sync_status === "duplicate"))
      || (filter === "sent" && Boolean(item.manually_sent_at))
      || (filter === "failed" && FAILURE_STATUSES.includes(item.status))
    if (!matchesFilter) return false
    if (!normalizedQuery) return true
    return [item.company_name, item.domain, item.country_code, item.form_url]
      .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery))
  })
}
