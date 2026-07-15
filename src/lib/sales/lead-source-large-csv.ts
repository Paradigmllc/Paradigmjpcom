import { parse } from "csv-parse"
import { normalizePublicDomain } from "./japan-entry-score"
import { passesPublicDnsCheck } from "./japan-entry-score-service"

type JsonRecord = Record<string, unknown>

const DEFAULT_MAX_BYTES = 90 * 1024 * 1024
const DEFAULT_MAX_ROWS = 500_000
const DEFAULT_MAX_RECORDS = 50_000

export interface LargeCsvInput {
  sourceUrl: string
  websiteField: string
  employeeField: string | null
  employeeMin: number | null
  employeeMax: number | null
  maxBytes: number
  maxRows: number
  maxRecords: number
  allowedHosts: string[]
}

function textValue(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null
  const normalized = String(value).replace(/\s+/g, " ").trim()
  return normalized || null
}

function boundedInteger(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback
}

function optionalNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function allowedHost(hostname: string, hosts: string[]): boolean {
  const normalized = hostname.toLowerCase().replace(/^www\./, "")
  return hosts.some((host) => normalized === host || normalized.endsWith(`.${host}`))
}

async function fetchCsvResponse(input: LargeCsvInput): Promise<Response> {
  let url = new URL(input.sourceUrl)
  for (let redirect = 0; redirect <= 5; redirect++) {
    if (url.protocol !== "https:" || !allowedHost(url.hostname, input.allowedHosts)) {
      throw new Error("Large CSV source must use an explicitly allowed HTTPS host")
    }
    if (!(await passesPublicDnsCheck(url.hostname))) throw new Error("Large CSV source failed public DNS safety check")
    const response = await fetch(url, {
      headers: { Accept: "text/csv", "User-Agent": "ParadigmLeadSourceIngest/1.0 (+https://paradigmjp.com)" },
      redirect: "manual",
      signal: AbortSignal.timeout(180_000),
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location) throw new Error(`Large CSV redirect ${response.status} omitted Location`)
      url = new URL(location, url)
      continue
    }
    if (!response.ok) throw new Error(`Large CSV source returned HTTP ${response.status}`)
    const contentLength = Number(response.headers.get("content-length") ?? 0)
    if (contentLength > input.maxBytes) throw new Error(`Large CSV source exceeds ${input.maxBytes} bytes`)
    return response
  }
  throw new Error("Large CSV source exceeded five redirects")
}

export async function fetchFilteredLargeCsvRows(input: LargeCsvInput): Promise<{ rows: JsonRecord[]; rawCount: number }> {
  const response = await fetchCsvResponse(input)
  if (!response.body) return { rows: [], rawCount: 0 }
  const parser = parse({ columns: true, skip_empty_lines: true, relax_column_count: true, bom: true })
  const byDomain = new Map<string, JsonRecord>()
  let rawCount = 0
  let totalBytes = 0

  const consume = (async () => {
    for await (const value of parser) {
      rawCount += 1
      if (rawCount > input.maxRows) throw new Error(`Large CSV source exceeds ${input.maxRows} rows`)
      const record = value as JsonRecord
      const website = textValue(record[input.websiteField])
      const domain = website ? normalizePublicDomain(website) : null
      if (!domain || byDomain.has(domain) || byDomain.size >= input.maxRecords) continue
      const employees = input.employeeField ? optionalNumber(record[input.employeeField]) : null
      if (input.employeeMin !== null && (employees === null || employees < input.employeeMin)) continue
      if (input.employeeMax !== null && (employees === null || employees > input.employeeMax)) continue
      byDomain.set(domain, record)
    }
  })()

  try {
    const reader = response.body.getReader()
    while (byDomain.size < input.maxRecords) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > input.maxBytes) {
        await reader.cancel()
        throw new Error(`Large CSV source exceeds ${input.maxBytes} bytes`)
      }
      if (!parser.write(Buffer.from(value))) await new Promise<void>((resolve) => parser.once("drain", resolve))
    }
    if (byDomain.size >= input.maxRecords) await reader.cancel()
    parser.end()
    await consume
    return { rows: [...byDomain.values()], rawCount }
  } catch (error) {
    parser.destroy(error instanceof Error ? error : new Error("Large CSV parsing failed"))
    await consume.catch((consumeError) => console.error("[lead-source-large-csv] parser failed:", consumeError))
    throw error
  }
}

export function largeCsvInputFromFieldMapping(sourceUrl: string, mapping: JsonRecord): LargeCsvInput | null {
  if (textValue(mapping.large_csv_stream) !== "true") return null
  const websiteField = textValue(mapping.large_csv_website_field)
  const allowedHosts = textValue(mapping.large_csv_allowed_hosts)?.split(/[\s,]+/).map((host) => host.toLowerCase().replace(/^www\./, "")).filter(Boolean) ?? []
  if (!websiteField || allowedHosts.length === 0) throw new Error("Large CSV source requires a website field and allowed hosts")
  return {
    sourceUrl,
    websiteField,
    employeeField: textValue(mapping.large_csv_employee_field),
    employeeMin: optionalNumber(mapping.large_csv_employee_min),
    employeeMax: optionalNumber(mapping.large_csv_employee_max),
    maxBytes: boundedInteger(mapping.large_csv_max_bytes, DEFAULT_MAX_BYTES, 120 * 1024 * 1024),
    maxRows: boundedInteger(mapping.large_csv_max_rows, DEFAULT_MAX_ROWS, 1_000_000),
    maxRecords: boundedInteger(mapping.large_csv_max_records, DEFAULT_MAX_RECORDS, 50_000),
    allowedHosts,
  }
}
