import type { getServiceSalesSupabase } from "@/lib/supabase"
import type { CompanyKarteSnapshot } from "@/lib/sales/company-karte"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { insertWithOptionalColumns } from "@/lib/sales/safe-supabase-insert"

export type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>
export type JsonRecord = Record<string, unknown>

export type ExternalStudioTarget = "twenty" | "directus" | "keystatic"

export interface ExternalStudioTargetResult {
  target: ExternalStudioTarget
  direction: string
  ok: boolean
  configured: boolean
  status: "success" | "error" | "skipped"
  message: string
  externalId?: string | null
  externalUrl?: string | null
  details?: JsonRecord
}

export interface ExternalStudioSyncResult {
  ok: boolean
  companyId: string
  companyName: string
  domain: string
  results: ExternalStudioTargetResult[]
}

export interface DirectusItem {
  id?: string | number | null
  url?: string | null
  report_url?: string | null
  demo_url?: string | null
  sales_material_url?: string | null
  payload?: unknown
}

export interface DirectusResponse<T> {
  data?: T
}

export function env(name: string): string | null {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "")
}

export function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null
}

export function stringFrom(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export function externalIdFrom(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return null
}

export function extractExternalUrl(value: unknown): string | null {
  const record = asRecord(value)
  if (!record) return null
  return (
    stringFrom(record.url) ??
    stringFrom(record.report_url) ??
    stringFrom(record.demo_url) ??
    stringFrom(record.sales_material_url) ??
    stringFrom(record.asset_url) ??
    stringFrom(record.public_url) ??
    null
  )
}

export function buildExternalStudioPayload(karte: CompanyKarteSnapshot): JsonRecord {
  return {
    source: "revenue_os",
    company_id: karte.companyId,
    company_name: karte.companyName,
    domain: karte.domain,
    industry: karte.industry,
    region: karte.region,
    report_locale: karte.reportLocale,
    target_country: karte.targetCountry,
    template_variant: karte.templateVariant,
    title: `${karte.companyName} 営業診断パッケージ`,
    status: "ready",
    report_url: karte.reportUrl,
    opportunity_brief_url: karte.opportunityBriefUrl,
    form_url: karte.formUrl,
    demo_url: karte.demoUrl,
    sales_material_url: karte.salesMaterialUrl,
    customer_portal_url: karte.customerPortalUrl,
    source_score: karte.sourceScore,
    source_coverage: {
      collected: karte.collectedCount,
      configured: karte.configuredCount,
      missing: karte.missingCount,
    },
    recommended_products: karte.recommendedProducts.map((product) => ({
      code: product.code,
      display_name: product.displayName,
      fit_score: product.fitScore,
      default_currency: product.defaultCurrency,
      default_amount_yen: product.defaultAmountYen,
      is_subscription: product.isSubscription,
      twenty_opportunity_id: product.twentyOpportunityId,
    })),
    diagnosis_summary: karte.diagnosisSummary,
    recommended_offer: karte.recommendedOffer,
    localized_report_urls: karte.localizedReportUrls,
    evidence: karte.evidence,
    generated_at: karte.generatedAt,
    payload_version: 1,
  }
}

export async function logSync(sb: ServiceSupabase, row: {
  direction: string
  entityId: string
  pipelineRunId?: string | null
  action: string
  status: "success" | "error" | "skipped"
  errorMessage?: string | null
  payload?: JsonRecord
}) {
  const { error } = await insertWithOptionalColumns(sb, DB_TABLES.SALES_SYNC_LOGS, {
    direction: row.direction,
    entity_type: "company",
    entity_id: row.entityId,
    pipeline_run_id: row.pipelineRunId ?? null,
    action: row.action,
    status: row.status,
    error_message: row.errorMessage ?? null,
    payload: row.payload ?? null,
  }, ["pipeline_run_id"])
  if (error) console.error("[external-studio-sync] sync log insert failed:", error.message)
}

export async function updateCompanyExternalMeta(
  sb: ServiceSupabase,
  companyId: string,
  target: ExternalStudioTarget,
  patch: JsonRecord,
) {
  const { data, error } = await sb.from(DB_TABLES.SALES_COMPANIES).select("meta").eq("id", companyId).maybeSingle()
  if (error) {
    console.error("[external-studio-sync] updateCompanyExternalMeta select failed:", error.message)
    throw new Error(error.message)
  }

  const currentMeta = asRecord(data?.meta) ?? {}
  const currentStudios = asRecord(currentMeta.external_studios) ?? {}
  const nextMeta: JsonRecord = {
    ...currentMeta,
    external_studios: {
      ...currentStudios,
      [target]: {
        ...(asRecord(currentStudios[target]) ?? {}),
        ...patch,
        last_synced_at: new Date().toISOString(),
      },
    },
  }

  const nextDemo = asRecord(patch.demo_site)
  if (nextDemo) nextMeta.demo_site = { ...(asRecord(currentMeta.demo_site) ?? {}), ...nextDemo }
  const salesMaterialUrl = stringFrom(patch.sales_material_url)
  if (salesMaterialUrl) nextMeta.sales_material_url = salesMaterialUrl

  const { error: updateError } = await sb.from(DB_TABLES.SALES_COMPANIES).update({ meta: nextMeta }).eq("id", companyId)
  if (updateError) {
    console.error("[external-studio-sync] updateCompanyExternalMeta update failed:", updateError.message)
    throw new Error(updateError.message)
  }
}

export function normalizeTargets(targets: ExternalStudioTarget[] | undefined): ExternalStudioTarget[] {
  if (!targets || targets.length === 0) return ["twenty", "directus", "keystatic"]
  const unique = new Set<ExternalStudioTarget>()
  for (const target of targets) unique.add(target)
  return [...unique]
}
