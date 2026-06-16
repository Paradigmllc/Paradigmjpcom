import { getProxyFetchOptions } from "../proxy-agent"

/**
 * Schema.org JSON-LD parser — extracts structured data from page HTML.
 * Zero-cost, unlimited. Parses ld+json blocks for company info, reviews, products.
 */
export interface SchemaOrgResult {
  ok: boolean
  data?: {
    organizationName?: string
    address?: string
    phone?: string
    email?: string
    openingHours?: string[]
    rating?: number
    reviewCount?: number
    priceRange?: string
    sameAs?: string[]
    logo?: string
    description?: string
    foundTypes: string[]
  }
  error?: string
}

const LD_JSON_RE = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

function parseMaybeJson(raw: string): unknown {
  try { return JSON.parse(raw) } catch { return null }
}

function firstStringAt(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === "string" && v.trim()) return v.trim()
  }
}

function collectStrings(obj: unknown, key: string): string[] {
  const out: string[] = []
  const queue = [obj]
  while (queue.length) {
    const item = queue.shift()
    if (!item || typeof item !== "object") continue
    if (Array.isArray(item)) { queue.push(...item); continue }
    const rec = item as Record<string, unknown>
    if (typeof rec[key] === "string" && rec[key]) out.push(rec[key] as string)
    for (const v of Object.values(rec)) queue.push(v)
  }
  return [...new Set(out)]
}

function extractFromSchema(schema: Record<string, unknown>): SchemaOrgResult["data"] {
  const type = (schema["@type"] as string) ?? ""
  const graph = schema["@graph"] as Array<Record<string, unknown>> | undefined

  const items = graph ?? [schema]
  let orgName: string | undefined
  let address: string | undefined
  let phone: string | undefined
  let email: string | undefined
  let rating: number | undefined
  let reviewCount: number | undefined
  let priceRange: string | undefined
  let logo: string | undefined
  let description: string | undefined
  const hours: string[] = []
  const sameAs: string[] = []
  const foundTypes: string[] = []

  for (const item of items) {
    const t = (item["@type"] as string) ?? ""
    if (t) foundTypes.push(t)

    if (/Organization|LocalBusiness|Corporation|Store|Restaurant|Place/i.test(t)) {
      orgName = firstStringAt(item, ["name", "legalName"]) ?? orgName
      const addr = item.address as Record<string, unknown> | undefined
      if (addr) address = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode, addr.addressCountry].filter(Boolean).join(", ") || address
      phone = firstStringAt(item, ["telephone", "phone"]) ?? phone
      email = firstStringAt(item, ["email"]) ?? email
      priceRange = (item.priceRange as string) ?? priceRange
      logo = (item.logo as string) ?? (item.image as string) ?? logo
      description = (item.description as string) ?? description
      if (typeof (item.aggregateRating as { ratingValue?: unknown; reviewCount?: unknown })?.ratingValue === "number") rating = (item.aggregateRating as { ratingValue: number }).ratingValue
      if (typeof (item.aggregateRating as { ratingValue?: unknown; reviewCount?: unknown })?.reviewCount === "number") reviewCount = (item.aggregateRating as { reviewCount: number }).reviewCount
      if (Array.isArray(item.sameAs)) sameAs.push(...(item.sameAs as string[]))
      if (Array.isArray(item.openingHours)) hours.push(...(item.openingHours as string[]))
      if (typeof item.openingHoursSpecification === "object") {
        hours.push("structured_hours_specified")
      }
    }

    if (/Product/i.test(t)) {
      if (typeof (item.aggregateRating as { ratingValue?: unknown; reviewCount?: unknown })?.ratingValue === "number" && rating === undefined) rating = (item.aggregateRating as { ratingValue: number }).ratingValue
      if (typeof (item.aggregateRating as { ratingValue?: unknown; reviewCount?: unknown })?.reviewCount === "number" && reviewCount === undefined) reviewCount = (item.aggregateRating as { reviewCount: number }).reviewCount
    }
  }

  return {
    organizationName: orgName,
    address,
    phone,
    email,
    openingHours: hours.length ? hours : undefined,
    rating: rating !== undefined ? Math.round(rating * 10) / 10 : undefined,
    reviewCount,
    priceRange,
    sameAs: sameAs.length ? [...new Set(sameAs)] : undefined,
    logo,
    description: description?.slice(0, 500),
    foundTypes: [...new Set(foundTypes)],
  }
}

export async function extractSchemaOrg(url: string, html?: string): Promise<SchemaOrgResult> {
  try {
    let body = html
    if (!body) {
      const res = await fetch(url, {
        ...getProxyFetchOptions({
          headers: { "User-Agent": "RevenueOS-SchemaOrg/1.0" },
          signal: AbortSignal.timeout(12_000),
        }),
      })
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
      body = await res.text()
    }

    const matches: Record<string, unknown>[] = []
    let ldMatch
    LD_JSON_RE.lastIndex = 0
    while ((ldMatch = LD_JSON_RE.exec(body)) !== null) {
      const parsed = parseMaybeJson(ldMatch[1])
      if (parsed && typeof parsed === "object") {
        matches.push(parsed as Record<string, unknown>)
      }
    }

    if (matches.length === 0) return { ok: false, error: "no ld+json found" }

    // Merge all @graph items into one extraction
    const merged: Record<string, unknown> = { "@type": "WebSite" }
    for (const m of matches) {
      if (Array.isArray(m["@graph"])) {
        merged["@graph"] = [...((merged["@graph"] as unknown[]) ?? []), ...(m["@graph"] as unknown[])]
      } else {
        merged["@graph"] = [...((merged["@graph"] as unknown[]) ?? []), m]
      }
    }

    const data = extractFromSchema(merged)
    if (!data || data.foundTypes.length === 0) return { ok: true, data: undefined }
    return { ok: true, data }
  } catch (e) {
    console.error("[schema-org] extraction failed:", e)
    return { ok: false, error: e instanceof Error ? e.message : "Schema.org extraction failed" }
  }
}
