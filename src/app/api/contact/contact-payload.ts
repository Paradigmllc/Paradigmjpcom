export const JAPAN_ENTRY_INTENT = "japan-entry" as const

const DECISION_AUTHORITIES = new Set([
  "final-decision-maker",
  "direct-access",
  "not-final",
])

const APPROVAL_TIMELINES = new Set([
  "within-7-days",
  "within-30-days",
  "procurement-required",
  "not-ready",
])

const DESIRED_LAUNCHES = new Set([
  "this-month",
  "within-30-days",
  "within-60-days",
  "later",
])

export interface ContactPayload {
  name: string
  company: string
  email: string
  phone: string
  services: string[]
  message: string
  budget: string
  locale: string
  turnstileToken: string
  intent: typeof JAPAN_ENTRY_INTENT | "general"
  companyWebsite: string
  companyCountry: string
  decisionAuthority: string
  approvalTimeline: string
  desiredLaunch: string
  setupFeeAcknowledged: boolean
  idempotencyKey: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmTerm: string
  utmContent: string
  referrer: string
  landingPage: string
  ctaSource: string
  formChallenge: string
  honeypot: string
}

export interface ContactQualification {
  score: number
  priority: number
  tier: "hot" | "warm" | "nurture" | "general"
  reasons: string[]
  disqualifiers: string[]
}

const COUNTRY_CODES: Record<string, string> = {
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  us: "US",
  "u.s.": "US",
  canada: "CA",
  "united kingdom": "GB",
  "great britain": "GB",
  britain: "GB",
  england: "GB",
  uk: "GB",
  gb: "GB",
  australia: "AU",
  au: "AU",
  "new zealand": "NZ",
  nz: "NZ",
  ireland: "IE",
  germany: "DE",
  france: "FR",
  netherlands: "NL",
  spain: "ES",
  italy: "IT",
  portugal: "PT",
  belgium: "BE",
  switzerland: "CH",
  austria: "AT",
  sweden: "SE",
  norway: "NO",
  denmark: "DK",
  finland: "FI",
  poland: "PL",
  japan: "JP",
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readString(
  source: Record<string, unknown>,
  key: string,
  maxLength: number,
): string {
  const value = source[key]
  if (typeof value !== "string") return ""
  return value.replaceAll("\0", "").trim().slice(0, maxLength)
}

function readServices(source: Record<string, unknown>): string[] {
  const value = source.services
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.replaceAll("\0", "").trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, 10)
}

function readHttpUrl(source: Record<string, unknown>, key: string): string {
  const value = readString(source, key, 2_048)
  if (!value || !URL.canParse(value)) return ""
  const protocol = new URL(value).protocol
  return protocol === "https:" || protocol === "http:" ? value : ""
}

export function parseContactPayload(value: unknown): ContactPayload | null {
  if (!isRecord(value)) return null

  const locale = readString(value, "locale", 16)
  const requestedIntent = readString(value, "intent", 40)
  const englishLocale =
    locale.toLowerCase() === "en" || locale.toLowerCase().startsWith("en-")

  return {
    name: readString(value, "name", 120),
    company: readString(value, "company", 160),
    email: readString(value, "email", 254).toLowerCase(),
    phone: readString(value, "phone", 50),
    services: readServices(value),
    message: readString(value, "message", 5_000),
    budget: readString(value, "budget", 100),
    locale,
    turnstileToken: readString(value, "turnstileToken", 4_096),
    // English is the dedicated Japan Entry funnel. Never trust a client-sent
    // `general` intent to bypass its commercial qualification requirements.
    intent:
      englishLocale || requestedIntent === JAPAN_ENTRY_INTENT
        ? JAPAN_ENTRY_INTENT
        : "general",
    companyWebsite: readString(value, "companyWebsite", 2_048),
    companyCountry: readString(value, "companyCountry", 120),
    decisionAuthority: readString(value, "decisionAuthority", 80),
    approvalTimeline: readString(value, "approvalTimeline", 80),
    desiredLaunch: readString(value, "desiredLaunch", 80),
    setupFeeAcknowledged: value.setupFeeAcknowledged === true,
    idempotencyKey: readString(value, "idempotencyKey", 128),
    utmSource: readString(value, "utmSource", 200),
    utmMedium: readString(value, "utmMedium", 200),
    utmCampaign: readString(value, "utmCampaign", 200),
    utmTerm: readString(value, "utmTerm", 200),
    utmContent: readString(value, "utmContent", 200),
    referrer: readHttpUrl(value, "referrer"),
    landingPage: readHttpUrl(value, "landingPage"),
    ctaSource: readString(value, "ctaSource", 120),
    formChallenge: readString(value, "formChallenge", 512),
    honeypot: readString(value, "honeypot", 200),
  }
}

