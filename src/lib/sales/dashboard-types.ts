import type { InfrastructureMigrationData } from "@/lib/sales/infrastructure"
import type { DashboardEnrichmentJob } from "@/lib/sales/enrichment-jobs"

export type SalesDashboardStatus = "ready" | "degraded"

export interface DashboardKpis {
  totalLeads: number
  hotLeads: number
  scanning: number
  reportReady: number
  sent: number
  manualQueue: number
  followUpDue: number
  outreach7d: number
  meetings7d: number
  revenue30d: number
  mrr: number
  activeCustomers: number
}

export interface DashboardCompany {
  id: string
  region: string
  slug: string | null
  companyName: string
  domain: string
  industry: string | null
  prefecture: string | null
  pipelineStatus: string
  dealStage: string
  reportViews: number
  isHotLead: boolean
  pagespeedMobile: number | null
  pagespeedDesktop: number | null
  reportUrl: string | null
  followUpDate: string | null
  assignedTo: string | null
  source: string | null
  targetCountry: string | null
  reportLocale: string | null
  templateVariant: string | null
  updatedAt: string
  createdAt: string
  contactFormUrl: string | null
  personalizedCopy: string | null
}

export interface DashboardActivity {
  id: string
  companyId: string | null
  activityType: string
  subject: string | null
  result: string | null
  assignedTo: string | null
  occurredAt: string
}

export interface DashboardSyncLog {
  id: string
  direction: string
  entityType: string
  action: string
  status: string
  errorMessage: string | null
  createdAt: string
}

export interface DashboardToolConnection {
  slug: "supabase" | "twenty" | "nocodb" | "appsmith" | "metabase" | "notion" | "n8n"
  displayName: string
  role: string
  interfaceType: string
  deploymentType: string
  status: string
  baseUrl: string | null
  healthUrl: string | null
  owner: string | null
  lastCheckedAt: string | null
}

export interface DashboardQueueItem {
  id: string
  companyId: string | null
  companyName: string | null
  queueType: string
  priority: number
  status: string
  assignedTo: string | null
  sourceTool: string | null
  targetTool: string | null
  dueAt: string | null
  createdAt: string
}

export interface SalesDashboardData {
  status: SalesDashboardStatus
  generatedAt: string
  warnings: string[]
  kpis: DashboardKpis
  stageCounts: Record<string, number>
  pipelineCounts: Record<string, number>
  industryCounts: Record<string, number>
  issueCounts: Record<string, number>
  sourceCounts: Record<string, number>
  companies: DashboardCompany[]
  activities: DashboardActivity[]
  syncLogs: DashboardSyncLog[]
  toolConnections: DashboardToolConnection[]
  operatorQueue: DashboardQueueItem[]
  enrichmentJobs: DashboardEnrichmentJob[]
  infrastructure: InfrastructureMigrationData
}
