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
  { technology: "Shopify", pattern: /(^|\.)shopify\.com\.?$/i },
  { technology: "Webflow", pattern: /(^|\.)proxy-ssl\.webflow\.com\.?$|(^|\.)webflow\.io\.?$/i },
  { technology: "Wix", pattern: /(^|\.)wixdns\.net\.?$|(^|\.)wixsite\.com\.?$/i },
  { technology: "Squarespace", pattern: /(^|\.)squarespace\.com\.?$/i },
  { technology: "HubSpot", pattern: /(^|\.)hubspot(?:sites)?\.net\.?$|(^|\.)hs-sites\.com\.?$/i },
  { technology: "Zendesk", pattern: /(^|\.)zendesk\.com\.?$/i },
  { technology: "Intercom", pattern: /(^|\.)intercom\.io\.?$/i },
  { technology: "Klaviyo", pattern: /(^|\.)klaviyo\.com\.?$/i },
  { technology: "Twilio", pattern: /(^|\.)twilio\.com\.?$/i },
  { technology: "BigCommerce", pattern: /(^|\.)bigcommerce\.com\.?$|(^|\.)mybigcommerce\.com\.?$/i },
  { technology: "Magento Commerce", pattern: /(^|\.)magecloud\.(?:net|com)\.?$|(^|\.)magentosite\.cloud\.?$/i },
  { technology: "Ecwid", pattern: /(^|\.)ecwid\.com\.?$/i },
  { technology: "PrestaShop", pattern: /(^|\.)prestashop(?:-cms)?\.com\.?$|(^|\.)prestashop\.cloud\.?$/i },
  { technology: "Salesforce Commerce", pattern: /(^|\.)commercecloud\.(?:salesforce|demandware)\.com\.?$|(^|\.)demandware\.net\.?$/i },
  { technology: "Volusion", pattern: /(^|\.)volusion\.com\.?$|(^|\.)vfs\.cloud\.?$/i },
  { technology: "Big Cartel", pattern: /(^|\.)bigcartel\.com\.?$/i },
  { technology: "Weebly", pattern: /(^|\.)weebly\.com\.?$/i },
  { technology: "Jimdo", pattern: /(^|\.)jimdo(?:-free)?\.com\.?$/i },
  { technology: "Google Sites", pattern: /(^|\.)googlesites\.com\.?$/i },
  { technology: "Shopline", pattern: /(^|\.)shopline(?:app)?\.com\.?$/i },
  { technology: "Basekit", pattern: /(^|\.)basekit\.com\.?$/i },
  { technology: "Tilda", pattern: /(^|\.)tildacdn\.com\.?$/i },
  { technology: "Duda", pattern: /(^|\.)duda\.co\.?$|(^|\.)dudamobile\.com\.?$/i },
  { technology: "Strikingly", pattern: /(^|\.)strikinglydns\.com\.?$/i },
]

const COUNTRY_TEXT_RULES: Record<string, Array<{ type: string; pattern: RegExp; confidence: number }>> = {
  JP: [
    { type: "phone", pattern: /\+81|0081/i, confidence: 92 },
    { type: "currency", pattern: /\bJPY\b|\b￥\s?\d|Japanese Yen|¥\s?\d/i, confidence: 84 },
    { type: "address", pattern: /Japan|Tokyo|Osaka|Nagoya|Sapporo|Fukuoka|日本|東京|大阪|名古屋|札幌|福岡/i, confidence: 86 },
  ],
  US: [
    { type: "phone", pattern: /\+1[^0-9]|\b1-\d{3}/i, confidence: 78 },
    { type: "currency", pattern: /\bUSD\b|\$\s?\d{2,}|US Dollar/i, confidence: 72 },
    { type: "address", pattern: /United States|New York|Los Angeles|Chicago|Houston|Phoenix/i, confidence: 74 },
  ],
  DE: [
    { type: "phone", pattern: /\+49|0049/i, confidence: 92 },
    { type: "currency", pattern: /\bEUR\b|€\s?\d{2,}/i, confidence: 76 },
    { type: "address", pattern: /Germany|Deutschland|Berlin|Munich|Muenchen|Hamburg|Frankfurt|Koeln|Cologne/i, confidence: 84 },
  ],
  FR: [
    { type: "phone", pattern: /\+33|0033/i, confidence: 92 },
    { type: "currency", pattern: /\bEUR\b|€\s?\d{2,}/i, confidence: 76 },
    { type: "address", pattern: /France|Paris|Lyon|Marseille|Bordeaux|Lille|Toulouse/i, confidence: 84 },
  ],
  TH: [
    { type: "phone", pattern: /\+66|0066/i, confidence: 92 },
    { type: "currency", pattern: /\bTHB\b|Thai Baht|฿\s?\d{2,}/i, confidence: 84 },
    { type: "address", pattern: /Thailand|Bangkok|Phuket|Chiang Mai|Pattaya|กรุงเทพ|ไทย/i, confidence: 86 },
  ],
  KR: [
    { type: "phone", pattern: /\+82|0082/i, confidence: 92 },
    { type: "currency", pattern: /\bKRW\b|Korean Won|₩\s?\d{2,}/i, confidence: 84 },
    { type: "address", pattern: /Korea|Seoul|Busan|Incheon|Daegu|한국|서울|부산|인천|대구/i, confidence: 86 },
  ],
  TW: [
    { type: "phone", pattern: /\+886|00886/i, confidence: 92 },
    { type: "currency", pattern: /\bTWD\b|Taiwan Dollar|NT\$\s?\d{2,}/i, confidence: 84 },
    { type: "address", pattern: /Taiwan|Taipei|Taichung|Kaohsiung|Tainan|台灣|臺北|台中|高雄/i, confidence: 86 },
  ],
  VN: [
    { type: "phone", pattern: /\+84|0084/i, confidence: 92 },
    { type: "currency", pattern: /\bVND\b|Vietnamese Dong|₫\s?\d{2,}/i, confidence: 84 },
    { type: "address", pattern: /Vietnam|Ho Chi Minh|Hanoi|Da Nang|Hai Phong|Việt Nam|Hà Nội|Sài Gòn/i, confidence: 86 },
  ],
  ID: [
    { type: "phone", pattern: /\+62|0062/i, confidence: 92 },
    { type: "currency", pattern: /\bIDR\b|Indonesian Rupiah|Rp\s?\d{2,}/i, confidence: 84 },
    { type: "address", pattern: /Indonesia|Jakarta|Surabaya|Bandung|Medan|Bali/i, confidence: 86 },
  ],
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
