import { getServiceSalesSupabase } from "@/lib/supabase"
import { fetchCompanyKarte, type CompanyKarteSnapshot } from "@/lib/sales/company-karte"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { insertWithOptionalColumns } from "@/lib/sales/safe-supabase-insert"
import {
  ensureCompanyProductRecommendations,
  markRecommendationOpportunityCreated,
  type CompanyProductRecommendation,
} from "@/lib/sales/products"
import {
  domainMatches,
  twentyFetch,
  linkField,
  type TwentyMutationResponse,
  type TwentyRecord,
  type TwentyListResponse,
  type TwentySyncResult,
  type TwentyCustomerHandoffInput,
  type TwentyCustomerHandoffResult,
} from "./twenty-sync-utils"
import {
  customerHandoffSummary,
  twentyCompanyHomePayload,
} from "./twenty-sync-summaries"
import { requireTwentyAuth } from "./twenty-health"

async function findTwentyCompany(karte: CompanyKarteSnapshot): Promise<TwentyRecord | null> {
  // Server-side ILIKE is intentionally broad (matches subdomains) — client-side
  // domainMatches() does strict exact matching to eliminate false positives.
  const query = `limit=100&filter=domainName.primaryLinkUrl[ilike]:%25${encodeURIComponent(karte.domain)}%25`
  const result = await twentyFetch<TwentyListResponse<TwentyRecord>>(`/rest/companies?${query}`)

  if (!result.ok) throw new Error(result.error)
  return result.data.data?.companies?.find((company) => domainMatches(company, karte.domain)) ?? null
}

async function createTwentyCompany(karte: CompanyKarteSnapshot): Promise<TwentyRecord> {
  const result = await twentyFetch<TwentyMutationResponse>("/rest/companies", {
    method: "POST",
    body: JSON.stringify({
      name: karte.companyName,
      domainName: {
        primaryLinkLabel: karte.domain,
        primaryLinkUrl: `https://${karte.domain}`,
      },
    }),
  })
  if (!result.ok) throw new Error(result.error)
  const company = result.data.data?.createCompany ?? result.data.data?.company
  if (!company?.id) throw new Error("Twenty company create response did not include id")
  return company
}

// Cached set of Twenty company fields known to be unavailable.
// Populated on first failed PATCH to avoid repeated retry loops.
const unavailableFields = new Set<string>()

async function patchTwentyCompanyHome(
  twentyCompanyId: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Pre-filter: remove known-unavailable fields before the first attempt
  let filteredPayload = payload
  if (unavailableFields.size > 0) {
    const cleaned: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(payload)) {
      if (!unavailableFields.has(key)) cleaned[key] = value
    }
    if (Object.keys(cleaned).length < Object.keys(payload).length) {
      console.warn(
        `[twenty-sync] pre-filtered ${Object.keys(payload).length - Object.keys(cleaned).length} known-unavailable fields:`,
        Object.keys(payload).filter((k) => unavailableFields.has(k)),
      )
    }
    filteredPayload = cleaned
  }

  const result = await twentyFetch<TwentyMutationResponse>(`/rest/companies/${twentyCompanyId}`, {
    method: "PATCH",
    body: JSON.stringify(filteredPayload),
  })
  if (result.ok) return { ok: true }

  // If the error mentions specific fields, cache them as unavailable and retry once
  const errorText = result.error
  const fieldPattern = /"(\w+)"/g
  let match: RegExpExecArray | null
  const mentionedFields = new Set<string>()
  while ((match = fieldPattern.exec(errorText)) !== null) {
    if (match[1] in payload) mentionedFields.add(match[1])
  }

  if (mentionedFields.size === 0) {
    return { ok: false, error: errorText }
  }

  // Cache these fields for future calls
  for (const field of mentionedFields) {
    unavailableFields.add(field)
  }
  console.warn(
    `[twenty-sync] cached ${mentionedFields.size} unavailable Twenty fields — run applyTwentyCrmMetadata to fix:`,
    [...mentionedFields],
  )

  // Retry once with discovered fields removed
  const retryPayload: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(filteredPayload)) {
    if (!mentionedFields.has(key)) retryPayload[key] = value
  }

  if (Object.keys(retryPayload).length === 0) {
    return { ok: false, error: `All fields rejected by Twenty: ${errorText}` }
  }

  const retry = await twentyFetch<TwentyMutationResponse>(`/rest/companies/${twentyCompanyId}`, {
    method: "PATCH",
    body: JSON.stringify(retryPayload),
  })
  if (retry.ok) return { ok: true }

  return { ok: false, error: retry.error }
}

