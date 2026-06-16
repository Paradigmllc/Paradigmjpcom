import { normalizeDomain } from "@/lib/sales/dedup"

type JsonRecord = Record<string, unknown>

export type LeadDiscoverySource =
  | "searxng"
  | "whoogle"
  | "overpass"
  | "publicwww"
  | "rsshub_jobs"
  | "wellfound"
  | "whoisds_nrd"
  | "agency_directory"
  | "partner_directory"
  | "events_directory"
  | "osint_contacts"

export interface LeadDiscoveryInput {
  query: string
  source?: LeadDiscoverySource
  limit?: number
  market?: string
}

export interface LeadDiscoveryCandidate {
  companyName: string
  domain: string
  source: LeadDiscoverySource
  url: string
  title: string
  snippet: string
  market: string | null
  raw: JsonRecord
}

export interface LeadDiscoveryResult {
  ok: boolean
  source: LeadDiscoverySource
  candidates: LeadDiscoveryCandidate[]
  error?: string
}

const USER_AGENT = "Paradigm Lead Discovery/1.1 (+https://paradigmjp.com)"

const SERP_PRESETS: Record<Exclude<LeadDiscoverySource, "searxng" | "whoogle" | "overpass" | "publicwww" | "rsshub_jobs" | "whoisds_nrd">, string> = {
  wellfound: "site:wellfound.com/company",
  agency_directory: "(site:clutch.co OR site:sortlist.com) agency",
  partner_directory: "(site:experts.shopify.com OR site:webflow.com/experts) agency",
  events_directory: "(site:eventseye.com OR site:10times.com) exhibitor",
  osint_contacts: "(contact OR founder OR CEO OR marketing) email",
}

function env(name: string): string | null {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function safeUrl(value: string): URL | null {
  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`)
  } catch (e) {
    console.warn("[lead-discovery] invalid URL:", value, e instanceof Error ? e.message : String(e))
    return null
  }
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function candidateFromUrl(input: {
  url: string
  title?: string | null
  snippet?: string | null
  source: LeadDiscoverySource
  market?: string | null
  raw?: JsonRecord
}): LeadDiscoveryCandidate | null {
  const parsed = safeUrl(input.url)
  if (!parsed || !/^https?:$/.test(parsed.protocol)) return null
  const domain = normalizeDomain(parsed.hostname)
  if (!domain) return null
  const title = stripHtml(input.title ?? "") || domain
  return {
    companyName: title.replace(/\s+[|-].*$/, "").slice(0, 120),
    domain,
    source: input.source,
    url: parsed.toString(),
    title,
    snippet: stripHtml(input.snippet ?? "").slice(0, 500),
    market: input.market ?? null,
    raw: input.raw ?? {},
  }
}

function dedupe(candidates: LeadDiscoveryCandidate[], limit: number): LeadDiscoveryCandidate[] {
  const seen = new Set<string>()
  const out: LeadDiscoveryCandidate[] = []
  for (const candidate of candidates) {
    if (seen.has(candidate.domain)) continue
    seen.add(candidate.domain)
    out.push(candidate)
    if (out.length >= limit) break
  }
  return out
}

async function fetchBody(url: string, options: RequestInit = {}): Promise<{ text: string; contentType: string }> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json,text/html,text/xml,text/plain;q=0.9,*/*;q=0.8",
      ...(options.headers ?? {}),
    },
    signal: AbortSignal.timeout(18_000),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 160)}`)
  return { text, contentType: res.headers.get("content-type") ?? "" }
}

async function fetchJson(url: string, options: RequestInit = {}): Promise<unknown> {
  const { text } = await fetchBody(url, options)
  try {
    return JSON.parse(text) as unknown
  } catch (e) {
    console.warn("[lead-discovery] parse error:", e)
    return { html: text }
  }
}

function candidatesFromHtml(input: {
  html: string
  source: LeadDiscoverySource
  market?: string | null
  limit: number
}): LeadDiscoveryCandidate[] {
  const candidates: LeadDiscoveryCandidate[] = []
  for (const match of input.html.matchAll(/href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]{0,220}?)<\/a>/gi)) {
    const candidate = candidateFromUrl({
      url: match[1] ?? "",
      title: match[2] ?? null,
      source: input.source,
      market: input.market ?? null,
      raw: {},
    })
    if (candidate) candidates.push(candidate)
  }
  return dedupe(candidates, input.limit)
}

