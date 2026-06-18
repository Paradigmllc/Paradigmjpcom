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
  env,
  twentyBaseUrl,
  domainMatches,
  twentyFetch,
  linkField,
  productOptionValue,
  PIPELINE_LABELS,
  industryLabel,
  type TwentyRecord,
  type TwentyListResponse,
  type TwentySyncResult,
  type TwentyCustomerHandoffInput,
  type TwentyCustomerHandoffResult,
} from "./twenty-sync-utils"

function karteScore(karte: CompanyKarteSnapshot): number {
  const topFit = karte.recommendedProducts[0]?.fitScore ?? 70
  return Math.max(0, Math.min(100, Math.round((karte.sourceScore + topFit) / 2)))
}

function salesStatusLabel(karte: CompanyKarteSnapshot): string {
  const pipeline = PIPELINE_LABELS[karte.pipelineStatus] ?? karte.pipelineStatus
  return `${pipeline} / ${karte.dealStage}`
}

function karteHomeSummary(karte: CompanyKarteSnapshot): string {
  const products = karte.recommendedProducts
    .slice(0, 3)
    .map((product) => `${product.displayName}(${product.fitScore})`)
    .join(" / ")

  return [
    `対象: ${karte.targetCountry} / ${karte.reportLocale} / ${karte.templateVariant}`,
    `取得状況: ${karte.sourceScore}% (${karte.collectedCount} collected, ${karte.configuredCount} configured, ${karte.missingCount} missing)`,
    `主な痛み: ${karte.diagnosisSummary ?? "Dify診断待ち"}`,
    `推奨提案: ${karte.recommendedOffer ?? (products || "商材判定待ち")}`,
    `推奨商材: ${products || "未判定"}`,
    karte.personalizedHook ? `パーソナライズHook: ${karte.personalizedHook}` : null,
    karte.personalizedCTA ? `CTA: ${karte.personalizedCTA}` : null,
    karte.reportUrl ? `Report URL: ${karte.reportUrl}` : null,
    karte.formUrl ? `Form URL: ${karte.formUrl}` : null,
    karte.salesMaterialUrl ? `Sales material URL: ${karte.salesMaterialUrl}` : null,
    karte.demoUrl ? `Demo URL: ${karte.demoUrl}` : null,
  ].filter(Boolean).join("\n")
}

function customerHandoffSummary(input: TwentyCustomerHandoffInput): string {
  return [
    `成約後ハンドオフ: ${input.companyName}`,
    `顧客共有Notion: ${input.customerPortalUrl ?? "作成待ち"}`,
    `契約: ${input.contractName ?? "未設定"} / ${input.contractStatus ?? "unknown"}`,
    `契約金額: ${input.contractAmountYen === null ? "未設定" : `JPY ${input.contractAmountYen.toLocaleString("ja-JP")}`}`,
    `Docuseal: ${input.docusealUrl ?? "未設定"}`,
    `Cal.com: ${input.calComUrl ?? "未設定"}`,
  ].join("\n")
}

async function findTwentyCompany(karte: CompanyKarteSnapshot): Promise<TwentyRecord | null> {
  const query = `limit=100&filter=domainName.primaryLinkUrl[ilike]:%25${encodeURIComponent(karte.domain)}%25`
  const result = await twentyFetch<TwentyListResponse<TwentyRecord>>(`/rest/companies?${query}`)

  if (!result.ok) throw new Error(result.error)
  return result.data.data?.companies?.find((company) => domainMatches(company, karte.domain)) ?? null
}

async function createTwentyCompany(karte: CompanyKarteSnapshot): Promise<TwentyRecord> {
  const result = await twentyFetch<any>("/rest/companies", {
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

async function patchTwentyCompanyHome(
  twentyCompanyId: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const removableFields = [
    "xLink",
    "linkedinLink",
    "paradigmReportUrl",
    "paradigmFormUrl",
    "paradigmDemoUrl",
    "paradigmCustomerPortalUrl",
  ]
  let currentPayload = { ...payload }
  let lastError = "Twenty company patch failed"

  for (let attempt = 0; attempt <= removableFields.length; attempt += 1) {
    const result = await twentyFetch<any>(`/rest/companies/${twentyCompanyId}`, {
      method: "PATCH",
      body: JSON.stringify(currentPayload),
    })
    if (result.ok) return { ok: true }

    lastError = result.error
    const missingField = removableFields.find((field) => (
      Object.prototype.hasOwnProperty.call(currentPayload, field) &&
      (
        new RegExp(`[\\\\"']?${field}[\\\\"']?\\s+field`, "i").test(result.error) ||
        result.error.includes(`"${field}"`) ||
        result.error.includes(`\\"${field}\\"`)
      )
    ))
    if (!missingField) break

    const { [missingField]: _removed, ...nextPayload } = currentPayload
    currentPayload = nextPayload
    console.warn(`[twenty-sync] removed unavailable Twenty company field ${missingField} and retrying`)
  }

  return { ok: false, error: lastError }
}

async function syncTwentyCompanyHomeFields(
  karte: CompanyKarteSnapshot,
  twentyCompanyId: string,
): Promise<void> {
  const result = await patchTwentyCompanyHome(twentyCompanyId, {
      name: karte.companyName,
      // Standard visible fields (show immediately in Twenty UI)
      xLink: linkField("診断レポート", karte.reportUrl),
      linkedinLink: linkField("お問い合わせ", karte.formUrl),
      employees: karteScore(karte),
      annualRecurringRevenue: { amountMicros: karte.sourceScore * 1000000, currencyCode: "USD" },
      address: { addressCity: karteHomeSummary(karte).split("\n")[0]?.slice(0, 50) ?? "" },
      // Custom paradigm fields (show after layout config)
      paradigmReportUrl: linkField("診断レポートURL", karte.reportUrl),
      paradigmFormUrl: linkField("フォームURL", karte.formUrl),
      paradigmDemoUrl: linkField("デモURL", karte.demoUrl),
      paradigmKarteScore: karteScore(karte),
      paradigmSourceCoverage: karte.sourceScore,
      paradigmKarteSummary: { markdown: karteHomeSummary(karte) },
  })

  if (!result.ok) throw new Error(result.error)
}

export async function syncCustomerHandoffToTwenty(
  input: TwentyCustomerHandoffInput,
): Promise<TwentyCustomerHandoffResult> {
  const baseUrl = twentyBaseUrl()
  const apiKey = env("TWENTY_API_KEY")
  if (!baseUrl || !apiKey) {
    return { ok: false, configured: false, error: "TWENTY_BASE_URL or TWENTY_API_KEY is not configured" }
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
    sourceItems: [],
    evidence: [],
    intelligence: {
      signals: [],
      painPoints: [],
      nextActions: ["Notion顧客共有ページでオンボーディングを開始する"],
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
      paradigmCustomerPortalUrl: linkField("顧客共有Notion", input.customerPortalUrl),
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
    const result = await twentyFetch<any>("/rest/opportunities", {
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
  const baseUrl = twentyBaseUrl()
  const apiKey = env("TWENTY_API_KEY")
  if (!baseUrl || !apiKey) {
    return { ok: false, configured: false, error: "TWENTY_BASE_URL or TWENTY_API_KEY is not configured" }
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
