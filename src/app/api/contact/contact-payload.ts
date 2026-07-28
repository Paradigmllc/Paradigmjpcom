import {
  isVideoServicePlanId,
  VIDEO_SERVICE_INTENT,
  type VideoServicePlanId,
} from "@/lib/video-service-content"

export const JAPAN_ENTRY_INTENT = "japan-entry" as const
export { VIDEO_SERVICE_INTENT }

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

export const JAPAN_ENTRY_PAYMENT_METHODS = new Set([
  "wise",
  "bank-transfer",
  "usdc",
  "credit-card",
])

const VIDEO_MONTHLY_DEMAND = new Set(["1-4", "5-10", "11-20", "21-plus"])
const VIDEO_ASSET_READINESS = new Set(["ready", "partial", "concept-only"])
const VIDEO_PREFERRED_START = new Set([
  "within-7-days",
  "within-30-days",
  "later",
])

export type ContactIntent =
  | typeof JAPAN_ENTRY_INTENT
  | typeof VIDEO_SERVICE_INTENT
  | "general"

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
  intent: ContactIntent
  companyWebsite: string
  companyCountry: string
  decisionAuthority: string
  approvalTimeline: string
  desiredLaunch: string
  paymentMethod: string
  setupFeeAcknowledged: boolean
  videoPlan: VideoServicePlanId | ""
  monthlyVideoDemand: string
  videoAssetReadiness: string
  videoPreferredStart: string
  videoTermsAcknowledged: boolean
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

function resolveIntent(
  requestedIntent: string,
  locale: string,
): ContactIntent {
  if (requestedIntent === VIDEO_SERVICE_INTENT) return VIDEO_SERVICE_INTENT
  const englishLocale =
    locale.toLowerCase() === "en" || locale.toLowerCase().startsWith("en-")
  if (englishLocale || requestedIntent === JAPAN_ENTRY_INTENT) {
    return JAPAN_ENTRY_INTENT
  }
  return "general"
}

