import { getServiceSalesSupabase } from "@/lib/supabase"
import { upsertCompanyByDomain } from "@/lib/sales/companies"
import { salesScopeFromCountry } from "@/lib/sales/locale-scope"
import { ensureTwentyPipelineRun } from "./twenty-pipeline-intake"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { insertWithOptionalColumns } from "@/lib/sales/safe-supabase-insert"
import { buildCompanySlug, buildReportUrl, normalizeReportLocale, normalizeTargetCountry, normalizeTemplateVariant } from "./routing"
import { PIPELINE_LABELS } from "./twenty-sync-utils"

interface TwentyLinkField {
  primaryLinkUrl?: string | null
  primaryLinkLabel?: string | null
}

interface TwentyRecord {
  id?: string
  name?: string
  domainName?: TwentyLinkField | null
  paradigmReportUrl?: TwentyLinkField | null
  paradigmFormUrl?: TwentyLinkField | null
  paradigmCustomerPortalUrl?: TwentyLinkField | null
  paradigmSalesMaterialUrl?: TwentyLinkField | null
  paradigmDemoUrl?: TwentyLinkField | null
  paradigmCountryName?: string | null
  paradigmRegionName?: string | null
  paradigmIndustryName?: string | null
  paradigmSourceName?: string | null
  paradigmSalesStatus?: string | null
  paradigmKarteScore?: number | null
  paradigmSourceCoverage?: number | null
  paradigmRecommendedProducts?: string[] | null
  paradigmKarteSummary?: {
    markdown?: string | null
  } | null
}

interface TwentyListResponse<T> {
  data?: {
    companies?: T[]
  }
}

export interface TwentyPullResult {
  ok: boolean
  configured: boolean
  dryRun: boolean
  scanned: number
  created: number
  updated: number
  skipped: number
  pipelineRunsCreated: number
  pipelineRunsDispatched: number
  pipelineRunsReused: number
  failures?: { twentyCompanyId: string | null; domain: string | null; reason: string }[]
  error?: string
}

export interface TwentyPullOptions {
  pipelineRunId?: string | null
  autoRunPipeline?: boolean
  dispatchPipeline?: boolean
  requireVideo?: boolean
  autoSyncExternalStudios?: boolean
  requestedBy?: string
  dryRun?: boolean
}

function env(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

function twentyBaseUrl(): string | null {
  const base = env("TWENTY_BASE_URL")
  return base ? base.replace(/\/$/, "") : null
}

function normalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null
  try {
    const withProto = input.startsWith("http") ? input : `https://${input}`
    return new URL(withProto).hostname.replace(/^www\./, "").toLowerCase()
  } catch (error) {
    console.warn("[twenty-pull] invalid domain:", { input, error })
    return null
  }
}

async function twentyFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const baseUrl = twentyBaseUrl()
  const apiKey = env("TWENTY_API_KEY")
  if (!baseUrl || !apiKey) return { ok: false, error: "TWENTY_BASE_URL or TWENTY_API_KEY is not configured" }

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })

  const text = await res.text()
  if (!res.ok) return { ok: false, error: text || `Twenty API HTTP ${res.status}` }

  try {
    return { ok: true, data: JSON.parse(text) as T }
  } catch (error) {
    console.error("[twenty-pull] invalid JSON response:", error)
    return { ok: false, error: "Twenty API returned invalid JSON" }
  }
}

function emptyResult(input: { configured: boolean; dryRun: boolean; error?: string }): TwentyPullResult {
  return {
    ok: false,
    configured: input.configured,
    dryRun: input.dryRun,
    scanned: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    pipelineRunsCreated: 0,
    pipelineRunsDispatched: 0,
    pipelineRunsReused: 0,
    error: input.error,
  }
}

function plainRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function countryCodeFromTwentyRecord(record: TwentyRecord): string | null {
  const raw = record.paradigmCountryName?.trim()
  if (!raw) return null
  const upper = raw.toUpperCase()
  if (/^[A-Z]{2}$/.test(upper)) return upper

  const byLabel: Record<string, string> = {
    JAPAN: "JP",
    "日本": "JP",
    UNITED_STATES: "US",
    "UNITED STATES": "US",
    USA: "US",
    KOREA: "KR",
    "SOUTH KOREA": "KR",
    CHINA: "CN",
    TAIWAN: "TW",
    GERMANY: "DE",
    FRANCE: "FR",
    SPAIN: "ES",
    PORTUGAL: "PT",
    BRAZIL: "BR",
    RUSSIA: "RU",
    UAE: "AE",
    "UNITED ARAB EMIRATES": "AE",
    VIETNAM: "VN",
    INDONESIA: "ID",
  }
  return byLabel[upper] ?? null
}

