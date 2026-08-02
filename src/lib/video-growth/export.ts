import type { VideoGrowthDashboard } from "./types"
import { approvalForRevision } from "./workflow"

const HEADERS = [
  "campaign_id", "campaign_name", "client_name", "plan", "billing_status", "work_status",
  "delivery_due_at", "channel", "content_revision", "variant_status", "internal_quality",
  "client_release", "published_at", "publish_url", "impressions", "views", "clicks", "replies", "meetings",
] as const

function safeCell(value: string | number | null): string {
  let text = value === null ? "" : String(value)
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

export function videoGrowthDashboardToCsv(dashboard: VideoGrowthDashboard): string {
  const rows = dashboard.campaigns.flatMap((campaign) => campaign.variants.map((variant) => [
    campaign.id,
    campaign.name,
    campaign.workOrder?.clientName ?? "",
    campaign.workOrder?.plan ?? "",
    campaign.workOrder?.billingStatus ?? "",
    campaign.workOrder?.workStatus ?? "",
    campaign.workOrder?.deliveryDueAt ?? "",
    variant.channel,
    variant.contentRevision,
    variant.status,
    approvalForRevision(variant, "internal_quality")?.decision ?? "not_requested",
    approvalForRevision(variant, "client_release")?.decision ?? "not_requested",
    variant.publishedAt,
    variant.publishUrl,
    variant.impressions,
    variant.views,
    variant.clicks,
    variant.replies,
    variant.meetings,
  ]))
  return `\uFEFF${[HEADERS, ...rows].map((row) => row.map(safeCell).join(",")).join("\r\n")}\r\n`
}
