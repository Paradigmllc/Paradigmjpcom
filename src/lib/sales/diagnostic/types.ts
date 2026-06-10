import type { Industry, ReportLocale, Severity, TemplateVariant } from "../types"
import type { SourceCoverageSnapshot } from "../source-coverage"
import type { CompanyIntelligence } from "../company-intelligence"
import type { SalesContentTemplate } from "../content-templates"

export interface DiagnosticAct {
  type: "pain" | "fear" | "hope"
  icon: string
  headline: string
  body: string
  metric_label: string
  metric_value: string
  metric_unit: string
  metric_bench: string
  severity: Severity
}

export interface DiagnosticReportData {
  company_name: string
  report_locale: ReportLocale
  target_country: string
  template_variant: TemplateVariant
  industry: Industry | null
  prefecture: string | null
  expires_at: string
  hook: string
  total_loss: string
  acts: DiagnosticAct[]
  cta_text: string
  video_thumbnail: string | null
  demo_url: string | null
  screenshot_url?: string | null
  source_coverage: SourceCoverageSnapshot
  intelligence: CompanyIntelligence
  meta?: Record<string, unknown>
  contactFormUrl?: string | null
  content_template: Pick<
    SalesContentTemplate,
    "title" | "purpose" | "quality_bar" | "dify_selection_rule" | "prompt_template" | "offer_code" | "appeal_angle"
  >
  report_url: string
  video_url?: string | null
}

export type CompanyMeta = {
  ssl?: { grade?: string; daysUntilExpiry?: number }
  mozilla_observatory?: { score?: number }
  tech?: { stack?: string[] }
  crtsh?: { total_certs?: number }
  dns?: { dmarc?: string }
  wayback_machine?: { years_active?: number }
  [key: string]: unknown
}

export type PersonalizedCopy = {
  personalized_hook?: string
  personalized_pain?: string
  personalized_fear?: string
  personalized_loss?: string
  personalized_cta?: string
}