async function discoverViaSearxng(input: LeadDiscoveryInput, source: LeadDiscoverySource = "searxng"): Promise<LeadDiscoveryCandidate[]> {
  const base = env("SEARXNG_BASE_URL")
  if (!base) throw new Error("SEARXNG_BASE_URL is not configured")
  const url = new URL("/search", base)
  url.searchParams.set("q", input.query)
  url.searchParams.set("format", "json")
  url.searchParams.set("language", input.market ?? "en")
  const data = (await fetchJson(url.toString())) as { results?: Array<JsonRecord> }
  return dedupe(
    (data.results ?? [])
      .map((row) =>
        candidateFromUrl({
          url: String(row.url ?? ""),
          title: typeof row.title === "string" ? row.title : null,
          snippet: typeof row.content === "string" ? row.content : null,
          source,
          market: input.market ?? null,
          raw: row,
        }),
      )
      .filter((item): item is LeadDiscoveryCandidate => item !== null),
    input.limit ?? 25,
  )
}

async function discoverViaWhoogle(input: LeadDiscoveryInput, source: LeadDiscoverySource = "whoogle"): Promise<LeadDiscoveryCandidate[]> {
  const base = env("WHOOGLE_BASE_URL")
  if (!base) throw new Error("WHOOGLE_BASE_URL is not configured")
  const url = new URL("/search", base)
  url.searchParams.set("q", input.query)
  const data = (await fetchJson(url.toString(), { headers: { Accept: "text/html" } })) as { html?: string }
  return candidatesFromHtml({
    html: typeof data.html === "string" ? data.html : "",
    source,
    market: input.market ?? null,
    limit: input.limit ?? 25,
  })
}

async function discoverViaSearchPreset(input: LeadDiscoveryInput, source: LeadDiscoverySource): Promise<LeadDiscoveryCandidate[]> {
  const preset = SERP_PRESETS[source as keyof typeof SERP_PRESETS]
  const query = `${preset} ${input.query}`.trim()
  const presetInput = { ...input, query }
  try {
    return await discoverViaSearxng(presetInput, source)
  } catch (searxngError) {
    if (!env("WHOOGLE_BASE_URL")) throw searxngError
    return discoverViaWhoogle(presetInput, source)
  }
}

async function discoverViaRssHubJobs(input: LeadDiscoveryInput): Promise<LeadDiscoveryCandidate[]> {
  const template = env("RSSHUB_JOB_ROUTE_TEMPLATE")
  const base = env("RSSHUB_BASE_URL")
  if (!base || !template) {
    return discoverViaSearchPreset(
      {
        ...input,
        query: `(site:indeed.com OR site:glassdoor.com) (${input.query})`,
      },
      "rsshub_jobs",
    )
  }
  const path = template
    .replace("{query}", encodeURIComponent(input.query))
    .replace("{market}", encodeURIComponent(input.market ?? "us"))
  const url = new URL(path, base)
  const { text } = await fetchBody(url.toString(), { headers: { Accept: "text/xml,text/html" } })
  const candidates: LeadDiscoveryCandidate[] = []
  for (const match of text.matchAll(/<link>(https?:\/\/[^<]+)<\/link>[\s\S]{0,500}?<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<link>(https?:\/\/[^<]+)<\/link>[\s\S]{0,500}?<title>([\s\S]*?)<\/title>/gi)) {
    const candidate = candidateFromUrl({
      url: match[1] ?? match[3] ?? "",
      title: match[2] ?? match[4] ?? null,
      source: "rsshub_jobs",
      market: input.market ?? null,
      raw: { rsshub: true },
    })
    if (candidate) candidates.push(candidate)
  }
  return dedupe(candidates, input.limit ?? 25)
}

async function discoverViaPublicWww(input: LeadDiscoveryInput): Promise<LeadDiscoveryCandidate[]> {
  const key = env("PUBLICWWW_API_KEY")
  if (!key) throw new Error("PUBLICWWW_API_KEY is not configured")
  const url = new URL("https://publicwww.com/websites/")
  url.pathname += `${encodeURIComponent(input.query)}/`
  url.searchParams.set("export", "json")
  url.searchParams.set("key", key)
  const data = (await fetchJson(url.toString())) as { results?: Array<JsonRecord> } | JsonRecord[]
  const rows = Array.isArray(data) ? data : data.results ?? []
  return dedupe(
    rows
      .map((row) =>
        candidateFromUrl({
          url: String(row.url ?? row.domain ?? ""),
          title: typeof row.title === "string" ? row.title : String(row.domain ?? ""),
          snippet: typeof row.snippet === "string" ? row.snippet : null,
          source: "publicwww",
          market: input.market ?? null,
          raw: row,
        }),
      )
      .filter((item): item is LeadDiscoveryCandidate => item !== null),
    input.limit ?? 25,
  )
}

