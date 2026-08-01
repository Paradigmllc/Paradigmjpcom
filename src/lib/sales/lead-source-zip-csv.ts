import { parse } from "csv-parse"
import { Open } from "unzipper"
import { normalizePublicDomain } from "./japan-entry-score"
import { passesPublicDnsCheck } from "./japan-entry-score-service"

export type ZipCsvRow = Record<string, string>

export interface ZipCsvFilter {
  field: string
  value: string
}

export interface ZipCsvInput {
  sourceUrl: string
  archiveEntry: string
  delimiter: string
  requiredFields: string[]
  datasetFilters: ZipCsvFilter[]
  viewFilters: ZipCsvFilter[]
}

type FieldMapping = Record<string, unknown>

interface ParsedZipCsv {
  rows: ZipCsvRow[]
  rawCount: number
}

const MAX_ARCHIVE_BYTES = 80 * 1024 * 1024
const MAX_ENTRY_BYTES = 120 * 1024 * 1024
const MAX_ENTRY_ROWS = 500_000
const MAX_CACHED_ROWS = 25_000
const CACHE_TTL_MS = 6 * 60 * 60_000
const cache = new Map<string, { expiresAt: number; promise: Promise<ZipCsvRow[]> }>()

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : ""
}

function requiredText(mapping: FieldMapping, key: string): string {
  const value = text(mapping[key])
  if (!value) throw new Error(`ZIP CSV source requires field_mapping.${key}`)
  return value
}

function numberedFilters(mapping: FieldMapping, prefix: "zip_dataset_filter" | "zip_view_filter"): ZipCsvFilter[] {
  const filters: ZipCsvFilter[] = []
  for (let index = 1; index <= 10; index += 1) {
    const field = text(mapping[`${prefix}_${index}_field`])
    const value = text(mapping[`${prefix}_${index}_value`])
    if (!field && !value) continue
    if (!field || !value) throw new Error(`ZIP CSV source has an incomplete ${prefix}_${index} pair`)
    filters.push({ field, value })
  }
  return filters
}

export function zipCsvInputFromFieldMapping(sourceUrl: string, mapping: FieldMapping): ZipCsvInput {
  const requiredFields = requiredText(mapping, "zip_required_fields").split(",").map((value) => value.trim()).filter(Boolean)
  const datasetFilters = numberedFilters(mapping, "zip_dataset_filter")
  const viewFilters = numberedFilters(mapping, "zip_view_filter")
  if (requiredFields.length === 0) throw new Error("ZIP CSV source requires at least one required field")
  if (viewFilters.length === 0) throw new Error("ZIP CSV source requires at least one view filter")
  return {
    sourceUrl,
    archiveEntry: requiredText(mapping, "zip_archive_entry"),
    delimiter: requiredText(mapping, "zip_csv_delimiter"),
    requiredFields,
    datasetFilters,
    viewFilters,
  }
}

function matches(row: ZipCsvRow, filters: ZipCsvFilter[]): boolean {
  return filters.every((filter) => text(row[filter.field]).toLowerCase() === filter.value.trim().toLowerCase())
}

function hasRequiredFields(row: ZipCsvRow, fields: string[]): boolean {
  return fields.every((field) => text(row[field]).length > 0)
}

async function fetchArchive(sourceUrl: string): Promise<Buffer> {
  let url = new URL(sourceUrl)
  for (let redirect = 0; redirect <= 5; redirect += 1) {
    if (url.protocol !== "https:" || !normalizePublicDomain(url.hostname)) throw new Error("ZIP source URL must be a public HTTPS URL")
    if (!(await passesPublicDnsCheck(url.hostname))) throw new Error("ZIP source URL did not pass the public DNS safety check")
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(120_000),
      headers: {
        Accept: "application/zip, application/octet-stream;q=0.9",
        "User-Agent": "ParadigmLeadSourceIngest/1.0 (+https://paradigmjp.com)",
      },
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location) throw new Error(`ZIP source redirect ${response.status} omitted Location`)
      url = new URL(location, url)
      continue
    }
    if (!response.ok) throw new Error(`ZIP source returned HTTP ${response.status}`)
    const contentType = response.headers.get("content-type") ?? ""
    if (contentType && !/(?:zip|octet-stream)/i.test(contentType)) throw new Error(`ZIP source returned unsupported content type: ${contentType}`)
    const declaredSize = Number(response.headers.get("content-length") ?? 0)
    if (declaredSize > MAX_ARCHIVE_BYTES) throw new Error(`ZIP source exceeds ${MAX_ARCHIVE_BYTES} byte limit`)
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.byteLength > MAX_ARCHIVE_BYTES) throw new Error(`ZIP source exceeds ${MAX_ARCHIVE_BYTES} byte limit`)
    return buffer
  }
  throw new Error("ZIP source exceeded five redirects")
}

export async function parseZipCsvBuffer(buffer: Buffer, input: Omit<ZipCsvInput, "sourceUrl" | "viewFilters">): Promise<ZipCsvRow[]> {
  if (buffer.byteLength > MAX_ARCHIVE_BYTES) throw new Error(`ZIP source exceeds ${MAX_ARCHIVE_BYTES} byte limit`)
  const directory = await Open.buffer(buffer)
  const entry = directory.files.find((file) => file.type === "File" && file.path === input.archiveEntry)
  if (!entry) throw new Error(`ZIP source does not contain ${input.archiveEntry}`)
  if (entry.uncompressedSize > MAX_ENTRY_BYTES) throw new Error(`ZIP entry exceeds ${MAX_ENTRY_BYTES} byte limit`)

  const rows: ZipCsvRow[] = []
  let rawRows = 0
  const parser = entry.stream().pipe(parse({
    columns: true,
    delimiter: input.delimiter,
    bom: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }))
  for await (const value of parser) {
    rawRows += 1
    if (rawRows > MAX_ENTRY_ROWS) throw new Error(`ZIP entry exceeds ${MAX_ENTRY_ROWS} row limit`)
    if (!value || typeof value !== "object" || Array.isArray(value)) continue
    const row = Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, text(item)]))
    if (!hasRequiredFields(row, input.requiredFields) || !matches(row, input.datasetFilters)) continue
    rows.push(row)
    if (rows.length > MAX_CACHED_ROWS) throw new Error(`ZIP source exceeds ${MAX_CACHED_ROWS} filtered row limit`)
  }
  return rows
}

function cacheKey(input: ZipCsvInput): string {
  return JSON.stringify({
    sourceUrl: input.sourceUrl,
    archiveEntry: input.archiveEntry,
    delimiter: input.delimiter,
    requiredFields: [...input.requiredFields].sort(),
    datasetFilters: [...input.datasetFilters].sort((a, b) => `${a.field}:${a.value}`.localeCompare(`${b.field}:${b.value}`)),
  })
}

async function cachedDatasetRows(input: ZipCsvInput): Promise<ZipCsvRow[]> {
  const key = cacheKey(input)
  const current = cache.get(key)
  if (current && current.expiresAt > Date.now()) return current.promise
  const promise = fetchArchive(input.sourceUrl)
    .then((buffer) => parseZipCsvBuffer(buffer, input))
    .catch((error) => {
      cache.delete(key)
      throw error
    })
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, promise })
  return promise
}

export async function fetchFilteredZipCsvRows(input: ZipCsvInput): Promise<ParsedZipCsv> {
  const rows = (await cachedDatasetRows(input)).filter((row) => matches(row, input.viewFilters))
  return { rows: rows.map((row) => ({ ...row })), rawCount: rows.length }
}

export function clearZipCsvCacheForTests(): void {
  cache.clear()
}
