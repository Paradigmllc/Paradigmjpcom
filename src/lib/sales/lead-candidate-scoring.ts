import type { TechItem } from "./sources/wappalyzer"

export type CandidateLane = "tech_footprint" | "no_website_local_smb"
export type CandidateStatus = "candidate" | "scored" | "promoted" | "rejected"

export interface CandidateCountrySignal {
  countryCode: string
  signalType: string
  confidence: number
  evidence: string
}

export interface CandidateScore {
  stackFitScore: number
  smbScore: number
  freshnessScore: number
  geoConfidence: number
  contactabilityScore: number
  websiteAbsenceScore: number
  opportunityScore: number
  falsePositiveRisk: number
  details: Record<string, unknown>
}

const COUNTRY_TLD_PATTERNS: Record<string, string[]> = {
  JP: ["*.jp", "*.co.jp", "*.or.jp", "*.ne.jp", "*.ac.jp"],
  US: ["*.us", "*.com", "*.org"],
  DE: ["*.de", "*.co.de"],
  FR: ["*.fr", "*.co.fr"],
  TH: ["*.th", "*.co.th", "*.or.th", "*.go.th"],
  KR: ["*.kr", "*.co.kr", "*.or.kr", "*.ne.kr"],
  TW: ["*.tw", "*.com.tw", "*.org.tw", "*.net.tw"],
  VN: ["*.vn", "*.com.vn", "*.net.vn", "*.org.vn"],
  ID: ["*.id", "*.co.id", "*.or.id", "*.net.id", "*.web.id"],
  ZA: ["*.co.za", "*.org.za", "*.net.za", "*.za"],
  CH: ["*.ch", "*.swiss"],
  EG: ["*.eg", "*.com.eg", "*.net.eg", "*.org.eg"],
}

const COUNTRY_SIGNAL_RULES: Record<string, Array<{ type: string; pattern: RegExp; confidence: number }>> = {
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

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function technologySlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function countryTldSignal(domain: string, countryCode: string): CandidateCountrySignal | null {
  const cc = countryCode.toUpperCase()
  const normalized = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "")
  const patterns = COUNTRY_TLD_PATTERNS[cc]
  if (patterns) {
    for (const pattern of patterns) {
      const suffix = pattern.replace(/^\*/, "")
      if (normalized.endsWith(suffix)) {
        return { countryCode: cc, signalType: "tld", confidence: pattern.includes("*.") ? 95 : 90, evidence: normalized }
      }
    }
  }
  const tld = cc.toLowerCase()
  if (normalized.endsWith(`.${tld}`)) {
    return { countryCode: cc, signalType: "tld", confidence: 90, evidence: normalized }
  }
  return null
}

export function inferCountrySignals(input: {
  domain?: string | null
  targetCountry: string
  evidenceText?: string | null
}): CandidateCountrySignal[] {
  const countryCode = input.targetCountry.trim().toUpperCase()
  const signals: CandidateCountrySignal[] = []
  if (input.domain) {
    const signal = countryTldSignal(input.domain, countryCode)
    if (signal) signals.push(signal)
  }

  const evidence = input.evidenceText ?? ""
  for (const rule of COUNTRY_SIGNAL_RULES[countryCode] ?? []) {
    if (rule.pattern.test(evidence)) {
      signals.push({
        countryCode,
        signalType: rule.type,
        confidence: rule.confidence,
        evidence: evidence.slice(0, 240),
      })
    }
  }

  if (signals.length === 0 && countryCode.length === 2) {
    signals.push({ countryCode, signalType: "request_scope", confidence: 35, evidence: "country requested by operator" })
  }
  return signals
}

function maxCountryConfidence(signals: CandidateCountrySignal[]): number {
  return signals.reduce((max, signal) => Math.max(max, signal.confidence), 0)
}

export function scoreCandidate(input: {
  requestedTechnology?: string | null
  detections?: TechItem[]
  countrySignals: CandidateCountrySignal[]
  lane: CandidateLane
  hasWebsite: boolean
  hasContactSignal?: boolean
  source: string
}): CandidateScore {
  const requestedSlug = input.requestedTechnology ? technologySlug(input.requestedTechnology) : null
  const detectionSlugs = (input.detections ?? []).map((tech) => technologySlug(tech.name))
  const exactStack = requestedSlug ? detectionSlugs.includes(requestedSlug) : detectionSlugs.length > 0
  const stackFitScore = requestedSlug ? (exactStack ? 96 : 0) : Math.min(90, detectionSlugs.length * 18)
  const geoConfidence = maxCountryConfidence(input.countrySignals)
  const websiteAbsenceScore = input.hasWebsite ? 0 : 92
  const smbScore = input.lane === "no_website_local_smb" ? 86 : 58
  const freshnessScore = input.source === "common_crawl_domains" ? 62 : 74
  const contactabilityScore = input.hasContactSignal ? 70 : 34
  const falsePositiveRisk = clampScore((requestedSlug && !exactStack ? 35 : 12) + (geoConfidence < 50 ? 28 : 0))
  const laneOpportunityBonus = input.lane === "no_website_local_smb" ? 12 : 0
  const opportunityScore = clampScore(
    stackFitScore * 0.34 +
      geoConfidence * 0.24 +
      smbScore * 0.16 +
      contactabilityScore * 0.12 +
      websiteAbsenceScore * 0.1 +
      freshnessScore * 0.04 -
      falsePositiveRisk * 0.12 +
      laneOpportunityBonus,
  )

  return {
    stackFitScore,
    smbScore,
    freshnessScore,
    geoConfidence,
    contactabilityScore,
    websiteAbsenceScore,
    opportunityScore,
    falsePositiveRisk,
    details: {
      requestedTechnology: input.requestedTechnology ?? null,
      detectedTechnologies: detectionSlugs,
      exactStack,
      source: input.source,
      laneOpportunityBonus,
    },
  }
}

export function tldPatternsForCountry(countryCode: string): string[] {
  const cc = countryCode.trim().toUpperCase()
  return COUNTRY_TLD_PATTERNS[cc] ?? [`*.${cc.toLowerCase()}`]
}
