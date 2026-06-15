import { gunzipSync } from "node:zlib"
import { countrySignalsFromText } from "../passive-inventory-utils"
import type { CandidateCountrySignal } from "../lead-candidate-scoring"
import { detectTechFromEvidence, type TechItem } from "./wappalyzer"

interface CdxRow {
  url?: string
  filename?: string
  offset?: string
  length?: string
  mime?: string
  status?: string
}

export interface CommonCrawlPassiveEvidence {
  ok: boolean
  domain: string
  countrySignals: CandidateCountrySignal[]
  technologies: TechItem[]
  textSample: string | null
  pagesChecked: number
  error?: string
}

const CDX_API = "https://index.commoncrawl.org"
const DATA_API = "https://data.commoncrawl.org"
const FALLBACK_INDEXES = ["CC-MAIN-2026-21", "CC-MAIN-2026-17", "CC-MAIN-2026-12"]

let cachedIndexes: string[] | null = null

async function getIndexes(): Promise<string[]> {
  if (cachedIndexes) return cachedIndexes
  try {
    const res = await fetch(`${CDX_API}/collinfo.json`, {
      headers: { "User-Agent": "RevenueOS-CommonCrawlPassive/1.0" },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`collinfo HTTP ${res.status}`)
    const rows = await res.json() as Array<{ id?: unknown }>
    cachedIndexes = rows
      .map((row) => (typeof row.id === "string" ? row.id : null))
      .filter((id): id is string => !!id && /^CC-MAIN-\d{4}-\d{2}$/.test(id))
      .slice(0, 3)
  } catch (error) {
    console.error("[commoncrawl-passive] collinfo failed:", error)
    cachedIndexes = FALLBACK_INDEXES
  }
  return cachedIndexes
}

async function cdxRows(domain: string, limit: number): Promise<CdxRow[]> {
  for (const index of await getIndexes()) {
    const endpoint = `${CDX_API}/${index}-index?url=${encodeURIComponent(domain)}/*&output=json&filter=status:200&filter=mime:text/html&limit=${limit}`
    const res = await fetch(endpoint, {
      headers: { "User-Agent": "RevenueOS-CommonCrawlPassive/1.0" },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) continue
    const rows = (await res.text()).trim().split("\n").filter(Boolean).map((line) => {
      try {
        return JSON.parse(line) as CdxRow
      } catch (error) {
        console.warn("[commoncrawl-passive] skipped malformed CDX row:", error)
        return null
      }
    }).filter((row): row is CdxRow => row !== null && !!row.filename && !!row.offset && !!row.length)
    if (rows.length > 0) return rows
  }
  return []
}

function extractHttpBody(record: Buffer): string {
  const text = record.toString("utf8")
  const first = text.indexOf("\r\n\r\n")
  if (first < 0) return text
  const second = text.indexOf("\r\n\r\n", first + 4)
  return second >= 0 ? text.slice(second + 4) : text.slice(first + 4)
}

function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

async function fetchArchivedText(row: CdxRow): Promise<string | null> {
  if (!row.filename || !row.offset || !row.length) return null
  const start = Number(row.offset)
  const length = Number(row.length)
  if (!Number.isFinite(start) || !Number.isFinite(length) || length <= 0) return null
  const res = await fetch(`${DATA_API}/${row.filename}`, {
    headers: { Range: `bytes=${start}-${start + length - 1}`, "User-Agent": "RevenueOS-CommonCrawlPassive/1.0" },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok && res.status !== 206) return null
  return extractHttpBody(gunzipSync(Buffer.from(await res.arrayBuffer())))
}

export async function fetchCommonCrawlPassiveEvidence(domain: string, countryCode: string, limit = 3): Promise<CommonCrawlPassiveEvidence> {
  const signals: CandidateCountrySignal[] = []
  const technologies = new Map<string, TechItem>()
  let textSample: string | null = null
  let pagesChecked = 0
  try {
    for (const row of await cdxRows(domain, limit)) {
      const html = await fetchArchivedText(row)
      if (!html) continue
      pagesChecked += 1
      const text = visibleText(html)
      textSample ??= text.slice(0, 800)
      signals.push(...countrySignalsFromText(countryCode, text))
      for (const tech of detectTechFromEvidence({ html })) {
        const key = tech.name.toLowerCase()
        const current = technologies.get(key)
        if (!current || (tech.confidence ?? 0) > (current.confidence ?? 0)) technologies.set(key, tech)
      }
      if (signals.length > 0 && technologies.size > 0) break
    }
    return { ok: pagesChecked > 0, domain, countrySignals: signals, technologies: [...technologies.values()], textSample, pagesChecked }
  } catch (error) {
    console.error("[commoncrawl-passive] evidence failed:", domain, error)
    return { ok: false, domain, countrySignals: signals, technologies: [...technologies.values()], textSample, pagesChecked, error: error instanceof Error ? error.message : "Common Crawl passive evidence failed" }
  }
}
