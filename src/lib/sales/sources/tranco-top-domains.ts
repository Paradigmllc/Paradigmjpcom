import { inflateRawSync } from "node:zlib"

export interface TrancoTopDomainResult {
  ok: boolean
  domains: string[]
  total: number
  error?: string
}

const TRANCO_TOP_1M_URL = "https://tranco-list.eu/top-1m.csv.zip"

let cachedTopDomains: Promise<string[]> | null = null

function domainMatchesPattern(domain: string, pattern: string): boolean {
  const suffix = pattern.replace(/^\*\./, "").replace(/^\*/, "").toLowerCase()
  return domain === suffix || domain.endsWith(`.${suffix}`)
}

function readUInt32(buffer: Buffer, offset: number): number {
  return buffer.readUInt32LE(offset)
}

function inflateFirstZipEntry(buffer: Buffer): Buffer {
  if (readUInt32(buffer, 0) !== 0x04034b50) throw new Error("Tranco zip local header not found")
  const flags = buffer.readUInt16LE(6)
  const method = buffer.readUInt16LE(8)
  let compressedSize = readUInt32(buffer, 18)
  const fileNameLength = buffer.readUInt16LE(26)
  const extraLength = buffer.readUInt16LE(28)
  const dataStart = 30 + fileNameLength + extraLength

  if (compressedSize === 0 || (flags & 0x08) !== 0) {
    const centralDirectoryOffset = buffer.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]))
    if (centralDirectoryOffset < 0) throw new Error("Tranco zip central directory not found")
    compressedSize = readUInt32(buffer, centralDirectoryOffset + 20)
  }

  const compressed = buffer.subarray(dataStart, dataStart + compressedSize)
  if (method === 0) return compressed
  if (method === 8) return inflateRawSync(compressed)
  throw new Error(`Unsupported Tranco zip compression method ${method}`)
}

async function fetchTopDomains(): Promise<string[]> {
  const res = await fetch(TRANCO_TOP_1M_URL, {
    headers: { "User-Agent": "RevenueOS-TrancoBulk/1.0" },
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`Tranco top list HTTP ${res.status}`)

  const csv = inflateFirstZipEntry(Buffer.from(await res.arrayBuffer())).toString("utf8")
  const domains: string[] = []
  for (const line of csv.split(/\r?\n/)) {
    const comma = line.indexOf(",")
    if (comma < 0) continue
    const domain = line.slice(comma + 1).trim().toLowerCase()
    if (domain.includes(".") && !domain.includes(" ")) domains.push(domain)
  }
  return domains
}

async function getTopDomains(): Promise<string[]> {
  cachedTopDomains ??= fetchTopDomains()
  return cachedTopDomains
}

export async function fetchTrancoTopDomains(pattern: string, limit = 5000): Promise<TrancoTopDomainResult> {
  try {
    const domains = await getTopDomains()
    const matched: string[] = []
    for (const domain of domains) {
      if (!domainMatchesPattern(domain, pattern)) continue
      matched.push(domain)
      if (matched.length >= limit) break
    }
    return { ok: true, domains: matched, total: matched.length }
  } catch (error) {
    console.error("[tranco-top-domains] fetch failed:", error)
    return {
      ok: false,
      domains: [],
      total: 0,
      error: error instanceof Error ? error.message : "Tranco top list fetch failed",
    }
  }
}
