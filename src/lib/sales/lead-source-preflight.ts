import { lookup } from "node:dns/promises"
import { isPrivateAddress } from "./japan-entry-score-service"
import { normalizePublicDomain } from "./japan-entry-score"
import { getProxyFetchOptions } from "./proxy-agent"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

const PREFLIGHT_CHUNK_SIZE = 50
const PREFLIGHT_CONCURRENCY = 10
const PREFLIGHT_TIMEOUT_MS = 8_000
const MAX_REDIRECTS = 5

export const LEAD_SOURCE_PREFLIGHT_MODES = ["pending", "retryable", "all", "continue"] as const
export type LeadSourcePreflightMode = (typeof LEAD_SOURCE_PREFLIGHT_MODES)[number]
export type LeadSourcePreflightStatus = "eligible" | "retryable" | "rejected"

export interface LeadSourcePreflightSummary {
  total: number
  pending: number
  checking: number
  eligible: number
  retryable: number
  rejected: number
  reasonCounts: Record<string, number>
  completed: boolean
  checkedAt: string
}

interface PreflightRecord {
  id: string
  source_config_id: string
  domain: string
  website_url: string
}

interface AddressRecord {
  address: string
  family: number
}

interface PreflightDependencies {
  resolveHost?: (hostname: string) => Promise<AddressRecord[]>
  fetchUrl?: typeof fetch
  now?: () => Date
}

export interface LeadSourceWebsiteAssessment {
  status: LeadSourcePreflightStatus
  reason: string
  checkedAt: string
  evidence: JsonRecord
}

export interface LeadSourcePreflightChunkResult {
  sourceId: string
  processed: number
  remaining: number
  summary: LeadSourcePreflightSummary
}

function getSb(): ServiceSupabase {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")
  return sb
}

function errorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "unknown"
  const code = (error as { code?: unknown }).code
  if (typeof code === "string" && /^[A-Z0-9_]+$/.test(code)) return code.toLowerCase()
  const name = (error as { name?: unknown }).name
  return typeof name === "string" ? name.toLowerCase().replace(/[^a-z0-9_]+/g, "_") : "unknown"
}

function assessment(
  status: LeadSourcePreflightStatus,
  reason: string,
  checkedAt: string,
  evidence: JsonRecord,
): LeadSourceWebsiteAssessment {
  return { status, reason, checkedAt, evidence: { ...evidence, status, reason, checkedAt } }
}

async function resolvePublicHost(
  hostname: string,
  resolver: (hostname: string) => Promise<AddressRecord[]>,
): Promise<{ ok: true; addresses: AddressRecord[] } | { ok: false; status: "retryable" | "rejected"; reason: string }> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const addresses = await resolver(hostname)
      if (addresses.length === 0) return { ok: false, status: "rejected", reason: "dns_no_records" }
      if (addresses.some((entry) => isPrivateAddress(entry.address))) {
        return { ok: false, status: "rejected", reason: "dns_private_or_reserved" }
      }
      return { ok: true, addresses }
    } catch (error) {
      const code = errorCode(error)
      if (["enotfound", "enodata", "eai_noname"].includes(code)) {
        return { ok: false, status: "rejected", reason: `dns_${code}` }
      }
      if (attempt === 2) return { ok: false, status: "retryable", reason: `dns_${code}` }
    }
  }
  return { ok: false, status: "retryable", reason: "dns_unknown" }
}

function asSummary(value: unknown): LeadSourcePreflightSummary {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
  const count = (key: string): number => {
    const valueAtKey = record[key]
    return typeof valueAtKey === "number" && Number.isFinite(valueAtKey) ? valueAtKey : Number(valueAtKey ?? 0) || 0
  }
  const rawReasons = record.reasonCounts && typeof record.reasonCounts === "object" && !Array.isArray(record.reasonCounts)
    ? record.reasonCounts as JsonRecord
    : {}
  const reasonCounts = Object.fromEntries(Object.entries(rawReasons)
    .filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1])))
  return {
    total: count("total"),
    pending: count("pending"),
    checking: count("checking"),
    eligible: count("eligible"),
    retryable: count("retryable"),
    rejected: count("rejected"),
    reasonCounts,
    completed: record.completed === true,
    checkedAt: typeof record.checkedAt === "string" ? record.checkedAt : new Date().toISOString(),
  }
}

