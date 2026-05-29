import { getServiceSalesSupabase } from "@/lib/supabase"
import { fetchCompanyKarte, type CompanyKarteSnapshot } from "@/lib/sales/company-karte"
import {
  ensureCompanyProductRecommendations,
  markRecommendationOpportunityCreated,
  type CompanyProductRecommendation,
} from "@/lib/sales/products"

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
    opportunities?: T[]
  }
}

interface TwentyMutationResponse {
  data?: {
    createCompany?: TwentyRecord
    updateCompany?: TwentyRecord
    company?: TwentyRecord
    createOpportunity?: { id?: string }
    updateOpportunity?: { id?: string }
    opportunity?: { id?: string }
  }
}

export interface TwentySyncResult {
  ok: boolean
  configured: boolean
  companyId?: string
  homeSynced?: boolean
  opportunityIds?: string[]
  recommendationCount?: number
  error?: string
}

export interface TwentyPullResult {
  ok: boolean
  configured: boolean
  scanned: number
  updated: number
  skipped: number
  error?: string
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
    console.warn("[twenty-sync] invalid domain:", { input, error })
    return null
  }
}

function domainMatches(record: TwentyRecord, domain: string): boolean {
  const normalized = domain.toLowerCase()
  const url = normalizeDomain(record.domainName?.primaryLinkUrl)
  const label = normalizeDomain(record.domainName?.primaryLinkLabel)
  return url === normalized || label === normalized
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
    console.error("[twenty-sync] invalid JSON response:", error)
    return { ok: false, error: "Twenty API returned invalid JSON" }
  }
}

async function findTwentyCompany(karte: CompanyKarteSnapshot): Promise<TwentyRecord | null> {
  const result = await twentyFetch<TwentyListResponse<TwentyRecord>>("/rest/companies?limit=200")
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

function linkField(label: string, url: string | null): { primaryLinkLabel: string; primaryLinkUrl: string } {
  return {
    primaryLinkLabel: url ? label : "",
    primaryLinkUrl: url ?? "",
  }
}

function productOptionValue(code: CompanyProductRecommendation["code"]): string {
  return code.toUpperCase()
}

function karteScore(karte: CompanyKarteSnapshot): number {
  const topFit = karte.recommendedProducts[0]?.fitScore ?? 70
  return Math.max(0, Math.min(100, Math.round((karte.sourceScore + topFit) / 2)))
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
  ].join("\n")
}

