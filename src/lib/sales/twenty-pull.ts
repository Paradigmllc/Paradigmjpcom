import { getServiceSalesSupabase } from "@/lib/supabase"
import { upsertCompanyByDomain, batchFindExistingByDomains } from "@/lib/sales/companies"
import { salesScopeFromCountry } from "@/lib/sales/locale-scope"
import { ensureTwentyPipelineRun } from "./twenty-pipeline-intake"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { insertWithOptionalColumns } from "@/lib/sales/safe-supabase-insert"
import {
  buildCompanySlug,
  buildReportUrl,
  inferVariant,
  normalizeReportLocale,
  normalizeTargetCountry,
  normalizeTemplateVariant,
} from "./routing"
import {
  normalizeDomain,
  parseSalesStatusLabel,
  type TwentyRecord,
} from "./twenty-sync-utils"
import { fetchTwentyCompanyPages } from "./twenty-pull-pages"
import {
  formUrlFromTwenty,
  hasSourceErrors,
  isDataStale,
  reportUrlFromTwenty,
  sourceCoverageTooLow,
} from "@/lib/sales/twenty-pull-retry"
import {
  contactFormUrlFromMeta,
  countryCodeFromTwentyRecord,
  plainRecord,
  routingNeedsRepair,
} from "./twenty-pull-helpers"
import { requireTwentyAuth } from "./twenty-health"
import { checkTwentyConflict, lastKnownTwentyUpdatedAt } from "./twenty-conflict"

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
  pageSize?: number
  maxPages?: number
}

function emptyResult(input: { configured: boolean; dryRun: boolean; error?: string }): TwentyPullResult {
  return {
    ok: false,
    configured: input.configured,
    dryRun: input.dryRun,
    scanned: 0, created: 0, updated: 0, skipped: 0,
    pipelineRunsCreated: 0, pipelineRunsDispatched: 0, pipelineRunsReused: 0,
    error: input.error,
  }
}

function isListOnlyCompany(meta: Record<string, unknown>): boolean {
  return meta.list_only === true
    || meta.list_only === "true"
    || meta.skip_enrichment === true
    || meta.skip_enrichment === "true"
}

