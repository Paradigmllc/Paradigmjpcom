export interface TwentyLinkField {
  primaryLinkUrl?: string | null
  primaryLinkLabel?: string | null
}

export interface TwentyRecord {
  id?: string
  name?: string
  updatedAt?: string | null
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
  paradigmDataStatus?: string | null
  paradigmDataSources?: string | null
  paradigmNextAction?: string | null
  paradigmLastError?: string | null
  paradigmKarteScore?: number | null
  paradigmSourceCoverage?: number | string | null
  paradigmRecommendedProducts?: string[] | null
  paradigmKarteSummary?: {
    markdown?: string | null
  } | null
  paradigmLeadStatus?: string | null
  paradigmTechnology?: string | null
  paradigmOpportunityScore?: number | null
  paradigmSmbScore?: number | null
}

export interface TwentyListResponse<T> {
  data?: {
    companies?: T[]
    opportunities?: T[]
  }
}

export interface TwentyMutationResponse {
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
  dryRun?: boolean
  scanned: number
  created: number
  updated: number
  skipped: number
  failures: { twentyCompanyId?: string | null; domain?: string | null; reason: string }[]
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

export function env(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

export function twentyBaseUrl(): string | null {
  const base = env("TWENTY_BASE_URL")
  return base ? base.replace(/\/$/, "") : null
}

function twentyFetchTimeoutMs(): number {
  const raw = process.env.TWENTY_FETCH_TIMEOUT_MS
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
  return Number.isFinite(parsed) && parsed >= 1_000 ? parsed : 8_000
}

export function normalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null
  try {
    const withProto = input.startsWith("http") ? input : `https://${input}`
    return new URL(withProto).hostname.replace(/^www\./, "").toLowerCase()
  } catch (error) {
    console.warn("[twenty-sync] invalid domain:", { input, error })
    return null
  }
}

export function domainMatches(record: TwentyRecord, domain: string): boolean {
  // Strict exact match after normalization — no partial/subdomain matching.
  // example.com must NOT match example.com.au or myexample.com.
  const normalized = normalizeDomain(domain)
  if (!normalized) return false
  const url = normalizeDomain(record.domainName?.primaryLinkUrl)
  const label = normalizeDomain(record.domainName?.primaryLinkLabel)
  return url === normalized || label === normalized
}

export async function twentyFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const baseUrl = twentyBaseUrl()
  const apiKey = env("TWENTY_API_KEY")
  if (!baseUrl || !apiKey) {
    const msg = "Twenty is the Sales OS SSOT — TWENTY_BASE_URL and TWENTY_API_KEY are REQUIRED. Sync cannot proceed."
    console.error(`[twenty-sync] ${msg}`)
    return { ok: false, error: msg }
  }

  // Circuit breaker: don't hammer a failing Twenty instance
  const opKey = init.method === "GET" || !init.method ? "read" : "write"
  // Dynamic import to avoid circular dependency — circuit is loaded lazily
  let circuitGate = true
  try {
    const { circuitAllows } = await import("./twenty-circuit")
    circuitGate = circuitAllows(opKey)
  } catch {
    // If circuit module can't be loaded, proceed without it
  }
  if (!circuitGate) {
    return { ok: false, error: "Twenty circuit breaker is open — all calls blocked temporarily" }
  }

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(twentyFetchTimeoutMs()),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    })

    const text = await res.text()
    if (!res.ok) {
      const { circuitReportFailure } = await import("./twenty-circuit").catch(() => ({ circuitReportFailure: () => {} }))
      circuitReportFailure(opKey)
      return { ok: false, error: text || `Twenty API HTTP ${res.status}` }
    }

    try {
      const data = JSON.parse(text) as T
      const { circuitReportSuccess } = await import("./twenty-circuit").catch(() => ({ circuitReportSuccess: () => {} }))
      circuitReportSuccess(opKey)
      return { ok: true, data }
    } catch (error) {
      console.error("[twenty-sync] invalid JSON response:", error)
      const { circuitReportFailure } = await import("./twenty-circuit").catch(() => ({ circuitReportFailure: () => {} }))
      circuitReportFailure(opKey)
      return { ok: false, error: "Twenty API returned invalid JSON" }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Twenty API request failed"
    console.error("[twenty-sync] request failed:", error)
    const { circuitReportFailure } = await import("./twenty-circuit").catch(() => ({ circuitReportFailure: () => {} }))
    circuitReportFailure(opKey)
    return { ok: false, error: message }
  }
}

export function linkField(label: string, url: string | null): { primaryLinkLabel: string; primaryLinkUrl: string } {
  return {
    primaryLinkLabel: url ? label : "",
    primaryLinkUrl: url ?? "",
  }
}

export function productOptionValue(code: string): string {
  return code.toUpperCase()
}

export const COUNTRY_LABELS: Record<string, string> = {
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

export const INDUSTRY_LABELS: Record<string, string> = {
  beauty_salon: "美容サロン",
  dental: "歯科医院",
  restaurant: "飲食店",
  construction: "建設・工務店",
  accounting: "会計事務所",
  retail: "小売・店舗",
  cleaning: "清掃・メンテナンス",
  consulting: "コンサルティング",
}

export const PIPELINE_LABELS: Record<string, string> = {
  pending: "未診断",
  scanning: "カルテ生成中",
  report_ready: "送信待ち",
  sent: "送信済み",
  manual_queue: "手動確認",
}

export function countryLabel(country: string): string {
  return COUNTRY_LABELS[country.toUpperCase()] ?? country.toUpperCase()
}

export function industryLabel(industry: string | null): string {
  if (!industry) return ""
  return INDUSTRY_LABELS[industry] ?? industry
}

export function parseSalesStatusLabel(label: string | null): { pipelineStatus?: string; dealStage?: string } {
  if (!label) return {}
  const parts = label.split(" / ")
  const pipelineLabel = parts[0]?.trim()
  const dealStage = parts[1]?.trim()

  let pipelineStatus: string | undefined
  if (pipelineLabel) {
    const entry = Object.entries(PIPELINE_LABELS).find(([, val]) => val.startsWith(pipelineLabel))
    pipelineStatus = entry?.[0] ?? pipelineLabel
  }

  return {
    ...(pipelineStatus ? { pipelineStatus } : {}),
    ...(dealStage ? { dealStage } : {}),
  }
}
