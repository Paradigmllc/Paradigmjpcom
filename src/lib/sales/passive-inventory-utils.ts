import { gunzipSync, inflateSync } from "node:zlib"
import type { CandidateCountrySignal } from "./lead-candidate-scoring"
import type { TechItem } from "./sources/wappalyzer"

export interface PassiveEvidence {
  sources: string[]
  cnameTarget?: string | null
  technologies: TechItem[]
  countrySignals: CandidateCountrySignal[]
  raw: Record<string, unknown>
}

const STACK_CNAME_RULES: Array<{ technology: string; pattern: RegExp }> = [
  { technology: "Shopify", pattern: /(^|\.)myshopify\.com\.?$/i },
  { technology: "Webflow", pattern: /(^|\.)proxy-ssl\.webflow\.com\.?$|(^|\.)webflow\.io\.?$/i },
  { technology: "Wix", pattern: /(^|\.)wixdns\.net\.?$|(^|\.)wixsite\.com\.?$/i },
  { technology: "Squarespace", pattern: /(^|\.)squarespace\.com\.?$/i },
  { technology: "HubSpot", pattern: /(^|\.)hubspot(?:sites)?\.net\.?$|(^|\.)hs-sites\.com\.?$/i },
  { technology: "Zendesk", pattern: /(^|\.)zendesk\.com\.?$/i },
  { technology: "Intercom", pattern: /(^|\.)intercom\.io\.?$/i },
  { technology: "Klaviyo", pattern: /(^|\.)klaviyo\.com\.?$/i },
  { technology: "Twilio", pattern: /(^|\.)twilio\.com\.?$/i },
]

const COUNTRY_TEXT_RULES: Record<string, Array<{ type: string; pattern: RegExp; confidence: number }>> = {
  EG: [
    { type: "phone", pattern: /\+20|0020/i, confidence: 92 },
    { type: "currency", pattern: /\bEGP\b|Egyptian Pound|جنيه/i, confidence: 84 },
    { type: "address", pattern: /Egypt|Cairo|Alexandria|Giza|القاهرة|مصر/i, confidence: 86 },
  ],
  ZA: [
    { type: "phone", pattern: /\+27|0027/i, confidence: 92 },
    { type: "currency", pattern: /\bZAR\b|South African Rand|R\s?\d{2,}/i, confidence: 76 },
    { type: "address", pattern: /South Africa|Johannesburg|Cape Town|Pretoria|Durban/i, confidence: 82 },
  ],
  CH: [
    { type: "phone", pattern: /\+41|0041/i, confidence: 92 },
    { type: "currency", pattern: /\bCHF\b|Swiss Franc|Fr\.\s?\d{2,}/i, confidence: 78 },
    { type: "address", pattern: /Switzerland|Schweiz|Suisse|Zurich|Zuerich|Geneva|Geneve|Basel|Bern/i, confidence: 84 },
  ],
}

export function normalizeInventoryDomain(raw: string, tld?: string): string | null {
  const token = raw.trim().split(/\s+/)[0]?.replace(/\.$/, "").toLowerCase()
  if (!token || token.startsWith(";") || token.startsWith("$")) return null
  const domain = token.includes(".") ? token : tld ? `${token}.${tld.replace(/^\./, "").toLowerCase()}` : token
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain) ? domain.replace(/^www\./, "") : null
}

export function parseZoneDomains(text: string, tld?: string, limit = 10000): string[] {
  const out = new Set<string>()
  for (const line of text.split(/\r?\n/)) {
    if (out.size >= limit) break
    const domain = normalizeInventoryDomain(line, tld)
    if (domain) out.add(domain)
  }
  return [...out].sort()
}

export function decodeZonePayload(buffer: Buffer, hint = ""): string {
  if (hint.endsWith(".gz") || buffer.subarray(0, 2).equals(Buffer.from([0x1f, 0x8b]))) return gunzipSync(buffer).toString("utf8")
  if (hint.endsWith(".zz")) return inflateSync(buffer).toString("utf8")
  return buffer.toString("utf8")
}

export function techFromCname(cname: string | null | undefined): TechItem[] {
  if (!cname) return []
  const target = cname.replace(/\.$/, "")
  return STACK_CNAME_RULES
    .filter((rule) => rule.pattern.test(target))
    .map((rule) => ({ name: rule.technology, category: "Hosted Platform", confidence: 98 }))
}

export function countrySignalsFromText(countryCode: string, text: string): CandidateCountrySignal[] {
  const cc = countryCode.trim().toUpperCase()
  const signals: CandidateCountrySignal[] = []
  for (const rule of COUNTRY_TEXT_RULES[cc] ?? []) {
    if (rule.pattern.test(text)) {
      signals.push({ countryCode: cc, signalType: rule.type, confidence: rule.confidence, evidence: text.slice(0, 240) })
    }
  }
  return signals
}

export function passiveEvidence(input: {
  sources: string[]
  cnameTarget?: string | null
  technologies?: TechItem[]
  countrySignals?: CandidateCountrySignal[]
  raw?: Record<string, unknown>
}): PassiveEvidence {
  return {
    sources: [...new Set(input.sources)].sort(),
    cnameTarget: input.cnameTarget ?? null,
    technologies: input.technologies ?? techFromCname(input.cnameTarget),
    countrySignals: input.countrySignals ?? [],
    raw: input.raw ?? {},
  }
}