export async function pullTwentyCompaniesToSupabase(
  limit = 200,
  options: TwentyPullOptions = {},
): Promise<TwentyPullResult> {
  const isDryRun = options.dryRun === true

  // Twenty is the Sales OS SSOT — auth is REQUIRED, not optional
  try {
    requireTwentyAuth()
  } catch (authError) {
    return emptyResult({
      configured: false,
      dryRun: isDryRun,
      error: authError instanceof Error ? authError.message : "Twenty auth not configured — SSOT sync cannot proceed",
    })
  }

  const sb = getServiceSalesSupabase()
  if (!sb) {
    return emptyResult({ configured: true, dryRun: isDryRun, error: "Supabase service_role not configured" })
  }

  const safeLimit = Math.min(Math.max(Math.round(limit), 1), 10_000)
  const pageResult = await fetchTwentyCompanyPages(safeLimit, options)
  if (!pageResult.ok) return emptyResult({ configured: true, dryRun: isDryRun, error: pageResult.error })

  const records = pageResult.records
  const shouldAutoRunPipeline = options.autoRunPipeline === true
  const shouldDispatchPipeline = options.dispatchPipeline !== false
  const failures: NonNullable<TwentyPullResult["failures"]> = [...pageResult.failures]
  let created = 0, updated = 0, skipped = 0
  let pipelineRunsCreated = 0, pipelineRunsDispatched = 0, pipelineRunsReused = 0

  const allDomains = records
    .map((r) => normalizeDomain(r.domainName?.primaryLinkUrl) ?? normalizeDomain(r.domainName?.primaryLinkLabel))
    .filter((d): d is string => d !== null && d.length > 0)
  const existingDomainMap = await batchFindExistingByDomains(allDomains)

  for (const record of records) {
    const domain = normalizeDomain(record.domainName?.primaryLinkUrl) ?? normalizeDomain(record.domainName?.primaryLinkLabel)
    if (!domain) {
      skipped += 1
      failures.push({ twentyCompanyId: record.id ?? null, domain: null, reason: "domainName is missing or invalid" })
      continue
    }

    const existingCompany = existingDomainMap.get(domain) ?? null
    const company = existingCompany ?? null
    const currentMeta = plainRecord(company?.meta)
    const listOnly = isListOnlyCompany(currentMeta)
    const rawReportUrl = record.paradigmReportUrl?.primaryLinkUrl ?? null
    const rawFormUrl = record.paradigmFormUrl?.primaryLinkUrl ?? null
    const reportUrl = reportUrlFromTwenty(rawReportUrl)
    const formUrl = formUrlFromTwenty(rawFormUrl, domain)
    const salesMaterialUrl = record.paradigmSalesMaterialUrl?.primaryLinkUrl ?? null
    const demoUrl = record.paradigmDemoUrl?.primaryLinkUrl ?? null
    const customerPortalUrl = record.paradigmCustomerPortalUrl?.primaryLinkUrl ?? null
    const invalidTwentyUrl = Boolean((rawReportUrl && !reportUrl) || (rawFormUrl && !formUrl))
    if (rawReportUrl && !reportUrl) {
      failures.push({ twentyCompanyId: record.id ?? null, domain, reason: `invalid Twenty report URL ignored: ${rawReportUrl}` })
    }
    if (rawFormUrl && !formUrl) {
      failures.push({ twentyCompanyId: record.id ?? null, domain, reason: `invalid Twenty form URL ignored: ${rawFormUrl}` })
    }

    const patchMeta: Record<string, unknown> = {
      ...currentMeta,
      twenty: {
        ...plainRecord(currentMeta.twenty),
        id: record.id ?? null,
        updatedAt: record.updatedAt ?? null,
        lastPulledAt: new Date().toISOString(),
        countryName: record.paradigmCountryName ?? null,
        regionName: record.paradigmRegionName ?? null,
        industryName: record.paradigmIndustryName ?? null,
        sourceName: record.paradigmSourceName ?? null,
        salesStatus: record.paradigmSalesStatus ?? null,
        dataStatus: record.paradigmDataStatus ?? null,
        dataSources: record.paradigmDataSources ?? null,
        nextAction: record.paradigmNextAction ?? null,
        lastError: record.paradigmLastError ?? null,
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
    const inferredCountry = countryCodeFromTwentyRecord(record, domain)
    const inferredScope = salesScopeFromCountry({ targetCountry: inferredCountry })

    let companyId = typeof company?.id === "string" ? company.id : null
    let companyReportUrl = typeof company?.report_url === "string" && company.report_url.trim() ? company.report_url : null
    let companyPipelineStatus: string | null = typeof company?.pipeline_status === "string" ? company.pipeline_status : null

    if (!companyId) {
      if (isDryRun) { created += 1; if (shouldAutoRunPipeline) pipelineRunsCreated += 1; continue }
      const scope = inferredScope
      const templateVariant = inferVariant({ reportLocale: scope.reportLocale, targetCountry: scope.targetCountry, meta: patchMeta })
      const upsert = await upsertCompanyByDomain({
        domain, company_name: record.name?.trim() || domain,
        region: scope.region, report_locale: scope.reportLocale, target_country: scope.targetCountry,
        template_variant: templateVariant,
        pipeline_status: shouldAutoRunPipeline ? "scanning" : "pending",
        source: "twenty", meta: patchMeta,
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
      // Conflict check: if Twenty has been edited externally since our last sync,
      // log it but still pull (Twenty = SSOT, so its data wins by definition).
      const lastKnownAt = lastKnownTwentyUpdatedAt(company?.meta)
      const conflict = checkTwentyConflict(record, lastKnownAt)
      if (conflict.twentyWins) {
        console.warn(
          `[twenty-pull] Twenty won conflict for ${domain}: Twenty updatedAt=${conflict.twentyUpdatedAt}, our lastKnown=${conflict.lastKnownUpdatedAt}`,
        )
      }

      const companyName = record.name?.trim() || domain
      const scope = inferredScope
      const shouldRepairRouting = routingNeedsRepair({ company, inferredCountry })
      const reportLocale = shouldRepairRouting ? scope.reportLocale : normalizeReportLocale(company?.report_locale ?? scope.reportLocale, company?.region ?? scope.region)
      const targetCountry = shouldRepairRouting ? scope.targetCountry : normalizeTargetCountry(company?.target_country ?? scope.targetCountry, reportLocale)
      const inferredTemplateVariant = inferVariant({ reportLocale, targetCountry, issues: company?.detected_issues, meta: patchMeta })
      const templateVariant = shouldRepairRouting ? inferredTemplateVariant : normalizeTemplateVariant(company?.template_variant ?? inferredTemplateVariant)
      patchMeta.routing = { ...plainRecord(patchMeta.routing), report_locale: reportLocale, target_country: targetCountry, template_variant: templateVariant }

      const patch: Record<string, unknown> = { meta: patchMeta }
      if (reportUrl && !companyReportUrl) { patch.report_url = reportUrl; companyReportUrl = reportUrl }

      if (!company?.slug) {
        const generatedSlug = buildCompanySlug(companyName, domain)
        patch.slug = generatedSlug
        patch.report_url = patch.report_url ?? buildReportUrl(reportLocale, generatedSlug)
        companyReportUrl = (patch.report_url as string) ?? companyReportUrl
      }

      const effectiveSlug = typeof patch.slug === "string" ? patch.slug : company?.slug
      if (shouldRepairRouting) {
        patch.region = scope.region; patch.report_locale = reportLocale; patch.target_country = targetCountry; patch.template_variant = templateVariant
        if (effectiveSlug) { patch.report_url = buildReportUrl(reportLocale, effectiveSlug); companyReportUrl = patch.report_url as string }
      } else {
        if (!company?.report_locale) patch.report_locale = reportLocale
        if (!company?.target_country) patch.target_country = targetCountry
        if (!company?.template_variant) patch.template_variant = templateVariant
      }

      if (record.paradigmSalesStatus) {
        const parsed = parseSalesStatusLabel(record.paradigmSalesStatus)
        if (parsed.pipelineStatus) patch.pipeline_status = parsed.pipelineStatus
        if (parsed.dealStage) patch.deal_stage = parsed.dealStage
        if (parsed.pipelineStatus) companyPipelineStatus = parsed.pipelineStatus
      }

      if (isDryRun) { updated += 1 } else {
        const { error: updateError } = await sb.from(DB_TABLES.SALES_COMPANIES).update(patch).eq("id", companyId)
        if (updateError) {
          console.error("[twenty-pull] Supabase company update failed:", updateError.message)
          skipped += 1; failures.push({ twentyCompanyId: record.id ?? null, domain, reason: updateError.message }); continue
        }
        updated += 1
      }
    }

    if (isDryRun) {
      const needsGeneration = !companyReportUrl || companyPipelineStatus !== "report_ready" || sourceCoverageTooLow(record, patchMeta) || hasSourceErrors(patchMeta) || isDataStale(patchMeta) || invalidTwentyUrl
      if (!listOnly && shouldAutoRunPipeline && needsGeneration && companyId) pipelineRunsCreated += 1
      continue
    }

    const { error: syncLogError } = await insertWithOptionalColumns(sb, DB_TABLES.SALES_SYNC_LOGS, {
      direction: "twenty->supabase", entity_type: "company", entity_id: companyId,
      pipeline_run_id: options.pipelineRunId ?? null,
      action: company ? "update" : "create", status: "success",
      payload: { twenty_company_id: record.id ?? null, domain, report_url: reportUrl, form_url: formUrl, sales_material_url: salesMaterialUrl, demo_url: demoUrl, customer_portal_url: customerPortalUrl },
    }, ["pipeline_run_id"])
    if (syncLogError) console.error("[twenty-pull] sync log insert failed:", syncLogError.message)

    const needsGeneration = !companyReportUrl || !contactFormUrlFromMeta(patchMeta) || companyPipelineStatus !== "report_ready" || sourceCoverageTooLow(record, patchMeta) || hasSourceErrors(patchMeta) || isDataStale(patchMeta) || invalidTwentyUrl
    if (listOnly || !shouldAutoRunPipeline || !needsGeneration) continue

    const pipeline = await ensureTwentyPipelineRun(sb, { companyId, record, domain, options, dispatch: shouldDispatchPipeline })
    if (pipeline.reused) pipelineRunsReused += 1
    if (pipeline.created) pipelineRunsCreated += 1
    if (pipeline.dispatched) pipelineRunsDispatched += 1
    if (pipeline.error) failures.push({ twentyCompanyId: record.id ?? null, domain, reason: pipeline.error })
  }

  return {
    ok: true, configured: true, dryRun: isDryRun,
    scanned: records.length, created, updated, skipped,
    pipelineRunsCreated, pipelineRunsDispatched, pipelineRunsReused,
    failures: failures.slice(0, 20),
  }
}
