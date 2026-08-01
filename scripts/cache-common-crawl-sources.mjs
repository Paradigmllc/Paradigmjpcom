import { createHash } from "node:crypto"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

const CRAWL = process.env.COMMON_CRAWL_INDEX?.trim() || "CC-MAIN-2026-25"
const PAGE_COUNT = 15
const MAX_RECORDS = 5_000
const REQUEST_TIMEOUT_MS = 60_000
const REQUEST_GAP_MS = 1_500
const OBJECT_PREFIX = "lead-source-cache/common-crawl"

const MARKET_PATTERNS = {
  AE: "*.ae", AT: "*.at", AU: "*.com.au", BE: "*.be", BH: "*.bh", CA: "*.ca", CH: "*.ch",
  DE: "*.de", DK: "*.dk", ES: "*.es", FI: "*.fi", FR: "*.fr", GB: "*.co.uk", IE: "*.ie",
  IL: "*.il", IT: "*.it", KW: "*.kw", NL: "*.nl", NO: "*.no", NZ: "*.co.nz", OM: "*.om",
  PT: "*.pt", QA: "*.qa", SA: "*.sa", SE: "*.se", SG: "*.sg",
}

const SIGNAL_FILTERS = { contact: "url:contact", commerce: "url:shop", saas: "url:pricing" }

function required(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

function list(value, fallback) {
  return (value?.trim() || fallback).split(",").map((item) => item.trim()).filter(Boolean)
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function buildQuery(pattern, filter) {
  const params = new URLSearchParams({
    url: pattern,
    output: "json",
    collapse: "urlkey",
    fl: "url,timestamp,digest",
    pageSize: "100",
  })
  params.append("filter", "status:200")
  params.append("filter", "mime:text/html")
  params.append("filter", filter)
  return `https://index.commoncrawl.org/${CRAWL}-index?${params.toString()}`
}

function cacheObjectKey(queryUrl) {
  const url = new URL(queryUrl)
  url.searchParams.delete("page")
  url.searchParams.sort()
  const digest = createHash("sha256").update(url.toString()).digest("hex")
  return `${OBJECT_PREFIX}/${digest}.jsonl`
}

function hostOf(rawUrl) {
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    return url.hostname.toLowerCase().replace(/^www\./u, "")
  } catch (error) {
    console.error("[common-crawl-cache] ignored invalid URL:", error instanceof Error ? error.message : error)
    return null
  }
}

async function fetchPage(queryUrl, page) {
  const url = new URL(queryUrl)
  if (page !== null) url.searchParams.set("page", String(page))
  let lastError = new Error("Common Crawl request failed")
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/x-ndjson, application/json;q=0.9",
          "User-Agent": "ParadigmLeadSourceCache/1.0 (+https://paradigmjp.com)",
        },
        redirect: "error",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (!response.ok) throw new Error(`Common Crawl HTTP ${response.status}`)
      return await response.text()
    } catch (error) {
      lastError = error instanceof Error ? error : lastError
      if (attempt < 3) await wait(attempt * 2_000)
    }
  }
  throw lastError
}

function collectRows(text, rowsByHost) {
  for (const line of text.split(/\r?\n/u)) {
    if (!line.trim()) continue
    try {
      const row = JSON.parse(line)
      const host = typeof row?.url === "string" ? hostOf(row.url) : null
      if (!host || rowsByHost.has(host)) continue
      rowsByHost.set(host, {
        url: row.url,
        timestamp: typeof row.timestamp === "string" ? row.timestamp : null,
        digest: typeof row.digest === "string" ? row.digest : null,
      })
      if (rowsByHost.size >= MAX_RECORDS) return
    } catch (error) {
      console.error("[common-crawl-cache] ignored malformed JSONL row:", error instanceof Error ? error.message : error)
    }
  }
}

async function cacheSource(client, bucket, countryCode, signal) {
  const queryUrl = buildQuery(MARKET_PATTERNS[countryCode], SIGNAL_FILTERS[signal])
  const rowsByHost = new Map()
  let lastPageError = null
  console.error(`[common-crawl-cache] ${countryCode}/${signal} fetching default index page`)
  try {
    collectRows(await fetchPage(queryUrl, null), rowsByHost)
  } catch (error) {
    lastPageError = error instanceof Error ? error : new Error("Common Crawl default page failed")
    console.error(`[common-crawl-cache] ${countryCode}/${signal} default page skipped:`, lastPageError.message)
  }
  for (let page = 0; page < PAGE_COUNT && rowsByHost.size < MAX_RECORDS; page += 1) {
    console.error(`[common-crawl-cache] ${countryCode}/${signal} page ${page} (${rowsByHost.size}/${MAX_RECORDS})`)
    try {
      collectRows(await fetchPage(queryUrl, page), rowsByHost)
    } catch (error) {
      lastPageError = error instanceof Error ? error : new Error(`Common Crawl page ${page} failed`)
      console.error(`[common-crawl-cache] ${countryCode}/${signal} page ${page} skipped:`, lastPageError.message)
    }
    if (page + 1 < PAGE_COUNT && rowsByHost.size < MAX_RECORDS) await wait(REQUEST_GAP_MS)
  }
  if (rowsByHost.size === 0) throw lastPageError ?? new Error(`${countryCode}/${signal} returned zero usable domains`)
  const body = `${[...rowsByHost.values()].map((row) => JSON.stringify(row)).join("\n")}\n`
  const key = cacheObjectKey(queryUrl)
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: "application/x-ndjson",
    CacheControl: "public, max-age=300",
    Metadata: { country: countryCode, signal, crawl: CRAWL, records: String(rowsByHost.size) },
  }))
  return { countryCode, signal, records: rowsByHost.size, key, bytes: Buffer.byteLength(body) }
}

async function main() {
  const accountId = required("CLOUDFLARE_R2_ACCOUNT_ID")
  const accessKeyId = required("CLOUDFLARE_R2_ACCESS_KEY_ID")
  const secretAccessKey = required("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
  const bucket = required("CLOUDFLARE_R2_BUCKET")
  const countries = list(process.env.COMMON_CRAWL_MARKETS, "CA,GB,DE,FR,SE")
  const signals = list(process.env.COMMON_CRAWL_SIGNALS, "commerce")
  const invalidCountries = countries.filter((code) => !MARKET_PATTERNS[code])
  const invalidSignals = signals.filter((signal) => !SIGNAL_FILTERS[signal])
  if (invalidCountries.length > 0 || invalidSignals.length > 0) {
    throw new Error(`Invalid cache selection: countries=${invalidCountries.join(",")} signals=${invalidSignals.join(",")}`)
  }
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
  const completed = []
  const failures = []
  const jobs = countries.flatMap((countryCode) => signals.map((signal) => ({ countryCode, signal })))
  let nextJob = 0
  async function worker() {
    while (true) {
      const job = jobs[nextJob]
      nextJob += 1
      if (!job) return
      try {
        completed.push(await cacheSource(client, bucket, job.countryCode, job.signal))
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown cache failure"
        console.error(`[common-crawl-cache] ${job.countryCode}/${job.signal} failed:`, message)
        failures.push({ countryCode: job.countryCode, signal: job.signal, error: message })
      }
    }
  }
  await Promise.all([worker(), worker()])
  console.error(JSON.stringify({ ok: failures.length === 0, completed, failures }, null, 2))
  if (failures.length > 0) process.exitCode = 1
}

await main()
