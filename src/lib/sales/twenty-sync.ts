import { getServiceSalesSupabase } from "@/lib/supabase"
import {
  companyKarteMarkdown,
  fetchCompanyKarte,
  type CompanyKarteSnapshot,
} from "@/lib/sales/company-karte"
import {
  ensureCompanyProductRecommendations,
  markRecommendationOpportunityCreated,
  type CompanyProductRecommendation,
} from "@/lib/sales/products"

interface TwentyRecord {
  id?: string
  name?: string
  domainName?: {
    primaryLinkUrl?: string | null
    primaryLinkLabel?: string | null
  } | null
}

interface TwentyListResponse<T> {
  data?: {
    companies?: T[]
    notes?: T[]
    opportunities?: T[]
  }
}

interface TwentyMutationResponse {
  data?: {
    createCompany?: TwentyRecord
    company?: TwentyRecord
    createNote?: { id?: string }
    note?: { id?: string }
    createNoteTarget?: { id?: string }
    noteTarget?: { id?: string }
    createOpportunity?: { id?: string }
    opportunity?: { id?: string }
  }
}

export interface TwentySyncResult {
  ok: boolean
  configured: boolean
  companyId?: string
  noteId?: string
  opportunityIds?: string[]
  recommendationCount?: number
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

function domainMatches(record: TwentyRecord, domain: string): boolean {
  const normalized = domain.toLowerCase()
  const url = record.domainName?.primaryLinkUrl?.toLowerCase() ?? ""
  const label = record.domainName?.primaryLinkLabel?.toLowerCase() ?? ""
  return url.includes(normalized) || label === normalized
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
  } catch (e) {
    console.error("[twenty-sync] invalid JSON response:", e)
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

async function createTwentyKarteNote(karte: CompanyKarteSnapshot, twentyCompanyId: string): Promise<string> {
  const result = await twentyFetch<TwentyMutationResponse>("/rest/notes", {
    method: "POST",
    body: JSON.stringify({
      title: `企業カルテ: ${karte.companyName}`,
      bodyV2: {
        markdown: companyKarteMarkdown(karte),
      },
    }),
  })
  if (!result.ok) throw new Error(result.error)
  const noteId = result.data.data?.createNote?.id ?? result.data.data?.note?.id
  if (!noteId) throw new Error("Twenty note create response did not include id")

  const targetResult = await twentyFetch<TwentyMutationResponse>("/rest/noteTargets", {
    method: "POST",
    body: JSON.stringify({
      noteId,
      targetCompanyId: twentyCompanyId,
    }),
  })
  if (!targetResult.ok) throw new Error(targetResult.error)

  return noteId
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

    const noteId = await createTwentyKarteNote(karte, twentyCompany.id)
    const opportunityIds = await syncTwentyOpportunities(sb, karte, twentyCompany.id)

    await sb.from("sales_sync_logs").insert([
      {
        direction: "supabase->twenty",
        entity_type: "company",
        entity_id: companyId,
        action: "karte_note_sync",
        status: "success",
        payload: {
          twenty_company_id: twentyCompany.id,
          twenty_note_id: noteId,
          report_url: karte.reportUrl,
          form_url: karte.formUrl,
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
      noteId,
      opportunityIds,
      recommendationCount: recommendations.length,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Twenty sync failed"
    console.error("[twenty-sync] failed:", e)
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