export function normalizeCompanyCountry(
  value: string,
  fallback: string,
): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ")
  if (!normalized) return fallback.trim().toUpperCase()
  const mapped = COUNTRY_CODES[normalized]
  if (mapped) return mapped
  const possibleCode = normalized.toUpperCase()
  return /^[A-Z]{2}$/.test(possibleCode) ? possibleCode : value.trim()
}

export function scoreContactQualification(
  payload: ContactPayload,
): ContactQualification {
  if (payload.intent !== JAPAN_ENTRY_INTENT) {
    return {
      score: 50,
      priority: 70,
      tier: "general",
      reasons: ["general_inquiry"],
      disqualifiers: [],
    }
  }

  let score = 0
  const reasons: string[] = []
  const disqualifiers: string[] = []
  const authorityPoints: Record<string, number> = {
    "final-decision-maker": 35,
    "direct-access": 25,
    "not-final": 0,
  }
  const approvalPoints: Record<string, number> = {
    "within-7-days": 35,
    "within-30-days": 20,
    "procurement-required": 5,
    "not-ready": 0,
  }
  const launchPoints: Record<string, number> = {
    "this-month": 20,
    "within-30-days": 15,
    "within-60-days": 8,
    later: 0,
  }

  score += authorityPoints[payload.decisionAuthority] ?? 0
  score += approvalPoints[payload.approvalTimeline] ?? 0
  score += launchPoints[payload.desiredLaunch] ?? 0
  if (payload.setupFeeAcknowledged) score += 10

  if (payload.decisionAuthority === "final-decision-maker")
    reasons.push("final_decision_maker")
  else if (payload.decisionAuthority === "direct-access")
    reasons.push("direct_access_to_approval")
  else reasons.push("multiple_internal_approvals")

  if (payload.approvalTimeline === "within-7-days")
    reasons.push("approval_within_7_days")
  else if (payload.approvalTimeline === "within-30-days")
    reasons.push("approval_within_30_days")
  else reasons.push("slow_or_uncertain_approval")

  if (
    payload.desiredLaunch === "this-month" ||
    payload.desiredLaunch === "within-30-days"
  ) {
    reasons.push("near_term_launch")
  } else {
    reasons.push("later_launch")
  }

  // This funnel is deliberately optimized for SMB buyers who can approve the
  // fixed setup fee now. Additive scoring must never let a slow/non-decision
  // maker become HOT by compensating with unrelated answers.
  let scoreCap = 100
  if (payload.decisionAuthority === "not-final") {
    disqualifiers.push("not_final_decision_maker")
    scoreCap = Math.min(scoreCap, 39)
  }
  if (payload.approvalTimeline !== "within-7-days") {
    disqualifiers.push("approval_exceeds_7_days")
    scoreCap = Math.min(scoreCap, 49)
  }
  if (
    payload.desiredLaunch === "within-60-days" ||
    payload.desiredLaunch === "later"
  ) {
    disqualifiers.push("launch_not_near_term")
    scoreCap = Math.min(scoreCap, 49)
  }

  const boundedScore = Math.max(0, Math.min(100, score, scoreCap))
  const tier =
    boundedScore >= 80 ? "hot" : boundedScore >= 55 ? "warm" : "nurture"
  return {
    score: boundedScore,
    priority:
      disqualifiers.length > 0
        ? Math.min(59, 50 + Math.round(boundedScore / 2))
        : 50 + Math.round(boundedScore / 2),
    tier,
    reasons,
    disqualifiers,
  }
}

function isValidWebsite(value: string): boolean {
  if (!URL.canParse(value)) return false
  const protocol = new URL(value).protocol
  return protocol === "https:" || protocol === "http:"
}

export function validateContactPayload(payload: ContactPayload): string | null {
  if (!payload.name || !payload.email || !payload.message) {
    return payload.intent === JAPAN_ENTRY_INTENT
      ? "Name, work email, and launch details are required."
      : "必須項目が入力されていません"
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return payload.intent === JAPAN_ENTRY_INTENT
      ? "Enter a valid work email address."
      : "メールアドレスの形式が正しくありません"
  }

  if (payload.intent !== JAPAN_ENTRY_INTENT) return null

  if (
    !payload.company ||
    !payload.companyCountry ||
    !isValidWebsite(payload.companyWebsite)
  ) {
    return "Company, headquarters country, and a valid company website are required."
  }
  if (!DECISION_AUTHORITIES.has(payload.decisionAuthority)) {
    return "Select your decision authority."
  }
  if (!APPROVAL_TIMELINES.has(payload.approvalTimeline)) {
    return "Select the $12,000 approval timeline."
  }
  if (!DESIRED_LAUNCHES.has(payload.desiredLaunch)) {
    return "Select the desired Japan launch timing."
  }
  if (!payload.setupFeeAcknowledged) {
    return "Confirm the fixed $12,000 setup fee before applying."
  }
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(payload.idempotencyKey)) {
    return "Form verification identity is missing. Reload the page and try again."
  }

  return null
}
