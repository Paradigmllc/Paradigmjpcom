import { getServiceSalesSupabase } from "@/lib/supabase"
import { enqueueCompanyEnrichment } from "./enrichment-jobs"
import { upsertCompanyByDomain } from "./companies"
import { createSalesPipelineRun } from "./sales-pipeline"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { insertWithOptionalColumns } from "@/lib/sales/safe-supabase-insert"
import {
  env,
  twentyBaseUrl,
  normalizeDomain,
  twentyFetch,
  parseSalesStatusLabel,
  type TwentyRecord,
  type TwentyListResponse,
  type TwentyPullResult,
} from "./twenty-sync-utils"

export async function pullTwentyCompaniesToSupabase(
  limit = 200,
  options: { pipelineRunId?: string | null } = {},
): Promise<TwentyPullResult> {
  const baseUrl = twentyBaseUrl()
  const apiKey = env("TWENTY_API_KEY")
  if (!baseUrl || !apiKey) {
    return {
      ok: false,
      configured: false,
      scanned: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      pipelineRunsCreated: 0,
      failures: [],
      error: "TWENTY_BASE_URL or TWENTY_API_KEY is not configured",
    }
  }

  const sb = getServiceSalesSupabase()
  if (!sb) {
    return {
      ok: false,
      configured: true,
      scanned: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      pipelineRunsCreated: 0,
      failures: [],
      error: "Supabase service_role not configured",
    }
  }

  const safeLimit = Math.min(Math.max(limit, 1), 500)
  const result = await twentyFetch<TwentyListResponse<TwentyRecord>>(`/rest/companies?limit=${safeLimit}`)
  if (!result.ok) {
    return { ok: false, configured: true, scanned: 0, created: 0, updated: 0, skipped: 0, pipelineRunsCreated: 0, failures: [], error: result.error }
  }

  const records = result.data.data?.companies ?? []
  let created = 0
  let updated = 0
  let skipped = 0
  let pipelineRunsCreated = 0
  const failures: { domain: string; reason: string }[] = []

  for (const record of records) {
    const domain =
      normalizeDomain(record.domainName?.primaryLinkUrl) ??
      normalizeDomain(record.domainName?.primaryLinkLabel)
    if (!domain) {
      skipped += 1
      continue
    }

    const companyName = record.name?.trim()
    if (!companyName) {
      skipped += 1
      continue
    }

    const { data: company, error: findError } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .select("id, meta")
      .eq("domain", domain)
      .maybeSingle()

    if (findError) {
      console.error("[twenty-sync] Supabase company lookup failed:", findError.message)
      skipped += 1
      continue
    }

    // ── New company from Twenty: create in Supabase + enqueue enrichment ──
    if (!company?.id) {
      const createdResult = await upsertCompanyByDomain({
        domain,
        company_name: companyName,
        region: "jp",
        meta: {
          twenty: {
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
        },
      })

      if (!createdResult.ok || !createdResult.company) {
        failures.push({ domain, reason: createdResult.error ?? "failed to create company" })
        skipped += 1
        continue
      }

      const newCompany = createdResult.company
      created += 1

      // Enqueue automatic enrichment
      const enqueueResult = await enqueueCompanyEnrichment({
        companyId: newCompany.id,
        source: "twenty_csv_intake",
        triggeredBy: `pullTwentyCompaniesToSupabase:${options.pipelineRunId ?? "manual"}`,
        priority: 60,
      })

      if (!enqueueResult.ok) {
        console.error("[twenty-sync] enrichment enqueue failed:", enqueueResult.error)
        failures.push({ domain, reason: `enrichment enqueue failed: ${enqueueResult.error}` })
      }

      // Create pipeline run for tracking
      const pipelineResult = await createSalesPipelineRun({
        companyId: newCompany.id,
        source: "twenty_csv_intake",
        requireVideo: false,
      })

      if (pipelineResult.ok) {
        pipelineRunsCreated += 1
      } else {
        console.error("[twenty-sync] pipeline run creation failed:", pipelineResult.error)
      }

      await sb.from(DB_TABLES.SALES_SYNC_LOGS).insert({
        direction: "twenty->supabase",
        entity_type: "company",
        entity_id: newCompany.id,
        action: "create",
        status: "success",
        payload: { twenty_company_id: record.id ?? null, domain, company_name: companyName },
      })

      continue
    }

    const currentMeta = (company.meta ?? {}) as Record<string, unknown>
    const reportUrl = record.paradigmReportUrl?.primaryLinkUrl ?? null
    const formUrl = record.paradigmFormUrl?.primaryLinkUrl ?? null
    const salesMaterialUrl = record.paradigmSalesMaterialUrl?.primaryLinkUrl ?? null
    const demoUrl = record.paradigmDemoUrl?.primaryLinkUrl ?? null
    const customerPortalUrl = record.paradigmCustomerPortalUrl?.primaryLinkUrl ?? null
    const patchMeta: Record<string, unknown> = {
      ...currentMeta,
      twenty: {
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
    if (demoUrl) patchMeta.demo_site = { ...((currentMeta.demo_site as Record<string, unknown> | undefined) ?? {}), url: demoUrl }
    if (customerPortalUrl) patchMeta.customer_portal_url = customerPortalUrl

    const patch: Record<string, unknown> = { meta: patchMeta }
    if (reportUrl) patch.report_url = reportUrl

    // Reverse map the sales status from Twenty back to Supabase
    if (record.paradigmSalesStatus) {
      const parsed = parseSalesStatusLabel(record.paradigmSalesStatus)
      if (parsed.pipelineStatus) patch.pipeline_status = parsed.pipelineStatus
      if (parsed.dealStage) patch.deal_stage = parsed.dealStage
    }

    const { error: updateError } = await sb
      .from(DB_TABLES.SALES_COMPANIES)
      .update(patch)
      .eq("id", company.id)

    if (updateError) {
      console.error("[twenty-sync] Supabase company update failed:", updateError.message)
      skipped += 1
      continue
    }

    const { error: syncLogError } = await insertWithOptionalColumns(sb, DB_TABLES.SALES_SYNC_LOGS, {
      direction: "twenty->supabase",
      entity_type: "company",
      entity_id: company.id,
      pipeline_run_id: options.pipelineRunId ?? null,
      action: "update",
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
    if (syncLogError) console.error("[twenty-sync] sync log insert failed:", syncLogError.message)

    updated += 1
  }

  return { ok: true, configured: true, scanned: records.length, created, updated, skipped, pipelineRunsCreated, failures }
}
