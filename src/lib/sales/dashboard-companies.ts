import { getServiceSalesSupabase } from "@/lib/supabase"
import type { DashboardCompany } from "@/lib/sales/dashboard-types"
import type { SalesLocaleScope } from "@/lib/sales/locale-scope"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

export interface SalesCompanyRow {
  id: string
  region: string | null
  slug: string | null
  company_name: string
  domain: string
  industry: string | null
  prefecture: string | null
  pipeline_status: string
  deal_stage: string
  report_views: number | null
  is_hot_lead: boolean | null
  pagespeed_mobile: number | null
  pagespeed_desktop: number | null
  report_url: string | null
  follow_up_date: string | null
  assigned_to: string | null
  source: string | null
  target_country?: string | null
  report_locale?: string | null
  template_variant?: string | null
  detected_issues: string[] | null
  meta: JsonRecord | null
  updated_at: string
  created_at: string
}

const COMPANY_SELECT_FULL =
  "id, region, slug, company_name, domain, industry, prefecture, pipeline_status, deal_stage, report_views, is_hot_lead, pagespeed_mobile, pagespeed_desktop, report_url, follow_up_date, assigned_to, source, target_country, report_locale, template_variant, detected_issues, meta, updated_at, created_at"

const COMPANY_SELECT_LEGACY =
  "id, region, slug, company_name, domain, industry, prefecture, pipeline_status, deal_stage, report_views, is_hot_lead, pagespeed_mobile, pagespeed_desktop, report_url, follow_up_date, assigned_to, source, detected_issues, meta, updated_at, created_at"

function extractString(meta: JsonRecord | null, path: string[]): string | null {
  let cursor: unknown = meta
  for (const key of path) {
    if (!cursor || typeof cursor !== "object") return null
    cursor = (cursor as JsonRecord)[key]
  }
  return typeof cursor === "string" && cursor.trim() ? cursor : null
}

export function mapCompany(row: SalesCompanyRow): DashboardCompany {
  return {
    id: row.id,
    region: row.region ?? "jp",
    slug: row.slug,
    companyName: row.company_name,
    domain: row.domain,
    industry: row.industry,
    prefecture: row.prefecture,
    pipelineStatus: row.pipeline_status,
    dealStage: row.deal_stage,
    reportViews: row.report_views ?? 0,
    isHotLead: row.is_hot_lead ?? false,
    pagespeedMobile: row.pagespeed_mobile,
    pagespeedDesktop: row.pagespeed_desktop,
    reportUrl: row.report_url,
    followUpDate: row.follow_up_date,
    assignedTo: row.assigned_to,
    source: row.source,
    targetCountry: row.target_country ?? extractString(row.meta, ["routing", "target_country"]),
    reportLocale: row.report_locale ?? extractString(row.meta, ["routing", "report_locale"]),
    templateVariant: row.template_variant ?? extractString(row.meta, ["routing", "template_variant"]),
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    lastEnrichedAt: extractString(row.meta, ["sales_os", "last_enriched_at"]),
    leadScore: null,
    leadScoreTier: null,
    contactFormUrl: extractString(row.meta, ["contact_form_url"]) ?? extractString(row.meta, ["discovery", "contact_form_url"]),
    personalizedCopy:
      extractString(row.meta, ["personalized_copy", "personalized_hook"]) ??
      extractString(row.meta, ["pain_diagnosis", "primaryPain"]) ??
      extractString(row.meta, ["personalized_copy", "opening"]),
    formMessage: extractString(row.meta, ["form_message"]),
    formMessageEngine: extractString(row.meta, ["form_message_engine"]),
    formMessageGeneratedAt: extractString(row.meta, ["form_message_generated_at"]),
  }
}

export async function fetchDashboardCompanies(sb: ServiceSupabase, scope: SalesLocaleScope) {
  const full = await sb
    .from("sales_companies")
    .select(COMPANY_SELECT_FULL)
    .eq("report_locale", scope.reportLocale)
    .order("updated_at", { ascending: false })
    .limit(200)

  const missingRoutingColumns =
    full.error &&
    /target_country|report_locale|template_variant|schema cache|column/i.test(full.error.message)

  if (missingRoutingColumns) {
    console.warn("[dashboard-companies] routing columns missing, falling back to legacy query:", full.error.message)
  }

  if (!missingRoutingColumns) return full

  const legacy = await sb
    .from("sales_companies")
    .select(COMPANY_SELECT_LEGACY)
    .eq("region", scope.region)
    .order("updated_at", { ascending: false })
    .limit(200)

  return legacy.error ? full : legacy
}
