import { inferPortalIndustry, isAllowedPortalUrl, PORTAL_ADAPTERS } from "./adapters"
import type { PortalCandidateExtraction, PortalImageCandidate, PortalSource } from "./types"

const MAX_HTML_BYTES = 2_000_000
const SOCIAL_HOSTS = ["instagram.com", "facebook.com", "x.com", "twitter.com", "youtube.com", "tiktok.com", "line.me"]

type JsonRecord = Record<string, unknown>

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;|&#34;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim()
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
}

function metaContent(html: string, key: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? []
  for (const tag of tags) {
    const attr = tag.match(/(?:property|name)=["']([^"']+)["']/i)?.[1]
    if (attr?.toLowerCase() !== key.toLowerCase()) continue
    const content = tag.match(/content=["']([^"']*)["']/i)?.[1]
    if (content) return decodeHtml(content)
  }
  return null
}

function jsonLdRecords(html: string): JsonRecord[] {
  const records: JsonRecord[] = []
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  for (const match of html.matchAll(pattern)) {
    try {
      const raw = match[1].trim()
      let parsed: unknown
      try {
        parsed = JSON.parse(raw) as unknown
      } catch (rawError) {
        console.warn("[portal-source] raw JSON-LD parse failed; retrying decoded content:", rawError instanceof Error ? rawError.message : String(rawError))
        parsed = JSON.parse(decodeHtml(raw)) as unknown
      }
      collectRecords(parsed, records)
    } catch (error) {
      console.warn("[portal-source] JSON-LD parse failed:", error instanceof Error ? error.message : String(error))
    }
  }
  return records
}

function collectRecords(value: unknown, output: JsonRecord[]): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectRecords(item, output))
    return
  }
  if (!value || typeof value !== "object") return
  const record = value as JsonRecord
  output.push(record)
  if (Array.isArray(record["@graph"])) collectRecords(record["@graph"], output)
}

function typeNames(record: JsonRecord): string[] {
  const value = record["@type"]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : typeof value === "string" ? [value] : []
}

function businessRecord(records: JsonRecord[]): JsonRecord | null {
  return records.find((record) => typeNames(record).some((type) => /Business|Organization|Corporation|ProfessionalService|Store|Restaurant|Dentist/i.test(type))) ?? null
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? stripTags(value).slice(0, 1000) : null
}

function absoluteHttpsUrl(value: unknown, baseUrl: string): string | null {
  const raw = stringValue(value)
  if (!raw) return null
  try {
    const url = new URL(raw, baseUrl)
    return url.protocol === "https:" ? url.toString() : null
  } catch (error) {
    console.warn("[portal-source] invalid extracted URL:", error instanceof Error ? error.message : String(error))
    return null
  }
}

function collectImageValues(value: unknown, output: unknown[]): void {
  if (Array.isArray(value)) return value.forEach((item) => collectImageValues(item, output))
  if (typeof value === "string") output.push(value)
  if (!value || typeof value !== "object" || Array.isArray(value)) return
  const record = value as JsonRecord
  for (const key of ["url", "contentUrl", "thumbnailUrl"]) if (record[key]) output.push(record[key])
}

function imagesFromPage(html: string, record: JsonRecord | null, baseUrl: string, companyName: string): PortalImageCandidate[] {
  const values: unknown[] = []
  if (record) {
    for (const key of ["image", "logo", "photo"]) collectImageValues(record[key], values)
  }
  const ogImage = metaContent(html, "og:image")
  if (ogImage) values.push(ogImage)
  for (const tag of (html.match(/<img\b[^>]*>/gi) ?? []).slice(0, 80)) {
    const src = tag.match(/(?:src|data-src|data-original)=["']([^"']+)["']/i)?.[1]
    if (src) values.push(src)
  }
  const seen = new Set<string>()
  return values.flatMap((value, index) => {
    const url = absoluteHttpsUrl(value, baseUrl)
    if (!url || seen.has(url) || /avatar|icon|sprite|logo_mark|pixel|tracking|1x1/i.test(url)) return []
    seen.add(url)
    return [{ url, alt: `${companyName}の掲載写真 ${index + 1}` }]
  }).slice(0, 20)
}

function addressFromRecord(record: JsonRecord | null): string | null {
  const value = record?.address
  if (typeof value === "string") return stringValue(value)
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const address = value as JsonRecord
  return [address.postalCode, address.addressRegion, address.addressLocality, address.streetAddress]
    .map(stringValue)
    .filter((part): part is string => Boolean(part))
    .join(" ") || null
}

function prefectureFromAddress(address: string | null): string | null {
  return address?.match(/(北海道|東京都|京都府|大阪府|.{2,3}県)/u)?.[1] ?? null
}