async function syncTwentyCompanyHomeFields(
  karte: CompanyKarteSnapshot,
  twentyCompanyId: string,
): Promise<void> {
  const result = await patchTwentyCompanyHome(twentyCompanyId, twentyCompanyHomePayload(karte))

  if (!result.ok) throw new Error(result.error)
}

export async function syncCustomerHandoffToTwenty(
  input: TwentyCustomerHandoffInput,
): Promise<TwentyCustomerHandoffResult> {
  try {
    requireTwentyAuth()
  } catch (authError) {
    return {
      ok: false,
      configured: false,
      error: authError instanceof Error ? authError.message : "Twenty auth required for customer handoff",
    }
  }

  const pseudoKarte: CompanyKarteSnapshot = {
    companyId: "customer-handoff",
    region: "jp",
    companyName: input.companyName,
    domain: input.domain,
    reportLocale: "ja",
    targetCountry: "JP",
    templateVariant: "website_diagnostic",
    reportUrl: null,
    formUrl: null,
    demoUrl: null,
    salesMaterialUrl: null,
    customerPortalUrl: input.customerPortalUrl,
    industry: null,
    regionName: null,
    sourceName: "customer_handoff",
    pipelineStatus: "sent",
    dealStage: input.contractStatus ?? "成約",
    localizedReportUrls: [],
    sourceScore: 0,
    collectedCount: 0,
    configuredCount: 0,
    missingCount: 0,
    errorCount: 0,
    sourceItems: [],
    evidence: [],
    intelligence: {
      signals: [],
      painPoints: [],
      nextActions: ["顧客ポータルでオンボーディングを開始する"],
    },
    diagnosisSummary: null,
    recommendedOffer: null,
    personalizedHook: null,
    personalizedCTA: null,
    recommendedProducts: [],
    generatedAt: new Date().toISOString(),
  }

  try {
    const existing = await findTwentyCompany(pseudoKarte)
    const twentyCompany = existing?.id ? existing : await createTwentyCompany(pseudoKarte)
    if (!twentyCompany.id) throw new Error("Twenty company id missing")

    const summary = customerHandoffSummary(input)
    const fullPayload = {
      paradigmCustomerPortalUrl: linkField("顧客ポータル", input.customerPortalUrl),
      paradigmKarteSummary: { markdown: summary },
    }
    const full = await patchTwentyCompanyHome(twentyCompany.id, fullPayload)
    if (full.ok) {
      return { ok: true, configured: true, companyId: twentyCompany.id, customerPortalFieldSynced: true }
    }

    const fallback = await patchTwentyCompanyHome(twentyCompany.id, {
      paradigmKarteSummary: { markdown: summary },
    })
    if (!fallback.ok) throw new Error(fallback.error)
    return { ok: true, configured: true, companyId: twentyCompany.id, customerPortalFieldSynced: false }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Twenty customer handoff sync failed"
    console.error("[twenty-sync] customer handoff failed:", error)
    return { ok: false, configured: true, error: message }
  }
}

function closeDateIso(): string {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
}

function opportunityPayloads(
  karte: CompanyKarteSnapshot,
  product: CompanyProductRecommendation,
  twentyCompanyId: string,
): Record<string, unknown>[] {
  const amountMicros = product.defaultAmountYen > 0 ? product.defaultAmountYen * 1_000_000 : null
  const base = {
    name: `${product.displayName} - ${karte.companyName}`,
    closeDate: closeDateIso(),
    stage: "NEW",
    companyId: twentyCompanyId,
  }

  return [
    {
      ...base,
      amount: amountMicros
        ? {
            amountMicros,
            currencyCode: product.defaultCurrency,
          }
        : null,
    },
  ]
}

