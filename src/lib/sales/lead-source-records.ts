import { createHash } from "node:crypto"
import { load } from "cheerio"
import { parse as parseCsv } from "csv-parse/sync"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { normalizePublicDomain } from "./japan-entry-score"
import { passesPublicDnsCheck } from "./japan-entry-score-service"
import type { LeadSourcePreflightSummary } from "./lead-source-preflight"
import { fetchFilteredZipCsvRows, zipCsvInputFromFieldMapping } from "./lead-source-zip-csv"
import { fetchSpecialLeadSourceRows } from "./lead-source-special-adapters"

type JsonRecord = Record<string, unknown>
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>
const MAX_SOURCE_BYTES = 25 * 1024 * 1024
const INGESTION_LOCK_MS = 10 * 60_000
const COMMON_CRAWL_PREVIEW_MAX_RECORDS = 100

export const LEAD_SOURCE_TYPES = [
  "official_directory",
  "export_directory",
  "trade_association",
  "exhibitor_directory",
  "company_registry",
  "structured_feed",
] as const
export const LEAD_SOURCE_FORMATS = ["json", "jsonl", "csv", "html", "zip_csv"] as const

export type LeadSourceType = (typeof LEAD_SOURCE_TYPES)[number]
export type LeadSourceFormat = (typeof LEAD_SOURCE_FORMATS)[number]

export interface LeadSourceConfig {
  id: string
  name: string
  country_code: string
  source_type: LeadSourceType
  source_url: string
  source_format: LeadSourceFormat
  trust_tier: number
  field_mapping: JsonRecord
  active: boolean
  terms_checked: boolean
  approval_status: "draft" | "approved" | "suspended"
  approved_by: string | null
  approved_at: string | null
  last_preview: JsonRecord
  last_previewed_at: string | null
  pilot_approved_by: string | null
  pilot_approved_at: string | null
  last_preflight: LeadSourcePreflightSummary | JsonRecord
  last_preflighted_at: string | null
  last_status: string
  last_error: string | null
  last_record_count: number
  last_ingested_at: string | null
  created_at: string
  updated_at: string
  source_pack_id?: string | null
  source_pack_version?: number | null
  source_license_name?: string | null
  source_license_url?: string | null
  source_pack_query_sha256?: string | null
}

export interface LeadSourcePreview {
  sourceId: string
  rawCount: number
  accepted: number
  rejected: number
  acceptanceRate: number
  sample: Array<Pick<NormalizedSourceRecord, "company_name" | "domain" | "source_page_url" | "business_type" | "employee_count">>
  previewedAt: string
}

export interface LeadSourceRecord {
  id: string
  source_config_id: string
  external_id: string | null
  company_name: string
  domain: string
  website_url: string
  country_code: string
  source_page_url: string
  business_type: string | null
  employee_count: number | null
  annual_revenue_usd: number | null
  is_for_profit: boolean | null
  is_sme?: boolean | null
  evidence: JsonRecord
  observed_at: string
  last_selected_at?: string | null
  selection_count?: number
  preflight_status?: "pending" | "checking" | "eligible" | "retryable" | "rejected"
  preflight_reason?: string | null
  preflight_checked_at?: string | null
  preflight_attempts?: number
  preflight_evidence?: JsonRecord
}

export interface NormalizedSourceRecord {
  external_id: string | null
  company_name: string
  domain: string
  website_url: string
  country_code: string
  source_page_url: string
  business_type: string | null
  employee_count: number | null
  annual_revenue_usd: number | null
  is_for_profit: boolean | null
  is_sme: boolean | null
  evidence: JsonRecord
  content_hash: string
}

function getSb(): ServiceSupabase {
  const sb = getServiceSalesSupabase()
  if (!sb) throw new Error("Supabase service_role not configured")
  return sb
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
}

function textValue(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null
  const normalized = String(value).replace(/\s+/g, " ").trim()
  return normalized || null
}

function scaledNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.round(value)
  if (typeof value !== "string") return null
  const normalized = value.replace(/,/g, "")
  const globalMultiplier = /billion/i.test(normalized) ? 1_000_000_000 : /million/i.test(normalized) ? 1_000_000 : /thousand/i.test(normalized) ? 1_000 : 1
  const values = [...normalized.matchAll(/(\d+(?:\.\d+)?)\s*([kmb])?/gi)].map((match) => {
    const suffix = match[2]?.toLowerCase()
    const multiplier = suffix === "b" ? 1_000_000_000 : suffix === "m" ? 1_000_000 : suffix === "k" ? 1_000 : globalMultiplier
    return Number(match[1]) * multiplier
  }).filter((item) => Number.isFinite(item) && item >= 0)
  return values.length > 0 ? Math.round(Math.max(...values)) : null
}

function booleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (typeof value !== "string") return null
  if (/^(?:true|yes|1|for-profit|commercial)$/i.test(value.trim())) return true
  if (/^(?:false|no|0|nonprofit|non-profit|charity)$/i.test(value.trim())) return false
  return null
}

function mappedValue(record: JsonRecord, mapping: JsonRecord, field: string, fallbacks: string[]): unknown {
  const configured = textValue(mapping[field])
  const paths = configured ? [configured, ...fallbacks] : fallbacks
  for (const path of paths) {
    let current: unknown = record
    for (const segment of path.split(".")) current = asRecord(current)[segment]
    if (current !== undefined && current !== null && textValue(current) !== null) return current
  }
  return null
}

function configuredSourcePageHosts(mapping: JsonRecord): string[] {
  const configured = textValue(mapping.source_page_allowed_hosts)
  if (!configured) return []
  return [...new Set(configured
    .split(/[\s,]+/)
    .map((value) => normalizePublicDomain(value))
    .filter((value): value is string => Boolean(value)))]
}

function hostMatches(hostname: string, allowedHostname: string): boolean {
  return hostname === allowedHostname || hostname.endsWith(`.${allowedHostname}`)
}

function safeSourcePageUrl(value: unknown, sourceUrl: string, allowedHosts: string[] = []): string {
  try {
    const base = new URL(sourceUrl)
    const resolved = new URL(textValue(value) ?? sourceUrl, base)
    const baseHost = base.hostname.toLowerCase().replace(/^www\./, "")
    const resolvedHost = resolved.hostname.toLowerCase().replace(/^www\./, "")
    const approvedExternalHost = allowedHosts.some((host) => hostMatches(resolvedHost, host.replace(/^www\./, "")))
    if (resolved.protocol !== "https:" || (!hostMatches(resolvedHost, baseHost) && !approvedExternalHost)) return sourceUrl
    resolved.hash = ""
    return resolved.toString()
  } catch (error) {
    console.warn("[lead-source-records] invalid source page URL:", error)
    return sourceUrl
  }
}

function normalizedWebsite(value: unknown): { domain: string; websiteUrl: string } | null {
  const raw = textValue(value)
  if (!raw) return null
  const domain = normalizePublicDomain(raw)
  if (!domain) return null
  return { domain, websiteUrl: `https://${domain}` }
}

function contentHash(value: JsonRecord): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

function normalizeStructuredRecord(record: JsonRecord, config: LeadSourceConfig): NormalizedSourceRecord | null {
  const mapping = asRecord(config.field_mapping)
  const allowedSourcePageHosts = configuredSourcePageHosts(mapping)
  const companyName = textValue(mappedValue(record, mapping, "company_name", ["company_name", "companyName", "name", "company"]))
  const website = normalizedWebsite(mappedValue(record, mapping, "website_url", ["website_url", "websiteUrl", "website", "domain", "url"]))
  if (!companyName || !website) return null
  const businessType = mappedValue(record, mapping, "business_type", ["business_type", "businessType", "category", "industry"])
  const employeeCount = mappedValue(record, mapping, "employee_count", ["employee_count", "employeeCount", "employees", "staff_count"])
  const annualRevenue = mappedValue(record, mapping, "annual_revenue_usd", ["annual_revenue_usd", "annualRevenueUsd", "revenue_usd"])
  const forProfit = mapping.is_for_profit_constant ?? mappedValue(record, mapping, "is_for_profit", ["is_for_profit", "isForProfit", "for_profit"])
  const isSme = mapping.is_sme_constant ?? mappedValue(record, mapping, "is_sme", ["is_sme", "isSme", "SME"])
  const contactPageUrl = mappedValue(record, mapping, "contact_page_url", ["contact_page_url"])
  const offerPageUrl = mappedValue(record, mapping, "offer_page_url", ["offer_page_url"])
  const evidence = {
    source_name: config.name,
    source_type: config.source_type,
    trust_tier: config.trust_tier,
    observed_values: {
      company_name: companyName.slice(0, 200),
      website_url: website.websiteUrl,
      business_type: textValue(businessType)?.slice(0, 200) ?? null,
      employee_count: textValue(employeeCount),
      annual_revenue_usd: textValue(annualRevenue),
      is_for_profit: textValue(forProfit),
      is_sme: textValue(isSme),
      contact_page_url: textValue(contactPageUrl),
      offer_page_url: textValue(offerPageUrl),
    },
  }
  return {
    external_id: textValue(mappedValue(record, mapping, "external_id", ["external_id", "externalId", "id", "registration_number"]))?.slice(0, 200) ?? null,
    company_name: companyName.slice(0, 200),
    domain: website.domain,
    website_url: website.websiteUrl,
    country_code: config.country_code,
    source_page_url: safeSourcePageUrl(mappedValue(record, mapping, "source_page_url", ["source_page_url", "sourcePageUrl", "detail_url", "profile_url"]), config.source_url, allowedSourcePageHosts),
    business_type: textValue(businessType)?.slice(0, 200) ?? null,
    employee_count: scaledNumberValue(employeeCount),
    annual_revenue_usd: scaledNumberValue(annualRevenue),
    is_for_profit: booleanValue(forProfit),
    is_sme: booleanValue(isSme),
    evidence,
    content_hash: contentHash(evidence),
  }
}