function linksFromPage(html: string, baseUrl: string): Array<{ url: string; label: string }> {
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].flatMap((match) => {
    const url = absoluteHttpsUrl(match[1], baseUrl)
    return url ? [{ url, label: stripTags(match[2]).slice(0, 120) }] : []
  }).slice(0, 500)
}

function sameHostOrSubdomain(a: string, b: string): boolean {
  const left = new URL(a).hostname
  const right = new URL(b).hostname
  return left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`)
}

function socialLinks(record: JsonRecord | null, links: Array<{ url: string }>): string[] {
  const values = Array.isArray(record?.sameAs) ? record?.sameAs : []
  const urls = [...values, ...links.map((link) => link.url)].flatMap((value) => {
    const url = absoluteHttpsUrl(value, "https://example.invalid")
    if (!url) return []
    return SOCIAL_HOSTS.some((host) => new URL(url).hostname === host || new URL(url).hostname.endsWith(`.${host}`)) ? [url] : []
  })
  return [...new Set(urls)].slice(0, 20)
}

function officialWebsite(record: JsonRecord | null, links: Array<{ url: string; label: string }>, listingUrl: string): string | null {
  const candidates = [
    absoluteHttpsUrl(record?.url, listingUrl),
    ...links.filter((link) => /公式|ホームページ|web\s*site|website/i.test(link.label)).map((link) => link.url),
  ].filter((url): url is string => Boolean(url))
  return candidates.find((url) => {
    if (sameHostOrSubdomain(url, listingUrl)) return false
    const host = new URL(url).hostname
    return !SOCIAL_HOSTS.some((social) => host === social || host.endsWith(`.${social}`))
  }) ?? null
}

function cleanTitle(value: string, source: PortalSource): string {
  return value
    .replace(new RegExp(`\\s*[|｜-]\\s*(Houzz|ハウズ|エキテン|ジモティー).*$`, "iu"), "")
    .replace(source === "houzz" ? /の専門家.*$/u : /の口コミ.*$/u, "")
    .trim()
    .slice(0, 200)
}

export function extractPortalCandidateFromHtml(source: PortalSource, listingUrl: string, html: string): PortalCandidateExtraction {
  if (!isAllowedPortalUrl(source, listingUrl)) throw new Error(`${PORTAL_ADAPTERS[source].label}のURLではありません`)
  const records = jsonLdRecords(html)
  const business = businessRecord(records)
  const title = stringValue(business?.name) ?? metaContent(html, "og:title") ?? stringValue(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])
  if (!title) throw new Error("事業者名を取得できません")
  const companyName = cleanTitle(title, source)
  const description = (stringValue(business?.description) ?? metaContent(html, "og:description") ?? metaContent(html, "description") ?? "").slice(0, 1000)
  const links = linksFromPage(html, listingUrl)
  const address = addressFromRecord(business)
  const phone = stringValue(business?.telephone)
  const typeLabel = typeNames(business ?? {})[0] ?? PORTAL_ADAPTERS[source].label
  const category = stringValue(business?.category) ?? metaContent(html, "keywords")?.split(",")[0]?.trim() ?? typeLabel
  const images = imagesFromPage(html, business, listingUrl, companyName)
  const websiteUrl = officialWebsite(business, links, listingUrl)
  const evidenceText = `${companyName}\n${category}\n${description}`
  const status = websiteUrl ? "has_website" : images.length >= 3 && (description || address) ? "ready_for_review" : "insufficient_content"
  return {
    source,
    listingUrl,
    companyName,
    category: category.slice(0, 120),
    description,
    address,
    phone,
    prefecture: prefectureFromAddress(address),
    websiteUrl,
    socialLinks: socialLinks(business, links),
    contactUrl: listingUrl,
    images,
    suggestedIndustry: inferPortalIndustry(source, evidenceText),
    fetchedAt: new Date().toISOString(),
    status,
  }
}

export async function fetchPortalCandidate(source: PortalSource, listingUrl: string): Promise<PortalCandidateExtraction> {
  if (!isAllowedPortalUrl(source, listingUrl)) throw new Error(`${PORTAL_ADAPTERS[source].label}のHTTPS URLを指定してください`)
  const response = await fetch(listingUrl, {
    cache: "no-store",
    redirect: "error",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ja-JP,ja;q=0.9",
      "User-Agent": "Paradigm-Demo-Review/1.0 (+https://paradigmjp.com)",
    },
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) throw new Error(`${PORTAL_ADAPTERS[source].label} HTTP ${response.status}`)
  const length = Number(response.headers.get("content-length") ?? 0)
  if (length > MAX_HTML_BYTES) throw new Error("ページサイズが上限を超えています")
  const html = (await response.text()).slice(0, MAX_HTML_BYTES)
  return extractPortalCandidateFromHtml(source, listingUrl, html)
}
