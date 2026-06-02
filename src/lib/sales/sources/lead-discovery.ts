import { normalizeDomain } from "@/lib/sales/dedup"

type JsonRecord = Record<string, unknown>

export type LeadDiscoverySource = "searxng" | "whoogle" | "overpass" | "publicwww"

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

const USER_AGENT = "Paradigm Lead Discovery/1.0 (+https://paradigmjp.com)"

function env(name: string): string | null {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function safeUrl(value: string): URL | null {
  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`)
  } catch {
    return null
  }
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
  const title = input.title?.trim() || domain
  return {
    companyName: title.replace(/\s+[|-].*$/, "").slice(0, 120),
    domain,
    source: input.source,
    url: parsed.toString(),
    title,
    snippet: input.snippet?.trim().slice(0, 500) ?? "",
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

async function fetchJson(url: string, options: RequestInit = {}): Promise<unknown> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json,text/html;q=0.9,*/*;q=0.8",
      ...(options.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 160)}`)
  try {
    return JSON.parse(text) as unknown
  } catch {
    return { html: text }
  }
}

async function discoverViaSearxng(input: LeadDiscoveryInput): Promise<LeadDiscoveryCandidate[]> {
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
          source: "searxng",
          market: input.market ?? null,
          raw: row,
        }),
      )
      .filter((item): item is LeadDiscoveryCandidate => item !== null),
    input.limit ?? 25,
  )
}

async function discoverViaWhoogle(input: LeadDiscoveryInput): Promise<LeadDiscoveryCandidate[]> {
  const base = env("WHOOGLE_BASE_URL")
  if (!base) throw new Error("WHOOGLE_BASE_URL is not configured")
  const url = new URL("/search", base)
  url.searchParams.set("q", input.query)
  const data = (await fetchJson(url.toString(), { headers: { Accept: "text/html" } })) as { html?: string }
  const html = typeof data.html === "string" ? data.html : ""
  const candidates: LeadDiscoveryCandidate[] = []
  for (const match of html.matchAll(/href=["'](https?:\/\/[^"']+)["'][^>]*>([^<]+)</gi)) {
    const candidate = candidateFromUrl({
      url: match[1] ?? "",
      title: match[2]?.replace(/<[^>]+>/g, " ") ?? null,
      source: "whoogle",
      market: input.market ?? null,
      raw: {},
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
            : await discoverViaOverpass({ ...input, limit })
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