function structuredRows(text: string, format: LeadSourceFormat): JsonRecord[] {
  if (format === "zip_csv") throw new Error("ZIP CSV sources must use the bounded archive adapter")
  if (format === "jsonl") {
    return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => asRecord(JSON.parse(line)))
  }
  if (format === "csv") {
    return parseCsv(text, { columns: true, skip_empty_lines: true, relax_column_count: true, bom: true }) as JsonRecord[]
  }
  const parsed = JSON.parse(text) as unknown
  if (Array.isArray(parsed)) return parsed.map(asRecord)
  const root = asRecord(parsed)
  const nested = root.records ?? root.items ?? root.data ?? root.results
  return Array.isArray(nested) ? nested.map(asRecord) : []
}

function htmlRows(text: string, config: LeadSourceConfig): JsonRecord[] {
  const mapping = asRecord(config.field_mapping)
  const recordSelector = textValue(mapping.record_selector)
  const nameSelector = textValue(mapping.company_name_selector)
  const websiteSelector = textValue(mapping.website_selector)
  if (!recordSelector || !nameSelector || !websiteSelector) {
    throw new Error("HTML source requires record_selector, company_name_selector, and website_selector")
  }
  const $ = load(text)
  const rows: JsonRecord[] = []
  $(recordSelector).each((_index, element) => {
    const item = $(element)
    const websiteNode = item.find(websiteSelector).first()
    const pageSelector = textValue(mapping.source_page_selector)
    const fieldSelector = (key: string): string | null => textValue(mapping[`${key}_selector`])
    rows.push({
      company_name: item.find(nameSelector).first().text(),
      website_url: websiteNode.attr(textValue(mapping.website_attribute) ?? "href") ?? websiteNode.text(),
      source_page_url: pageSelector ? item.find(pageSelector).first().attr("href") ?? item.find(pageSelector).first().text() : config.source_url,
      business_type: fieldSelector("business_type") ? item.find(fieldSelector("business_type") as string).first().text() : null,
      employee_count: fieldSelector("employee_count") ? item.find(fieldSelector("employee_count") as string).first().text() : null,
      annual_revenue_usd: fieldSelector("annual_revenue_usd") ? item.find(fieldSelector("annual_revenue_usd") as string).first().text() : null,
      is_for_profit: fieldSelector("is_for_profit") ? item.find(fieldSelector("is_for_profit") as string).first().text() : null,
    })
  })
  return rows
}

function normalizeRows(rawRows: JsonRecord[], config: LeadSourceConfig, rawCount = rawRows.length): { records: NormalizedSourceRecord[]; rawCount: number } {
  const normalized = rawRows.map((row) => normalizeStructuredRecord(row, config)).filter((row): row is NormalizedSourceRecord => row !== null)
  const byDomain = new Map(normalized.map((row) => [row.domain, row]))
  return { records: [...byDomain.values()], rawCount }
}

export function parseLeadSourcePayload(text: string, config: LeadSourceConfig): { records: NormalizedSourceRecord[]; rawCount: number } {
  const rawRows = config.source_format === "html" ? htmlRows(text, config) : structuredRows(text, config.source_format)
  return normalizeRows(rawRows, config)
}