export function parseContactPayload(value: unknown): ContactPayload | null {
  if (!isRecord(value)) return null

  const locale = readString(value, "locale", 16)
  const requestedIntent = readString(value, "intent", 40)
  const videoPlanValue = readString(value, "videoPlan", 40)

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
    intent: resolveIntent(requestedIntent, locale),
    companyWebsite: readString(value, "companyWebsite", 2_048),
    companyCountry: readString(value, "companyCountry", 120),
    decisionAuthority: readString(value, "decisionAuthority", 80),
    approvalTimeline: readString(value, "approvalTimeline", 80),
    desiredLaunch: readString(value, "desiredLaunch", 80),
    paymentMethod: readString(value, "paymentMethod", 40),
    setupFeeAcknowledged: value.setupFeeAcknowledged === true,
    videoPlan: isVideoServicePlanId(videoPlanValue) ? videoPlanValue : "",
    monthlyVideoDemand: readString(value, "monthlyVideoDemand", 40),
    videoAssetReadiness: readString(value, "videoAssetReadiness", 40),
    videoPreferredStart: readString(value, "videoPreferredStart", 40),
    videoTermsAcknowledged: value.videoTermsAcknowledged === true,
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

function scoreVideoService(
  payload: ContactPayload,
): ContactQualification {
  const planPoints: Record<VideoServicePlanId, number> = {
    essential: 55,
    unlimited: 75,
    priority: 88,
  }
  const demandPoints: Record<string, number> = {
    "1-4": 2,
    "5-10": 5,
    "11-20": 8,
    "21-plus": 10,
  }
  const readinessPoints: Record<string, number> = {
    ready: 7,
    partial: 4,
    "concept-only": 1,
  }
  const startPoints: Record<string, number> = {
    "within-7-days": 5,
    "within-30-days": 3,
    later: 0,
  }
  const plan = payload.videoPlan || "essential"
  const score = Math.min(
    100,
    planPoints[plan] +
      (demandPoints[payload.monthlyVideoDemand] ?? 0) +
      (readinessPoints[payload.videoAssetReadiness] ?? 0) +
      (startPoints[payload.videoPreferredStart] ?? 0),
  )
  const reasons = [
    `video_plan_${plan}`,
    `monthly_demand_${payload.monthlyVideoDemand || "unknown"}`,
    `asset_readiness_${payload.videoAssetReadiness || "unknown"}`,
    `preferred_start_${payload.videoPreferredStart || "unknown"}`,
  ]
  const tier = score >= 80 ? "hot" : score >= 60 ? "warm" : "nurture"
  return {
    score,
    priority: Math.min(100, 55 + Math.round(score / 2)),
    tier,
    reasons,
    disqualifiers: [],
  }
}

export function scoreContactQualification(
  payload: ContactPayload,
): ContactQualification {
  if (payload.intent === VIDEO_SERVICE_INTENT) {
    return scoreVideoService(payload)
  }

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

  if (payload.decisionAuthority === "final-decision-maker") {
    reasons.push("final_decision_maker")
  } else if (payload.decisionAuthority === "direct-access") {
    reasons.push("direct_access_to_approval")
  } else {
    reasons.push("multiple_internal_approvals")
  }

  if (payload.approvalTimeline === "within-7-days") {
    reasons.push("approval_within_7_days")
  } else if (payload.approvalTimeline === "within-30-days") {
    reasons.push("approval_within_30_days")
  } else {
    reasons.push("slow_or_uncertain_approval")
  }

  if (
    payload.desiredLaunch === "this-month" ||
    payload.desiredLaunch === "within-30-days"
  ) {
    reasons.push("near_term_launch")
  } else {
    reasons.push("later_launch")
  }

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

function videoError(payload: ContactPayload, ja: string, en: string): string {
  return payload.locale.toLowerCase().startsWith("ja") ? ja : en
}

function validateVideoService(payload: ContactPayload): string | null {
  if (!payload.company || !isValidWebsite(payload.companyWebsite)) {
    return videoError(
      payload,
      "会社名と有効な会社・サービスURLを入力してください。",
      "Company and a valid company or product URL are required.",
    )
  }
  if (!payload.videoPlan || !isVideoServicePlanId(payload.videoPlan)) {
    return videoError(payload, "希望プランを選択してください。", "Select a plan.")
  }
  if (!VIDEO_MONTHLY_DEMAND.has(payload.monthlyVideoDemand)) {
    return videoError(
      payload,
      "想定する月間需要を選択してください。",
      "Select the expected monthly demand.",
    )
  }
  if (!VIDEO_ASSET_READINESS.has(payload.videoAssetReadiness)) {
    return videoError(
      payload,
      "素材の準備状況を選択してください。",
      "Select the asset readiness.",
    )
  }
  if (!VIDEO_PREFERRED_START.has(payload.videoPreferredStart)) {
    return videoError(
      payload,
      "希望開始時期を選択してください。",
      "Select the preferred start timing.",
    )
  }
  if (!payload.videoTermsAcknowledged) {
    return videoError(
      payload,
      "Video as a Service利用規約と取引条件への確認が必要です。",
      "Confirm the Video as a Service Terms and commercial conditions.",
    )
  }
  return null
}

export function validateContactPayload(payload: ContactPayload): string | null {
  if (!payload.name || !payload.email || !payload.message) {
    if (payload.intent === JAPAN_ENTRY_INTENT) {
      return "Name, work email, and launch details are required."
    }
    return payload.locale.toLowerCase().startsWith("ja")
      ? "必須項目が入力されていません"
      : "Name, work email, and the first request are required."
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    if (payload.intent === JAPAN_ENTRY_INTENT) {
      return "Enter a valid work email address."
    }
    return payload.locale.toLowerCase().startsWith("ja")
      ? "メールアドレスの形式が正しくありません"
      : "Enter a valid email address."
  }

  if (payload.intent === VIDEO_SERVICE_INTENT) {
    const videoValidation = validateVideoService(payload)
    if (videoValidation) return videoValidation
  }

  if (payload.intent === JAPAN_ENTRY_INTENT) {
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
      return "Select the $15,000 approval timeline."
    }
    if (!DESIRED_LAUNCHES.has(payload.desiredLaunch)) {
      return "Select the desired Japan launch timing."
    }
    if (!JAPAN_ENTRY_PAYMENT_METHODS.has(payload.paymentMethod)) {
      return "Select a supported payment method."
    }
    if (!payload.setupFeeAcknowledged) {
      return "Confirm the $15,000 setup fee and 14-business-day delivery refund terms before applying."
    }
  }

  if (
    payload.intent !== "general" &&
    !/^[A-Za-z0-9_-]{16,128}$/.test(payload.idempotencyKey)
  ) {
    return payload.locale.toLowerCase().startsWith("ja")
      ? "フォーム認証情報がありません。ページを再読み込みしてください。"
      : "Form verification identity is missing. Reload the page and try again."
  }

  return null
}
