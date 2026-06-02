export type JsonRecord = Record<string, unknown>

export type JapanReadinessPriority = "high" | "medium" | "low"
export type JapanReadinessStatus = "draft" | "generated" | "manual_review" | "failed"

export interface JapanReadinessGap {
  type: "traffic" | "commerce" | "localization" | "payment" | "legal" | "creative"
  severity: number
  title: string
  detail: string
  evidenceRefs: string[]
  confidence: number
}

export interface JapanReadinessEvidence {
  id: string
  label: string
  value: string
  source: string
  confidence: number
}

export interface JapanReadinessInsightSummary {
  id: string
  companyId: string
  companyName: string | null
  domain: string | null
  status: JapanReadinessStatus
  priority: JapanReadinessPriority
  japanEntryScore: number
  trafficScore: number
  commerceScore: number
  localizationGapScore: number
  paymentGapScore: number
  legalGapScore: number
  creativeGapScore: number
  abilityToPayScore: number
  monthlyVisitsEstimate: number | null
  japanVisitsEstimate: number | null
  japanSharePercent: number | null
  estimatedMonthlyRevenueUsd: number | null
  lossAmountUsdMin: number | null
  lossAmountUsdMax: number | null
  confidence: number
  evidence: JapanReadinessEvidence[]
  gaps: JapanReadinessGap[]
  coldEmailSubject: string | null
  coldEmailBody: string | null
  manualReviewFlags: string[]
  modelName: string | null
  engine: string
  errorMessage: string | null
  generatedAt: string
  updatedAt: string
}

export interface JapanReadinessRow {
  id: string
  company_id: string
  status: JapanReadinessStatus
  priority: JapanReadinessPriority
  japan_entry_score: number
  traffic_score: number
  commerce_score: number
  localization_gap_score: number
  payment_gap_score: number
  legal_gap_score: number
  creative_gap_score: number
  ability_to_pay_score: number
  monthly_visits_estimate: number | null
  japan_visits_estimate: number | null
  japan_share_percent: number | null
  estimated_monthly_revenue_usd: number | null
  loss_amount_usd_min: number | null
  loss_amount_usd_max: number | null
  confidence: number
  evidence: unknown
  gaps: unknown
  dify_output: JsonRecord
  cold_email_subject: string | null
  cold_email_body: string | null
  manual_review_flags: string[] | null
  model_name: string | null
  engine: string
  error_message: string | null
  generated_at: string
  updated_at: string
  sales_companies?: { company_name?: string | null; domain?: string | null } | null
}

export function mapJapanReadinessRow(row: JapanReadinessRow): JapanReadinessInsightSummary {
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.sales_companies?.company_name ?? null,
    domain: row.sales_companies?.domain ?? null,
    status: row.status,
    priority: row.priority,
    japanEntryScore: row.japan_entry_score,
    trafficScore: row.traffic_score,
    commerceScore: row.commerce_score,
    localizationGapScore: row.localization_gap_score,
    paymentGapScore: row.payment_gap_score,
    legalGapScore: row.legal_gap_score,
    creativeGapScore: row.creative_gap_score,
    abilityToPayScore: row.ability_to_pay_score,
    monthlyVisitsEstimate: row.monthly_visits_estimate,
    japanVisitsEstimate: row.japan_visits_estimate,
    japanSharePercent: row.japan_share_percent,
    estimatedMonthlyRevenueUsd: row.estimated_monthly_revenue_usd,
    lossAmountUsdMin: row.loss_amount_usd_min,
    lossAmountUsdMax: row.loss_amount_usd_max,
    confidence: row.confidence,
    evidence: Array.isArray(row.evidence) ? (row.evidence as JapanReadinessEvidence[]) : [],
    gaps: Array.isArray(row.gaps) ? (row.gaps as JapanReadinessGap[]) : [],
    coldEmailSubject: row.cold_email_subject,
    coldEmailBody: row.cold_email_body,
    manualReviewFlags: row.manual_review_flags ?? [],
    modelName: row.model_name,
    engine: row.engine,
    errorMessage: row.error_message,
    generatedAt: row.generated_at,
    updatedAt: row.updated_at,
  }
}