async function createTwentyOpportunity(
  karte: CompanyKarteSnapshot,
  product: CompanyProductRecommendation,
  twentyCompanyId: string,
): Promise<string> {
  const errors: string[] = []

  for (const payload of opportunityPayloads(karte, product, twentyCompanyId)) {
    const result = await twentyFetch<TwentyMutationResponse>("/rest/opportunities", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    if (!result.ok) {
      errors.push(result.error.slice(0, 500))
      continue
    }
    const opportunityId = result.data.data?.createOpportunity?.id ?? result.data.data?.opportunity?.id
    if (opportunityId) return opportunityId
    errors.push("Twenty opportunity create response did not include id")
  }

  throw new Error(errors.join(" / "))
}

async function syncTwentyOpportunities(
  sb: NonNullable<ReturnType<typeof getServiceSalesSupabase>>,
  karte: CompanyKarteSnapshot,
  twentyCompanyId: string,
): Promise<string[]> {
  const opportunityIds: string[] = []

  for (const product of karte.recommendedProducts) {
    if (product.twentyOpportunityId) {
      opportunityIds.push(product.twentyOpportunityId)
      continue
    }

    const opportunityId = await createTwentyOpportunity(karte, product, twentyCompanyId)
    opportunityIds.push(opportunityId)
    await markRecommendationOpportunityCreated(sb, product.id, opportunityId)
  }

  return opportunityIds
}

export async function syncCompanyKarteToTwenty(
  companyId: string,
  options: { pipelineRunId?: string | null } = {},
): Promise<TwentySyncResult> {
  try {
    requireTwentyAuth()
  } catch (authError) {
    return {
      ok: false,
      configured: false,
      error: authError instanceof Error ? authError.message : "Twenty auth required for karte sync",
    }
  }

  const sb = getServiceSalesSupabase()
  if (!sb) return { ok: false, configured: true, error: "Supabase service_role not configured" }

  const karteResult = await fetchCompanyKarte(sb, companyId)
  if (!karteResult.ok) return { ok: false, configured: true, error: karteResult.error }

  const recommendations = await ensureCompanyProductRecommendations(sb, {
    companyId,
    region: karteResult.karte.region,
    reportLocale: karteResult.karte.reportLocale,
    targetCountry: karteResult.karte.targetCountry,
    templateVariant: karteResult.karte.templateVariant,
    diagnosisSummary: karteResult.karte.diagnosisSummary,
    recommendedOffer: karteResult.karte.recommendedOffer,
  })
  const karte: CompanyKarteSnapshot = { ...karteResult.karte, recommendedProducts: recommendations }

  try {
    const existing = await findTwentyCompany(karte)
    let twentyCompany: TwentyRecord | null = existing?.id ? existing : null
    if (!twentyCompany) {
      try {
        twentyCompany = await createTwentyCompany(karte)
      } catch (createError) {
        const reason = createError instanceof Error ? createError.message : String(createError)
        if (!/409|conflict|duplicate|already exists/i.test(reason)) throw createError
        console.warn("[twenty-sync] createTwentyCompany conflict, re-finding:", reason)
        twentyCompany = await findTwentyCompany(karte)
      }
    }
    if (!twentyCompany?.id) throw new Error("Twenty company id missing")

    await syncTwentyCompanyHomeFields(karte, twentyCompany.id)
    const opportunityIds = await syncTwentyOpportunities(sb, karte, twentyCompany.id)

    const { error: successLogError } = await insertWithOptionalColumns(sb, DB_TABLES.SALES_SYNC_LOGS, [
      {
        direction: "supabase->twenty",
        entity_type: "company",
        entity_id: companyId,
        pipeline_run_id: options.pipelineRunId ?? null,
        action: "karte_home_sync",
        status: "success",
        payload: {
          twenty_company_id: twentyCompany.id,
          report_url: karte.reportUrl,
          form_url: karte.formUrl,
          product_codes: recommendations.map((product) => product.code),
        },
      },
      {
        direction: "supabase->twenty",
        entity_type: "company",
        entity_id: companyId,
        pipeline_run_id: options.pipelineRunId ?? null,
        action: "opportunity_sync",
        status: "success",
        payload: {
          twenty_company_id: twentyCompany.id,
          twenty_opportunity_ids: opportunityIds,
          product_codes: recommendations.map((product) => product.code),
        },
      },
    ], ["pipeline_run_id"])
    if (successLogError) console.error("[twenty-sync] success log insert failed:", successLogError.message)

    return {
      ok: true,
      configured: true,
      companyId: twentyCompany.id,
      homeSynced: true,
      opportunityIds,
      recommendationCount: recommendations.length,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Twenty sync failed"
    console.error("[twenty-sync] failed:", error)
    const { error: errorLogError } = await insertWithOptionalColumns(sb, DB_TABLES.SALES_SYNC_LOGS, {
      direction: "supabase->twenty",
      entity_type: "company",
      entity_id: companyId,
      pipeline_run_id: options.pipelineRunId ?? null,
      action: "opportunity_sync",
      status: "error",
      error_message: message,
      payload: {
        product_codes: recommendations.map((product) => product.code),
      },
    }, ["pipeline_run_id"])
    if (errorLogError) console.error("[twenty-sync] error log insert failed:", errorLogError.message)
    return { ok: false, configured: true, error: message, recommendationCount: recommendations.length }
  }
}
