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
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readString(source: Record<string, unknown>, key: string, maxLength: number): string {
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

export function parseContactPayload(value: unknown): ContactPayload | null {
  if (!isRecord(value)) return null

  return {
    name: readString(value, "name", 120),
    company: readString(value, "company", 160),
    email: readString(value, "email", 254).toLowerCase(),
    phone: readString(value, "phone", 50),
    services: readServices(value),
    message: readString(value, "message", 5_000),
    budget: readString(value, "budget", 100),
    locale: readString(value, "locale", 16),
    turnstileToken: readString(value, "turnstileToken", 4_096),
    intent: readString(value, "intent", 40) === JAPAN_ENTRY_INTENT ? JAPAN_ENTRY_INTENT : "general",
    companyWebsite: readString(value, "companyWebsite", 2_048),
    companyCountry: readString(value, "companyCountry", 120),
    decisionAuthority: readString(value, "decisionAuthority", 80),
    approvalTimeline: readString(value, "approvalTimeline", 80),
    desiredLaunch: readString(value, "desiredLaunch", 80),
    setupFeeAcknowledged: value.setupFeeAcknowledged === true,
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

  if (!payload.company || !payload.companyCountry || !isValidWebsite(payload.companyWebsite)) {
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

  return null
}