async function syncTwentyCompanyHomeFields(
  karte: CompanyKarteSnapshot,
  twentyCompanyId: string,
): Promise<void> {
  const result = await twentyFetch<TwentyMutationResponse>(`/rest/companies/${twentyCompanyId}`, {
    method: "PATCH",
    body: JSON.stringify({
      paradigmReportUrl: linkField("診断レポートURL", karte.reportUrl),
      paradigmFormUrl: linkField("フォームURL", karte.formUrl),
      paradigmRecommendedProducts: karte.recommendedProducts.map((product) => productOptionValue(product.code)),
      paradigmKarteScore: karteScore(karte),
      paradigmSourceCoverage: karte.sourceScore,
      paradigmKarteSummary: {
        markdown: karteHomeSummary(karte),
      },
    }),
  })

  if (!result.ok) throw new Error(result.error)
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
    {
      ...base,
      amountAmountMicros: amountMicros,
      amountCurrencyCode: product.defaultCurrency,
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

export async function syncCompanyKarteToTwenty(companyId: string): Promise<TwentySyncResult> {
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
    const twentyCompany = existing?.id ? existing : await createTwentyCompany(karte)
    if (!twentyCompany.id) throw new Error("Twenty company id missing")

    await syncTwentyCompanyHomeFields(karte, twentyCompany.id)
    const opportunityIds = await syncTwentyOpportunities(sb, karte, twentyCompany.id)

    await sb.from("sales_sync_logs").insert([
      {
        direction: "supabase->twenty",
        entity_type: "company",
        entity_id: companyId,
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
        action: "opportunity_sync",
        status: "success",
        payload: {
          twenty_company_id: twentyCompany.id,
          twenty_opportunity_ids: opportunityIds,
          product_codes: recommendations.map((product) => product.code),
        },
      },
    ])

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
    await sb.from("sales_sync_logs").insert({
      direction: "supabase->twenty",
      entity_type: "company",
      entity_id: companyId,
      action: "opportunity_sync",
      status: "error",
      error_message: message,
      payload: {
        product_codes: recommendations.map((product) => product.code),
      },
    })
    return { ok: false, configured: true, error: message, recommendationCount: recommendations.length }
  }
}

export async function pullTwentyCompaniesToSupabase(limit = 200): Promise<TwentyPullResult> {
  const baseUrl = twentyBaseUrl()
  const apiKey = env("TWENTY_API_KEY")
  if (!baseUrl || !apiKey) {
    return {
      ok: false,
      configured: false,
      scanned: 0,
      updated: 0,
      skipped: 0,
      error: "TWENTY_BASE_URL or TWENTY_API_KEY is not configured",
    }
  }

  const sb = getServiceSalesSupabase()
  if (!sb) {
    return {
      ok: false,
      configured: true,
      scanned: 0,
      updated: 0,
      skipped: 0,
      error: "Supabase service_role not configured",
    }
  }

  const safeLimit = Math.min(Math.max(limit, 1), 500)
  const result = await twentyFetch<TwentyListResponse<TwentyRecord>>(`/rest/companies?limit=${safeLimit}`)
  if (!result.ok) {
    return { ok: false, configured: true, scanned: 0, updated: 0, skipped: 0, error: result.error }
  }

  const records = result.data.data?.companies ?? []
  let updated = 0
  let skipped = 0

  for (const record of records) {
    const domain =
      normalizeDomain(record.domainName?.primaryLinkUrl) ??
      normalizeDomain(record.domainName?.primaryLinkLabel)
    if (!domain) {
      skipped += 1
      continue
    }

    const { data: company, error: findError } = await sb
      .from("sales_companies")
      .select("id, meta")
      .eq("domain", domain)
      .maybeSingle()

    if (findError) {
      console.error("[twenty-sync] Supabase company lookup failed:", findError.message)
      skipped += 1
      continue
    }
    if (!company?.id) {
      skipped += 1
      continue
    }

    const currentMeta = (company.meta ?? {}) as Record<string, unknown>
    const reportUrl = record.paradigmReportUrl?.primaryLinkUrl ?? null
    const formUrl = record.paradigmFormUrl?.primaryLinkUrl ?? null
    const patchMeta: Record<string, unknown> = {
      ...currentMeta,
      twenty: {
        id: record.id ?? null,
        lastPulledAt: new Date().toISOString(),
        karteScore: record.paradigmKarteScore ?? null,
        sourceCoverage: record.paradigmSourceCoverage ?? null,
        recommendedProducts: record.paradigmRecommendedProducts ?? [],
        summary: record.paradigmKarteSummary?.markdown ?? null,
      },
    }
    if (formUrl) patchMeta.contact_form_url = formUrl

    const patch: Record<string, unknown> = { meta: patchMeta }
    if (reportUrl) patch.report_url = reportUrl

    const { error: updateError } = await sb
      .from("sales_companies")
      .update(patch)
      .eq("id", company.id)

    if (updateError) {
      console.error("[twenty-sync] Supabase company update failed:", updateError.message)
      skipped += 1
      continue
    }

    await sb.from("sales_sync_logs").insert({
      direction: "twenty->supabase",
      entity_type: "company",
      entity_id: company.id,
      action: "update",
      status: "success",
      payload: {
        twenty_company_id: record.id ?? null,
        domain,
        report_url: reportUrl,
        form_url: formUrl,
      },
    })

    updated += 1
  }

  return { ok: true, configured: true, scanned: records.length, updated, skipped }
}