async function discoverViaWhoisDsNrd(input: LeadDiscoveryInput): Promise<LeadDiscoveryCandidate[]> {
  const configuredUrl = env("WHOISDS_NRD_URL")
  if (!configuredUrl) throw new Error("WHOISDS_NRD_URL is not configured")
  const { text } = await fetchBody(configuredUrl, { headers: { Accept: "text/plain,text/csv,application/zip,*/*" } })
  const candidates: LeadDiscoveryCandidate[] = []
  const include = input.query.toLowerCase().trim()
  for (const match of text.matchAll(/\b([a-z0-9-]+\.(?:com|net|org|io|co|ai|app|dev|jp|co\.jp))\b/gi)) {
    const domain = normalizeDomain(match[1] ?? "")
    if (!domain) continue
    if (include && include.length > 2 && !domain.includes(include.replace(/[^a-z0-9]/gi, "").toLowerCase())) {
      continue
    }
    const candidate = candidateFromUrl({
      url: `https://${domain}`,
      title: domain.replace(/\.[^.]+$/, ""),
      snippet: "Newly registered domain signal from WhoisDS NRD feed.",
      source: "whoisds_nrd",
      market: input.market ?? null,
      raw: { source: "whoisds_nrd" },
    })
    if (candidate) candidates.push(candidate)
  }
  return dedupe(candidates, input.limit ?? 25)
}

async function discoverViaOverpass(input: LeadDiscoveryInput): Promise<LeadDiscoveryCandidate[]> {
  const base = env("OVERPASS_API_URL") ?? "https://overpass-api.de/api"
  const query = `
    [out:json][timeout:15];
    (
      node["website"]["name"~"${input.query}",i](if:count_tags() > 0);
      way["website"]["name"~"${input.query}",i](if:count_tags() > 0);
      relation["website"]["name"~"${input.query}",i](if:count_tags() > 0);
    );
    out tags ${Math.min(input.limit ?? 25, 50)};
  `
  const url = new URL("/interpreter", base)
  const data = (await fetchJson(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query }).toString(),
  })) as { elements?: Array<{ tags?: JsonRecord }> }
  return dedupe(
    (data.elements ?? [])
      .map((row) => {
        const tags = row.tags ?? {}
        return candidateFromUrl({
          url: String(tags.website ?? tags["contact:website"] ?? ""),
          title: typeof tags.name === "string" ? tags.name : null,
          snippet: [tags.shop, tags.amenity, tags.cuisine, tags.description].filter(Boolean).join(" / "),
          source: "overpass",
          market: input.market ?? null,
          raw: tags,
        })
      })
      .filter((item): item is LeadDiscoveryCandidate => item !== null),
    input.limit ?? 25,
  )
}

export function isLeadDiscoverySource(value: unknown): value is LeadDiscoverySource {
  return (
    value === "searxng" ||
    value === "whoogle" ||
    value === "overpass" ||
    value === "publicwww" ||
    value === "rsshub_jobs" ||
    value === "wellfound" ||
    value === "whoisds_nrd" ||
    value === "agency_directory" ||
    value === "partner_directory" ||
    value === "events_directory" ||
    value === "osint_contacts"
  )
}

export async function discoverLeadCandidates(input: LeadDiscoveryInput): Promise<LeadDiscoveryResult> {
  const source = input.source ?? "searxng"
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100)
  try {
    const candidates =
      source === "searxng"
        ? await discoverViaSearxng({ ...input, limit })
        : source === "whoogle"
          ? await discoverViaWhoogle({ ...input, limit })
          : source === "publicwww"
            ? await discoverViaPublicWww({ ...input, limit })
            : source === "overpass"
              ? await discoverViaOverpass({ ...input, limit })
              : source === "rsshub_jobs"
                ? await discoverViaRssHubJobs({ ...input, limit })
                : source === "whoisds_nrd"
                  ? await discoverViaWhoisDsNrd({ ...input, limit })
                  : await discoverViaSearchPreset({ ...input, limit }, source)
    return { ok: true, source, candidates }
  } catch (error) {
    console.error("[lead-discovery] failed:", error)
    return {
      ok: false,
      source,
      candidates: [],
      error: error instanceof Error ? error.message : "lead discovery failed",
    }
  }
}