async function fetchSourceText(config: LeadSourceConfig): Promise<string> {
  if (config.source_format === "zip_csv") throw new Error("ZIP CSV sources must use the bounded archive adapter")
  const sourceFormat = config.source_format
  let url = new URL(config.source_url)
  const acceptByFormat: Record<Exclude<LeadSourceFormat, "zip_csv">, string> = {
    json: "application/json",
    jsonl: "application/x-ndjson, application/json;q=0.9",
    csv: "text/csv",
    html: "text/html, application/xhtml+xml;q=0.9",
  }
  for (let redirect = 0; redirect <= 5; redirect++) {
    if (url.protocol !== "https:" || !normalizePublicDomain(url.hostname)) throw new Error("Source URL must be a public HTTPS URL")
    if (!(await passesPublicDnsCheck(url.hostname))) throw new Error("Source URL did not pass the public DNS safety check")
    const response = await fetch(url, {
      headers: {
        Accept: acceptByFormat[sourceFormat],
        "User-Agent": "ParadigmLeadSourceIngest/1.0 (+https://paradigmjp.com)",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(60_000),
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location) throw new Error(`Source redirect ${response.status} omitted Location`)
      url = new URL(location, url)
      continue
    }
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`)
    const contentLength = Number(response.headers.get("content-length") ?? 0)
    if (contentLength > MAX_SOURCE_BYTES) throw new Error(`Source exceeds ${MAX_SOURCE_BYTES} byte limit`)
    if (!response.body) return ""
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let total = 0
    let text = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_SOURCE_BYTES) {
        await reader.cancel()
        throw new Error(`Source exceeds ${MAX_SOURCE_BYTES} byte limit`)
      }
      text += decoder.decode(value, { stream: true })
    }
    return text + decoder.decode()
  }
  throw new Error("Source exceeded five redirects")
}

async function fetchParsedSource(config: LeadSourceConfig): Promise<{ records: NormalizedSourceRecord[]; rawCount: number }> {
  const special = await fetchSpecialLeadSourceRows(config)
  if (special) return normalizeRows(special.rows, config, special.rawCount)
  if (config.source_format === "zip_csv") {
    const input = zipCsvInputFromFieldMapping(config.source_url, config.field_mapping)
    const parsed = await fetchFilteredZipCsvRows(input)
    return normalizeRows(parsed.rows, config, parsed.rawCount)
  }
  return parseLeadSourcePayload(await fetchSourceText(config), config)
}

export function boundedPreviewSourceConfig(config: LeadSourceConfig): LeadSourceConfig {
  const mapping = asRecord(config.field_mapping)
  if (mapping.common_crawl_domain_signal !== "true") return config
  return {
    ...config,
    field_mapping: {
      ...mapping,
      common_crawl_max_records: String(COMMON_CRAWL_PREVIEW_MAX_RECORDS),
    },
  }
}

function preflightCount(config: LeadSourceConfig, key: keyof Pick<LeadSourcePreflightSummary, "eligible" | "pending" | "checking">): number {
  const summary = asRecord(config.last_preflight)
  const value = summary[key]
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}
export async function listLeadSourceConfigs(): Promise<Array<LeadSourceConfig & { record_count: number; eligible_record_count: number }>> {
  const configs = await getSb().from(DB_TABLES.SALES_LEAD_SOURCE_CONFIGS).select("*").order("country_code").order("trust_tier", { ascending: false })
  if (configs.error) throw new Error(configs.error.message)
  return ((configs.data ?? []) as LeadSourceConfig[]).map((config) => ({
    ...config,
    record_count: config.last_record_count,
    eligible_record_count: preflightCount(config, "eligible"),
  }))
}

export async function previewLeadSourceConfig(sourceId: string): Promise<LeadSourcePreview> {
  const sb = getSb()
  const result = await sb.from(DB_TABLES.SALES_LEAD_SOURCE_CONFIGS).select("*").eq("id", sourceId).single()
  if (result.error) throw new Error(result.error.message)
  const config = result.data as LeadSourceConfig
  if (!config.terms_checked) throw new Error("Source terms and robots policy must be confirmed before preview")
  const parsed = await fetchParsedSource(boundedPreviewSourceConfig(config))
  const accepted = parsed.records.length
  const previewedAt = new Date().toISOString()
  const preview: LeadSourcePreview = {
    sourceId,
    rawCount: parsed.rawCount,
    accepted,
    rejected: Math.max(0, parsed.rawCount - accepted),
    acceptanceRate: parsed.rawCount > 0 ? Math.round((accepted / parsed.rawCount) * 10_000) / 100 : 0,
    sample: parsed.records.slice(0, 5).map((record) => ({
      company_name: record.company_name,
      domain: record.domain,
      source_page_url: record.source_page_url,
      business_type: record.business_type,
      employee_count: record.employee_count,
    })),
    previewedAt,
  }
  const updated = await sb.from(DB_TABLES.SALES_LEAD_SOURCE_CONFIGS).update({
    last_preview: preview,
    last_previewed_at: previewedAt,
    last_error: accepted > 0 ? null : "Preview returned no valid company name + public website records",
  }).eq("id", sourceId)
  if (updated.error) throw new Error(updated.error.message)
  return preview
}

export async function ingestLeadSourceConfig(sourceId: string): Promise<{ sourceId: string; accepted: number; rejected: number }> {
  const sb = getSb()
  const result = await sb.from(DB_TABLES.SALES_LEAD_SOURCE_CONFIGS).select("*").eq("id", sourceId).single()
  if (result.error) throw new Error(result.error.message)
  const config = result.data as LeadSourceConfig
  if (!config.active) throw new Error("Inactive source cannot be ingested")
  if (!config.terms_checked) throw new Error("Source terms and robots policy must be confirmed before ingestion")
  if (config.approval_status !== "approved") throw new Error("Source must be previewed and approved before ingestion")
  if (config.last_status === "running" && Date.now() - Date.parse(config.updated_at) < INGESTION_LOCK_MS) {
    throw new Error("Lead source ingestion is already running")
  }
  const claimed = await sb.from(DB_TABLES.SALES_LEAD_SOURCE_CONFIGS)
    .update({ last_status: "running", last_error: null })
    .eq("id", sourceId)
    .eq("updated_at", config.updated_at)
    .select("id")
    .maybeSingle()
  if (claimed.error) throw new Error(claimed.error.message)
  if (!claimed.data) throw new Error("Lead source was changed or another ingestion already started")
  try {
    const parsed = await fetchParsedSource(config)
    const rows = parsed.records
    if (rows.length === 0) throw new Error("Source returned no valid company name + public website records")
    const observedAt = new Date().toISOString()
    for (let index = 0; index < rows.length; index += 500) {
      const part = rows.slice(index, index + 500).map((row) => ({
        ...row,
        source_config_id: sourceId,
        active: true,
        observed_at: observedAt,
        preflight_status: "pending",
        preflight_reason: null,
        preflight_checked_at: null,
        preflight_attempts: 0,
        preflight_evidence: {},
      }))
      const saved = await sb.from(DB_TABLES.SALES_LEAD_SOURCE_RECORDS).upsert(part, { onConflict: "source_config_id,domain", ignoreDuplicates: false })
      if (saved.error) throw new Error(saved.error.message)
    }
    const deactivate = await sb.from(DB_TABLES.SALES_LEAD_SOURCE_RECORDS).update({ active: false }).eq("source_config_id", sourceId).lt("observed_at", observedAt)
    if (deactivate.error) throw new Error(deactivate.error.message)
    const updated = await sb.from(DB_TABLES.SALES_LEAD_SOURCE_CONFIGS).update({
      last_status: "ready",
      last_error: null,
      last_record_count: rows.length,
      last_ingested_at: observedAt,
      last_preflight: {
        total: rows.length,
        pending: rows.length,
        checking: 0,
        eligible: 0,
        retryable: 0,
        rejected: 0,
        reasonCounts: {},
        completed: false,
      },
      last_preflighted_at: null,
      pilot_approved_by: null,
      pilot_approved_at: null,
    }).eq("id", sourceId)
    if (updated.error) throw new Error(updated.error.message)
    return { sourceId, accepted: rows.length, rejected: Math.max(0, parsed.rawCount - rows.length) }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lead source ingestion failed"
    console.error("[lead-source-records] ingestion failed:", sourceId, error)
    const failed = await sb.from(DB_TABLES.SALES_LEAD_SOURCE_CONFIGS).update({ last_status: "failed", last_error: message }).eq("id", sourceId)
    if (failed.error) console.error("[lead-source-records] failed to persist ingestion error:", failed.error.message)
    throw error
  }
}