export async function assessLeadSourceWebsite(
  input: Pick<PreflightRecord, "domain" | "website_url">,
  dependencies: PreflightDependencies = {},
): Promise<LeadSourceWebsiteAssessment> {
  const now = dependencies.now ?? (() => new Date())
  const checkedAt = now().toISOString()
  const resolver = dependencies.resolveHost ?? ((hostname) => lookup(hostname, { all: true, verbatim: true }))
  const fetchUrl = dependencies.fetchUrl ?? fetch
  const normalizedDomain = normalizePublicDomain(input.domain)
  if (!normalizedDomain) return assessment("rejected", "invalid_public_domain", checkedAt, {})

  let current: URL
  try {
    current = new URL(input.website_url)
  } catch (error) {
    console.warn("[lead-source-preflight] invalid website URL:", error)
    return assessment("rejected", "invalid_website_url", checkedAt, {})
  }

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    if (current.protocol !== "https:" || !normalizePublicDomain(current.hostname)) {
      return assessment("rejected", "non_public_https_url", checkedAt, { url: current.toString() })
    }
    const dns = await resolvePublicHost(current.hostname, resolver)
    if (!dns.ok) return assessment(dns.status, dns.reason, checkedAt, { hostname: current.hostname })

    let response: Response
    try {
      response = await fetchUrl(current, getProxyFetchOptions({
        redirect: "manual",
        signal: AbortSignal.timeout(PREFLIGHT_TIMEOUT_MS),
        headers: {
          Accept: "text/html,application/xhtml+xml;q=0.9",
          Range: "bytes=0-4095",
          "User-Agent": "ParadigmLeadSourcePreflight/1.0 (+https://paradigmjp.com)",
        },
      }))
    } catch (error) {
      console.warn("[lead-source-preflight] homepage request failed:", current.hostname, error)
      return assessment("retryable", `http_${errorCode(error)}`, checkedAt, {
        hostname: current.hostname,
        addressCount: dns.addresses.length,
      })
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      await response.body?.cancel().catch((error) => console.warn("[lead-source-preflight] response cancel failed:", error))
      if (!location) return assessment("rejected", "redirect_missing_location", checkedAt, { httpStatus: response.status })
      try {
        current = new URL(location, current)
      } catch (error) {
        console.warn("[lead-source-preflight] invalid redirect URL:", error)
        return assessment("rejected", "invalid_redirect_url", checkedAt, { httpStatus: response.status })
      }
      continue
    }

    await response.body?.cancel().catch((error) => console.warn("[lead-source-preflight] response cancel failed:", error))
    const baseEvidence = {
      hostname: current.hostname,
      finalUrl: current.toString(),
      httpStatus: response.status,
      addressCount: dns.addresses.length,
      addressFamilies: [...new Set(dns.addresses.map((entry) => entry.family))],
      redirects: redirect,
    }
    if (response.status >= 500 || [401, 403, 408, 425, 429].includes(response.status)) {
      return assessment("retryable", `http_${response.status}`, checkedAt, baseEvidence)
    }
    if (!response.ok) return assessment("rejected", `http_${response.status}`, checkedAt, baseEvidence)
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? ""
    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      return assessment("rejected", "non_html_homepage", checkedAt, { ...baseEvidence, contentType: contentType.slice(0, 120) })
    }
    return assessment("eligible", "website_ready", checkedAt, baseEvidence)
  }

  return assessment("rejected", "too_many_redirects", checkedAt, {})
}

async function preparePreflight(sb: ServiceSupabase, sourceId: string, mode: LeadSourcePreflightMode): Promise<void> {
  if (mode === "continue" || mode === "pending") return
  let query = sb.from(DB_TABLES.SALES_LEAD_SOURCE_RECORDS).update({
    preflight_status: "pending",
    preflight_reason: null,
    preflight_checked_at: null,
    preflight_evidence: {},
  }).eq("source_config_id", sourceId).eq("active", true)
  if (mode === "retryable") query = query.eq("preflight_status", "retryable")
  const reset = await query
  if (reset.error) throw new Error(reset.error.message)
  const sourceReset = await sb.from(DB_TABLES.SALES_LEAD_SOURCE_CONFIGS).update({
    pilot_approved_by: null,
    pilot_approved_at: null,
    last_preflighted_at: null,
  }).eq("id", sourceId)
  if (sourceReset.error) throw new Error(sourceReset.error.message)
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0
  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

export async function runLeadSourcePreflightChunk(input: {
  sourceId: string
  mode: LeadSourcePreflightMode
}): Promise<LeadSourcePreflightChunkResult> {
  const sb = getSb()
  const sourceResult = await sb.from(DB_TABLES.SALES_LEAD_SOURCE_CONFIGS)
    .select("id,active,approval_status,last_status")
    .eq("id", input.sourceId)
    .single()
  if (sourceResult.error) throw new Error(sourceResult.error.message)
  const source = sourceResult.data as { active?: boolean; approval_status?: string; last_status?: string }
  if (!source.active || source.approval_status !== "approved" || source.last_status !== "ready") {
    throw new Error("Only an active, approved and ingested source can be preflighted")
  }

  await preparePreflight(sb, input.sourceId, input.mode)
  const claimed = await sb.rpc("sales_claim_lead_source_preflight_records", {
    p_source_config_id: input.sourceId,
    p_limit: PREFLIGHT_CHUNK_SIZE,
  })
  if (claimed.error) throw new Error(claimed.error.message)
  const records = (claimed.data ?? []) as PreflightRecord[]
  const results = await mapWithConcurrency(records, PREFLIGHT_CONCURRENCY, async (record) => {
    let result: LeadSourceWebsiteAssessment
    try {
      result = await assessLeadSourceWebsite(record)
    } catch (error) {
      console.error("[lead-source-preflight] unexpected assessment failure:", record.domain, error)
      const checkedAt = new Date().toISOString()
      result = assessment("retryable", `preflight_${errorCode(error)}`, checkedAt, {})
    }
    return {
      id: record.id,
      status: result.status,
      reason: result.reason,
      checked_at: result.checkedAt,
      evidence: result.evidence,
    }
  })
  const completed = await sb.rpc("sales_complete_lead_source_preflight", {
    p_source_config_id: input.sourceId,
    p_results: results,
  })
  if (completed.error) throw new Error(completed.error.message)
  const summary = asSummary(completed.data)
  return {
    sourceId: input.sourceId,
    processed: results.length,
    remaining: summary.pending,
    summary,
  }
}
