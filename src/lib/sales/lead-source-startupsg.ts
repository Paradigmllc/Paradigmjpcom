type JsonRecord = Record<string, unknown>

const STARTUP_SG_HOST = "www.startupsg.gov.sg"
const STARTUP_SG_PATH = "/api/v0/search/profiles/startup"
const DEFAULT_PAGE_SIZE = 100
const MAX_PAGE_SIZE = 100
const DEFAULT_MAX_RECORDS = 4_000
const MAX_RECORDS = 5_000
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024
const MAX_ATTEMPTS = 2

export interface StartupSgDirectoryInput {
  sourceUrl: string
  maxRecords: number
  employeeMax: number
  pageSize: number
}

interface StartupSgPage {
  total?: unknown
  data?: unknown
}

function boundedInteger(value: unknown, fallback: number, maximum: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? Math.min(Math.max(parsed, 1), maximum) : fallback
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
}

function textValue(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null
  const normalized = String(value).replace(/\s+/g, " ").trim()
  return normalized || null
}

function nestedText(value: unknown, key: string): string | null {
  return textValue(asRecord(value)[key])
}

function names(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => nestedText(entry, "name")).filter((entry): entry is string => Boolean(entry))
}

export function startupSgEmployeeUpperBound(value: unknown): number | null {
  const label = typeof value === "string" ? value : nestedText(value, "name")
  if (!label) return null
  const match = label.match(/^(\d+)\s*-\s*(\d+)$/)
  return match ? Number(match[2]) : null
}

function normalizedStartupRow(value: unknown, employeeMax: number): JsonRecord | null {
  const row = asRecord(value)
  if (row.isInactive === true) return null
  const id = textValue(row.id)
  const companyName = textValue(row.displayName) ?? textValue(row.registeredName)
  const websiteUrl = nestedText(row.website, "url")
  const employeeCount = startupSgEmployeeUpperBound(row.rangeEmployee)
  if (!id || !companyName || !websiteUrl || !employeeCount || employeeCount > employeeMax) return null

  const sectorNames = names(row.sectors)
  const businessModelNames = names(row.businessModels)
  const descriptor = textValue(row.companyDescriptor) ?? textValue(row.companyDescription)
  const stage = nestedText(row.investmentStage, "name")
  const businessType = [...sectorNames, ...businessModelNames, stage, descriptor]
    .filter((entry): entry is string => Boolean(entry))
    .join(" | ")
    .slice(0, 1_000)

  return {
    external_id: textValue(row.uen) ?? id,
    company_name: companyName,
    website_url: websiteUrl,
    employee_count: employeeCount,
    business_type: businessType || null,
    source_page_url: `https://${STARTUP_SG_HOST}/profiles/${encodeURIComponent(id)}`,
    is_sme: true,
    is_for_profit: true,
  }
}

function assertSourceUrl(sourceUrl: string): URL {
  const url = new URL(sourceUrl)
  if (url.protocol !== "https:" || url.hostname !== STARTUP_SG_HOST || url.pathname !== STARTUP_SG_PATH) {
    throw new Error("Startup SG source must use the official HTTPS startup directory API")
  }
  return url
}

function pageUrl(input: StartupSgDirectoryInput, from: number): URL {
  const url = assertSourceUrl(input.sourceUrl)
  url.searchParams.set("inactive[]", "0")
  url.searchParams.set("type", "listing")
  url.searchParams.set("size", String(input.pageSize))
  url.searchParams.set("sort", "id")
  url.searchParams.set("from", String(from))
  return url
}

async function fetchPage(url: URL): Promise<StartupSgPage> {
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "ParadigmLeadSourceIngest/1.0 (+https://paradigmjp.com)",
        },
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
      })
      if (!response.ok) {
        if ((response.status === 429 || response.status >= 500) && attempt < MAX_ATTEMPTS) continue
        throw new Error(`Startup SG source returned HTTP ${response.status}`)
      }
      const contentLength = Number(response.headers.get("content-length") ?? 0)
      if (contentLength > MAX_RESPONSE_BYTES) throw new Error("Startup SG page exceeded the response byte limit")
      const body = await response.text()
      if (Buffer.byteLength(body) > MAX_RESPONSE_BYTES) throw new Error("Startup SG page exceeded the response byte limit")
      return JSON.parse(body) as StartupSgPage
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Startup SG page request failed")
      if (attempt >= MAX_ATTEMPTS) break
    }
  }
  throw lastError ?? new Error("Startup SG page request failed")
}

export async function fetchStartupSgDirectoryRows(input: StartupSgDirectoryInput): Promise<{ rows: JsonRecord[]; rawCount: number }> {
  assertSourceUrl(input.sourceUrl)
  const rows: JsonRecord[] = []
  const domains = new Set<string>()
  let rawCount = 0
  let expectedTotal = input.maxRecords

  for (let from = 0; from < Math.min(expectedTotal, input.maxRecords); from += input.pageSize) {
    const page = await fetchPage(pageUrl(input, from))
    const pageRows = Array.isArray(page.data) ? page.data : []
    const total = boundedInteger(page.total, pageRows.length, MAX_RECORDS)
    expectedTotal = Math.min(total, input.maxRecords)
    rawCount = Math.min(total, input.maxRecords)

    for (const value of pageRows) {
      const row = normalizedStartupRow(value, input.employeeMax)
      if (!row) continue
      let domain: string
      try {
        domain = new URL(String(row.website_url)).hostname.toLowerCase().replace(/^www\./, "")
      } catch (error) {
        console.warn("[lead-source-startupsg] invalid company website:", error)
        continue
      }
      if (!domain || domains.has(domain)) continue
      domains.add(domain)
      rows.push(row)
      if (rows.length >= input.maxRecords) return { rows, rawCount }
    }
    if (pageRows.length < input.pageSize) break
  }

  return { rows, rawCount }
}

export function startupSgInputFromFieldMapping(sourceUrl: string, mapping: JsonRecord): StartupSgDirectoryInput | null {
  if (mapping.startup_sg_directory !== "true") return null
  return {
    sourceUrl,
    maxRecords: boundedInteger(mapping.startup_sg_max_records, DEFAULT_MAX_RECORDS, MAX_RECORDS),
    employeeMax: boundedInteger(mapping.startup_sg_employee_max, 200, 249),
    pageSize: boundedInteger(mapping.startup_sg_page_size, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
  }
}
