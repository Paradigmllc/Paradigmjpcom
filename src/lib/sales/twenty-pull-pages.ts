import {
  normalizeDomain,
  twentyFetch,
  type TwentyListResponse,
  type TwentyRecord,
} from "./twenty-sync-utils"

type JsonRecord = Record<string, unknown>

export interface TwentyPullPageFailure {
  twentyCompanyId: string | null
  domain: string | null
  reason: string
}

interface TwentyPagedListResponse<T> extends TwentyListResponse<T> {
  pageInfo?: JsonRecord
  data?: TwentyListResponse<T>["data"] & {
    pageInfo?: JsonRecord
  }
}

interface TwentyPageOptions {
  pageSize?: number
  maxPages?: number
}

function plainRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function stringField(record: JsonRecord, key: string): string | null {
  const value = record[key]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function booleanField(record: JsonRecord, key: string): boolean | null {
  const value = record[key]
  return typeof value === "boolean" ? value : null
}

function pageInfoFromResponse<T>(response: TwentyPagedListResponse<T>): JsonRecord {
  const root = plainRecord(response)
  const data = plainRecord(root.data)
  return {
    ...plainRecord(root.pageInfo),
    ...plainRecord(data.pageInfo),
  }
}

function nextCursorFromResponse<T>(response: TwentyPagedListResponse<T>): string | null {
  const pageInfo = pageInfoFromResponse(response)
  return (
    stringField(pageInfo, "nextCursor") ??
    stringField(pageInfo, "endCursor") ??
    stringField(pageInfo, "cursor")
  )
}

function hasNextPageFromResponse<T>(response: TwentyPagedListResponse<T>): boolean | null {
  return booleanField(pageInfoFromResponse(response), "hasNextPage")
}

function twentyRecordKey(record: TwentyRecord): string | null {
  if (record.id) return `id:${record.id}`
  const domain = normalizeDomain(record.domainName?.primaryLinkUrl) ?? normalizeDomain(record.domainName?.primaryLinkLabel)
  return domain ? `domain:${domain}` : null
}

export async function fetchTwentyCompanyPages(
  totalLimit: number,
  options: TwentyPageOptions,
): Promise<{ ok: true; records: TwentyRecord[]; failures: TwentyPullPageFailure[] } | { ok: false; error: string }> {
  const pageSize = Math.max(1, Math.min(Math.round(options.pageSize ?? 200), 200, totalLimit))
  const maxPages = Math.max(1, Math.min(Math.round(options.maxPages ?? Math.ceil(totalLimit / pageSize)), 500))
  const records: TwentyRecord[] = []
  const failures: TwentyPullPageFailure[] = []
  const seenRecords = new Set<string>()
  const seenCursors = new Set<string>()
  let cursor: string | null = null

  for (let page = 0; page < maxPages && records.length < totalLimit; page += 1) {
    const remaining = totalLimit - records.length
    const requestLimit = Math.min(pageSize, remaining)
    const params = new URLSearchParams({
      limit: String(requestLimit),
      order_by: "createdAt[DescNullsLast]",
    })
    if (cursor) params.set("cursor", cursor)

    const result = await twentyFetch<TwentyPagedListResponse<TwentyRecord>>(`/rest/companies?${params.toString()}`)
    if (!result.ok) return { ok: false, error: result.error }

    const pageRecords = result.data.data?.companies ?? []
    if (pageRecords.length === 0) break

    let added = 0
    for (const record of pageRecords) {
      const key = twentyRecordKey(record)
      if (key && seenRecords.has(key)) continue
      if (key) seenRecords.add(key)
      records.push(record)
      added += 1
      if (records.length >= totalLimit) break
    }

    if (added === 0) {
      failures.push({
        twentyCompanyId: pageRecords[0]?.id ?? null,
        domain: normalizeDomain(pageRecords[0]?.domainName?.primaryLinkUrl) ?? null,
        reason: "Twenty REST pagination returned only duplicate records; stopped to avoid an infinite cursor loop.",
      })
      break
    }

    const hasNext = hasNextPageFromResponse(result.data)
    const nextCursor = nextCursorFromResponse(result.data)
    if (hasNext === false || !nextCursor) break
    if (seenCursors.has(nextCursor)) {
      failures.push({
        twentyCompanyId: pageRecords[0]?.id ?? null,
        domain: normalizeDomain(pageRecords[0]?.domainName?.primaryLinkUrl) ?? null,
        reason: "Twenty REST pagination repeated the same cursor; stopped to avoid an infinite cursor loop.",
      })
      break
    }
    seenCursors.add(nextCursor)
    cursor = nextCursor
  }

  return { ok: true, records, failures }
}
