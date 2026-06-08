import { getServiceSalesSupabase } from "@/lib/supabase"
import { fetchCompanyKarte, type CompanyKarteSnapshot } from "@/lib/sales/company-karte"
import {
  ensureCompanyProductRecommendations,
  markRecommendationOpportunityCreated,
  type CompanyProductRecommendation,
} from "@/lib/sales/products"
import { enqueueCompanyEnrichment } from "./enrichment-jobs"
import { upsertCompanyByDomain } from "./companies"
import { createSalesPipelineRun } from "./sales-pipeline"

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
  created: number
  updated: number
  skipped: number
  pipelineRunsCreated: number
  failures: { domain: string; reason: string }[]
  error?: string
}

export interface TwentyCustomerHandoffInput {
  domain: string
  companyName: string
  customerPortalUrl: string | null
  contractName: string | null
  contractStatus: string | null
  contractAmountYen: number | null
  docusealUrl: string | null
  calComUrl: string | null
}

export interface TwentyCustomerHandoffResult {
  ok: boolean
  configured: boolean
  companyId?: string
  customerPortalFieldSynced?: boolean
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
  // Use Twenty API bracket and colon filter syntax to avoid bad requests
  const query = `limit=10&filter=domainName.primaryLinkUrl[ilike]:%25${encodeURIComponent(karte.domain)}%25`
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

function linkField(label: string, url: string | null): { primaryLinkLabel: string; primaryLinkUrl: string } {
  return {
    primaryLinkLabel: url ? label : "",
    primaryLinkUrl: url ?? "",
  }
}

function productOptionValue(code: CompanyProductRecommendation["code"]): string {
  return code.toUpperCase()
}

const COUNTRY_LABELS: Record<string, string> = {
  JP: "日本",
  US: "United States",
  KR: "Korea",
  CN: "China",
  TW: "Taiwan",
  DE: "Germany",
  FR: "France",
  ES: "Spain",
  PT: "Portugal",
  RU: "Russia",
  AE: "United Arab Emirates",
  VN: "Vietnam",
  ID: "Indonesia",
}

const INDUSTRY_LABELS: Record<string, string> = {
  beauty_salon: "美容サロン",
  dental: "歯科医院",
  restaurant: "飲食店",
  construction: "建設・工務店",
  accounting: "会計事務所",
  retail: "小売・店舗",
  cleaning: "清掃・メンテナンス",
  consulting: "コンサルティング",
}

const PIPELINE_LABELS: Record<string, string> = {
  pending: "未診断",
  scanning: "カルテ生成中",
  report_ready: "送信待ち",
  sent: "送信済み",
  manual_queue: "手動確認",
}

function countryLabel(country: string): string {
  return COUNTRY_LABELS[country.toUpperCase()] ?? country.toUpperCase()
}

function industryLabel(industry: string | null): string {
  if (!industry) return ""
  return INDUSTRY_LABELS[industry] ?? industry
}

function salesStatusLabel(karte: CompanyKarteSnapshot): string {
  const pipeline = PIPELINE_LABELS[karte.pipelineStatus] ?? karte.pipelineStatus
  return `${pipeline} / ${karte.dealStage}`
}

function parseSalesStatusLabel(label: string | null): { pipelineStatus?: string; dealStage?: string } {
  if (!label) return {}
  const parts = label.split(" / ")
  const pipelineLabel = parts[0]?.trim()
  const dealStage = parts[1]?.trim()
  
  let pipelineStatus: string | undefined
  if (pipelineLabel) {
    const entry = Object.entries(PIPELINE_LABELS).find(([key, val]) => val === pipelineLabel)
    if (entry) pipelineStatus = entry[0]
  }
  
  return {
    ...(pipelineStatus ? { pipelineStatus } : {}),
    ...(dealStage ? { dealStage } : {}),
  }
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

async function patchTwentyCompanyHome(
  twentyCompanyId: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return twentyFetch<TwentyMutationResponse>(`/rest/companies/${twentyCompanyId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
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
      paradigmSalesMaterialUrl: linkField("営業資料URL", karte.salesMaterialUrl),
      paradigmDemoUrl: linkField("デモURL", karte.demoUrl),
      paradigmCustomerPortalUrl: linkField("顧客用Notion URL", karte.customerPortalUrl),
      paradigmCountryName: countryLabel(karte.targetCountry),
      paradigmRegionName: karte.regionName ?? "",
      paradigmIndustryName: industryLabel(karte.industry),
      paradigmSourceName: karte.sourceName ?? "",
      paradigmSalesStatus: salesStatusLabel(karte),
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
    const twentyCompany = existing?.id ? existing : await createTwentyCompany(karte)
    if (!twentyCompany.id) throw new Error("Twenty company id missing")

    await syncTwentyCompanyHomeFields(karte, twentyCompany.id)
    const opportunityIds = await syncTwentyOpportunities(sb, karte, twentyCompany.id)

    await sb.from("sales_sync_logs").insert([
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
      pipeline_run_id: options.pipelineRunId ?? null,
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
        .from("sales_companies")
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

        await sb.from("sales_sync_logs").insert({
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
    })

    updated += 1
  }

  return { ok: true, configured: true, scanned: records.length, created, updated, skipped, pipelineRunsCreated, failures }
}
