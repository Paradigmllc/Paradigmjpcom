import type { InfrastructureMigrationData } from "@/lib/sales/infrastructure"
import type { DashboardEnrichmentJob } from "@/lib/sales/enrichment-jobs"
import type { DashboardAgentTeam } from "@/lib/sales/agent-team"
import type { SalesIntegrationStatus } from "@/lib/sales/integration-registry"
import type { SalesVideoJob, VideoPipelineConfig } from "@/lib/sales/video-pipeline"
import type { SalesLocaleScope } from "@/lib/sales/locale-scope"
import type { SalesCrmSelectOption, SalesCrmViewField } from "@/lib/sales/crm-field-config"
import type { SourceAcquisitionSummary } from "@/lib/sales/source-acquisition"
import type { SalesLeadBatchSummary } from "@/lib/sales/monthly-batch"
import type { SearxngRunSummary } from "@/lib/sales/searxng-source"
import type { JapanReadinessInsightSummary } from "@/lib/sales/japan-readiness"
import type { DashboardSalesPipeline } from "@/lib/sales/sales-pipeline"

export interface SalesDashboardInput {
  reportLocale?: string | null
}

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
  lastEnrichedAt: string | null
  leadScore: number | null
  leadScoreTier: string | null
  contactFormUrl: string | null
  personalizedCopy: string | null
  formMessage: string | null
  formMessageEngine: string | null
  formMessageGeneratedAt: string | null
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
  slug:
    | "supabase"
    | "twenty"
    | "nocodb"
    | "appsmith"
    | "metabase"
    | "trigger_dev"
    | "calcom"
    | "docuseal"
    | "directus"
    | "keystatic"
    | "chatwoot"
    | "livekit"
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

export type DashboardAuditStatus = "ready" | "warning" | "blocked"

export interface DashboardAuditCheck {
  id: string
  label: string
  status: DashboardAuditStatus
  detail: string
  action: string
  count?: number
}

export interface DashboardAuditSection {
  id: string
  title: string
  summary: string
  checks: DashboardAuditCheck[]
}

export interface DashboardOperationalAudit {
  score: number
  status: DashboardAuditStatus
  blockers: number
  warnings: number
  ready: number
  sections: DashboardAuditSection[]
}

export interface DashboardContentTemplateCoverage {
  total: number
  byLocale: Record<string, number>
  byAssetType: Record<string, number>
  byIndustry: Record<string, number>
  fallbackUsed: boolean
}

export interface SalesDashboardData {
  scope: SalesLocaleScope
  status: SalesDashboardStatus
  generatedAt: string
  warnings: string[]
  kpis: DashboardKpis
  stageCounts: Record<string, number>
  pipelineCounts: Record<string, number>
  industryCounts: Record<string, number>
  issueCounts: Record<string, number>
  sourceCounts: Record<string, number>
  sourceAcquisition: SourceAcquisitionSummary
  leadBatches: SalesLeadBatchSummary[]
  searxngRuns: SearxngRunSummary[]
  japanReadinessInsights: JapanReadinessInsightSummary[]
  salesPipeline: DashboardSalesPipeline
  companies: DashboardCompany[]
  activities: DashboardActivity[]
  syncLogs: DashboardSyncLog[]
  toolConnections: DashboardToolConnection[]
  operatorQueue: DashboardQueueItem[]
  enrichmentJobs: DashboardEnrichmentJob[]
  infrastructure: InfrastructureMigrationData
  operationalAudit: DashboardOperationalAudit
  contentTemplates: DashboardContentTemplateCoverage
  crmFieldConfig: {
    fields: SalesCrmViewField[]
    options: SalesCrmSelectOption[]
    fallbackUsed: boolean
    error: string | null
  }
  agentTeam: DashboardAgentTeam
  integrationStatus: SalesIntegrationStatus[]
  videoPipeline: {
    jobs: SalesVideoJob[]
    config: VideoPipelineConfig
    error: string | null
  }
}