function contactFormUrlFromMeta(meta: Record<string, unknown>): string | null {
  const value = meta.contact_form_url
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function parseSalesStatusLabel(label: string | null): { pipelineStatus?: string; dealStage?: string } {
  if (!label) return {}
  const parts = label.split(" / ")
  const pipelineLabel = parts[0]?.trim()
  const dealStage = parts[1]?.trim()
  // Reverse-map from Japanese/English display labels back to pipeline_status codes
  // Uses the same PIPELINE_LABELS reverse mapping as twenty-sync-utils.ts
  const pipelineStatus = pipelineLabel
    ? Object.entries(PIPELINE_LABELS).find(([, translated]) => translated.startsWith(pipelineLabel ?? ""))?.[0] ?? pipelineLabel
    : undefined
  return {
    ...(pipelineStatus ? { pipelineStatus } : {}),
    ...(dealStage ? { dealStage } : {}),
  }
}

export async function pullTwentyCompaniesToSupabase(
  limit = 200,
  options: TwentyPullOptions = {},
): Promise<TwentyPullResult> {
  const isDryRun = options.dryRun === true
  const baseUrl = twentyBaseUrl()
  const apiKey = env("TWENTY_API_KEY")
  if (!baseUrl || !apiKey) {
    return emptyResult({
      configured: false,
      dryRun: isDryRun,
      error: "TWENTY_BASE_URL or TWENTY_API_KEY is not configured",
    })
  }

  const sb = getServiceSalesSupabase()
  if (!sb) {
    return emptyResult({
      configured: true,
      dryRun: isDryRun,
      error: "Supabase service_role not configured",
    })
  }

  const safeLimit = Math.min(Math.max(limit, 1), 500)
  const result = await twentyFetch<TwentyListResponse<TwentyRecord>>(`/rest/companies?limit=${safeLimit}`)
  if (!result.ok) return emptyResult({ configured: true, dryRun: isDryRun, error: result.error })

  const records = result.data.data?.companies ?? []
  const shouldAutoRunPipeline = options.autoRunPipeline === true
  const shouldDispatchPipeline = options.dispatchPipeline !== false
  const failures: NonNullable<TwentyPullResult["failures"]> = []
  let created = 0
  let updated = 0
  let skipped = 0
  let pipelineRunsCreated = 0
  let pipelineRunsDispatched = 0
  let pipelineRunsReused = 0

  for (const record of records) {
    const domain =
      normalizeDomain(record.domainName?.primaryLinkUrl) ??
      normalizeDomain(record.domainName?.primaryLinkLabel)
    if (!domain) {
      skipped += 1
      failures.push({ twentyCompanyId: record.id ?? null, domain: null, reason: "domainName is missing or invalid" })
      continue
    }

    const { data: company, error: findError } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("id, slug, report_locale, target_country, template_variant, meta, pipeline_status, report_url")
      .eq("domain", domain)
      .maybeSingle()

    if (findError) {
      console.error("[twenty-pull] Supabase company lookup failed:", findError.message)
      skipped += 1
      failures.push({ twentyCompanyId: record.id ?? null, domain, reason: findError.message })
      continue
    }

    const currentMeta = plainRecord(company?.meta)
    const reportUrl = record.paradigmReportUrl?.primaryLinkUrl ?? null
    const formUrl = record.paradigmFormUrl?.primaryLinkUrl ?? null
    const salesMaterialUrl = record.paradigmSalesMaterialUrl?.primaryLinkUrl ?? null
    const demoUrl = record.paradigmDemoUrl?.primaryLinkUrl ?? null
    const customerPortalUrl = record.paradigmCustomerPortalUrl?.primaryLinkUrl ?? null
    const patchMeta: Record<string, unknown> = {
      ...currentMeta,
      twenty: {
        ...plainRecord(currentMeta.twenty),
        id: record.id ?? null,
        lastPulledAt: new Date().toISOString(),
        countryName: record.paradigmCountryName ?? null,
        regionName: record.paradigmRegionName ?? null,
        industryName: record.paradigmIndustryName ?? null,
        sourceName: record.paradigmSourceName ?? null,
        salesStatus: record.paradigmSalesStatus ?? null,
        karteScore: record.paradigmKarteScore ?? null,
        sourceCoverage: record.paradigmSourceCoverage ?? null,
        recommendedProducts: record.paradigmRecommendedProducts ?? [],
        summary: record.paradigmKarteSummary?.markdown ?? null,
      },
    }
    if (formUrl) patchMeta.contact_form_url = formUrl
    if (salesMaterialUrl) patchMeta.sales_material_url = salesMaterialUrl
    if (demoUrl) patchMeta.demo_site = { ...plainRecord(currentMeta.demo_site), url: demoUrl }
    if (customerPortalUrl) patchMeta.customer_portal_url = customerPortalUrl

    let companyId = typeof company?.id === "string" ? company.id : null
    let companyReportUrl = typeof company?.report_url === "string" && company.report_url.trim() ? company.report_url : null
    let companyPipelineStatus = typeof company?.pipeline_status === "string" ? company.pipeline_status : null

    if (!companyId) {
      if (isDryRun) {
        created += 1
        if (shouldAutoRunPipeline) pipelineRunsCreated += 1
        continue
      }

      const scope = salesScopeFromCountry({ targetCountry: countryCodeFromTwentyRecord(record) })
      const upsert = await upsertCompanyByDomain({
        domain,
        company_name: record.name?.trim() || domain,
        region: scope.region,
        report_locale: scope.reportLocale,
        target_country: scope.targetCountry,
        template_variant: "website_diagnostic",
        pipeline_status: shouldAutoRunPipeline ? "scanning" : "pending",
        source: "twenty",
        meta: patchMeta,
      })

      if (!upsert.ok || !upsert.company) {
        skipped += 1
        failures.push({ twentyCompanyId: record.id ?? null, domain, reason: upsert.error ?? "company upsert failed" })
        continue
      }

      companyId = upsert.company.id
      companyReportUrl = upsert.company.report_url
      companyPipelineStatus = upsert.company.pipeline_status
      created += 1
    } else {
      // Ensure slug and routing fields exist (companies created before slug column may have NULL)
      const companyName = record.name?.trim() || domain
      const scope = salesScopeFromCountry({ targetCountry: countryCodeFromTwentyRecord(record) })
      const reportLocale = normalizeReportLocale(company?.report_locale ?? scope.reportLocale, scope.region)
      const targetCountry = normalizeTargetCountry(company?.target_country ?? scope.targetCountry, reportLocale)
      const templateVariant = normalizeTemplateVariant(company?.template_variant ?? "website_diagnostic")

      const patch: Record<string, unknown> = { meta: patchMeta }
      if (reportUrl) patch.report_url = reportUrl

      // Ensure every company has a slug — null slugs cause 404 on /report/[slug]
      if (!company?.slug) {
        const generatedSlug = buildCompanySlug(companyName, domain)
        patch.slug = generatedSlug
        patch.report_url = patch.report_url ?? buildReportUrl(reportLocale, generatedSlug)
        companyReportUrl = (patch.report_url as string) ?? companyReportUrl
      }

      // Backfill routing fields if missing
      if (!company?.report_locale) patch.report_locale = reportLocale
      if (!company?.target_country) patch.target_country = targetCountry
      if (!company?.template_variant) patch.template_variant = templateVariant

      if (record.paradigmSalesStatus) {
        const parsed = parseSalesStatusLabel(record.paradigmSalesStatus)
        if (parsed.pipelineStatus) patch.pipeline_status = parsed.pipelineStatus
        if (parsed.dealStage) patch.deal_stage = parsed.dealStage
        if (parsed.pipelineStatus) companyPipelineStatus = parsed.pipelineStatus
      }

      if (isDryRun) {
        updated += 1
      } else {
        const { error: updateError } = await sb.from(DB_TABLES.SALES_COMPANIES).update(patch).eq("id", companyId)
        if (updateError) {
          console.error("[twenty-pull] Supabase company update failed:", updateError.message)
          skipped += 1
          failures.push({ twentyCompanyId: record.id ?? null, domain, reason: updateError.message })
          continue
        }
        updated += 1
      }
    }

    if (isDryRun) {
      const effectiveReportUrl = reportUrl ?? companyReportUrl
      const effectiveFormUrl = formUrl ?? contactFormUrlFromMeta(patchMeta)
      const needsGeneration = !effectiveReportUrl || !effectiveFormUrl || companyPipelineStatus !== "report_ready"
      if (shouldAutoRunPipeline && needsGeneration && companyId) pipelineRunsCreated += 1
      continue
    }

    const { error: syncLogError } = await insertWithOptionalColumns(sb, DB_TABLES.SALES_SYNC_LOGS, {
      direction: "twenty->supabase",
      entity_type: "company",
      entity_id: companyId,
      pipeline_run_id: options.pipelineRunId ?? null,
      action: company ? "update" : "create",
      status: "success",
      payload: {
        twenty_company_id: record.id ?? null,
        domain,
        report_url: reportUrl,
        form_url: formUrl,
        sales_material_url: salesMaterialUrl,
        demo_url: demoUrl,
        customer_portal_url: customerPortalUrl,
      },
    }, ["pipeline_run_id"])
    if (syncLogError) console.error("[twenty-pull] sync log insert failed:", syncLogError.message)

    const effectiveReportUrl = reportUrl ?? companyReportUrl
    const effectiveFormUrl = formUrl ?? contactFormUrlFromMeta(patchMeta)
    const needsGeneration = !effectiveReportUrl || !effectiveFormUrl || companyPipelineStatus !== "report_ready"
    if (!shouldAutoRunPipeline || !needsGeneration) continue

    const pipeline = await ensureTwentyPipelineRun(sb, {
      companyId,
      record,
      domain,
      options,
      dispatch: shouldDispatchPipeline,
    })
    if (pipeline.reused) pipelineRunsReused += 1
    if (pipeline.created) pipelineRunsCreated += 1
    if (pipeline.dispatched) pipelineRunsDispatched += 1
    if (pipeline.error) failures.push({ twentyCompanyId: record.id ?? null, domain, reason: pipeline.error })
  }

  return {
    ok: true,
    configured: true,
    dryRun: isDryRun,
    scanned: records.length,
    created,
    updated,
    skipped,
    pipelineRunsCreated,
    pipelineRunsDispatched,
    pipelineRunsReused,
    failures: failures.slice(0, 20),
  }
}
