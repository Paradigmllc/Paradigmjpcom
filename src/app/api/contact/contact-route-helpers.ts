import { createHash } from "node:crypto"
import {
  JAPAN_ENTRY_INTENT,
  type ContactPayload,
  type ContactQualification,
} from "./contact-payload"

export type ContactResponseLanguage = "en" | "ja"

export function requestLanguage(
  request: Request,
  locale?: string,
): ContactResponseLanguage {
  const requestedLocale =
    locale ||
    request.headers.get("x-contact-locale") ||
    request.headers.get("accept-language") ||
    "ja"
  return requestedLocale.trim().toLowerCase().startsWith("ja") ? "ja" : "en"
}

export function localized(
  language: ContactResponseLanguage,
  copy: { en: string; ja: string },
): string {
  return copy[language]
}

export function leadRegionForLocale(locale: string): string {
  if (["ja", "ko", "zh", "en", "es", "pt", "ru", "ar"].includes(locale)) {
    return locale
  }
  if (["de", "fr"].includes(locale)) return "europe"
  if (["vi", "id"].includes(locale)) return "sea"
  return "others"
}

export function contactIdempotencyKey(input: {
  clientKey: string
  email: string
  company: string
  message: string
}): string {
  const retryWindow = new Date().toISOString().slice(0, 13)
  const seed =
    input.clientKey ||
    `${input.email}|${input.company}|${input.message}|${retryWindow}`
  return createHash("sha256").update(`${input.email}|${seed}`).digest("hex")
}

export function contactChallengeHash(input: {
  nonce: string
  clientBinding: string
}): string {
  return createHash("sha256")
    .update(`${input.nonce}\0${input.clientBinding}`)
    .digest("hex")
}

export function buildContactLeadMeta(input: {
  payload: ContactPayload
  qualification: ContactQualification
  reportLocale: string
  targetCountry: string
  idempotencyKey: string
  clientBinding: string
  submittedAt: string
}): Record<string, unknown> {
  const { payload, qualification } = input
  return {
    contact_form: {
      name: payload.name,
      company: payload.company,
      services: payload.services,
      message: payload.message,
      budget: payload.budget,
      locale: payload.locale,
      intent: payload.intent,
      company_website: payload.companyWebsite || null,
      company_country: payload.companyCountry || null,
      target_country: input.targetCountry,
      decision_authority: payload.decisionAuthority || null,
      approval_timeline: payload.approvalTimeline || null,
      desired_launch: payload.desiredLaunch || null,
      setup_fee_acknowledged: payload.setupFeeAcknowledged,
      qualification_score: qualification.score,
      qualification_tier: qualification.tier,
      qualification_reasons: qualification.reasons,
      qualification_disqualifiers: qualification.disqualifiers,
      report_locale: input.reportLocale,
      source: "paradigmjp.com",
      direction: "inbound",
      attribution: {
        utm_source: payload.utmSource || null,
        utm_medium: payload.utmMedium || null,
        utm_campaign: payload.utmCampaign || null,
        utm_term: payload.utmTerm || null,
        utm_content: payload.utmContent || null,
        referrer: payload.referrer || null,
        landing_page: payload.landingPage || null,
        cta_source: payload.ctaSource || null,
      },
      idempotency_key: input.idempotencyKey,
      notification_status: "pending",
      client_binding: input.clientBinding,
      submitted_at: input.submittedAt,
    },
  }
}

export function escapeSlackText(value: string): string {
  return value
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, " ")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("*", "＊")
    .replaceAll("_", "＿")
    .replaceAll("~", "～")
    .replaceAll("`", "｀")
}

export function slackInline(value: string): string {
  return escapeSlackText(value).replace(/\s+/g, " ").trim()
}

export function buildContactSlackText(input: {
  payload: ContactPayload
  reportLocale: string
  qualification: ContactQualification
}): string {
  const { payload, qualification } = input
  return [
    "📩 *paradigmjp.com お問い合わせ*",
    "*lead ID:* {{lead_id}}",
    `*intent:* ${payload.intent}`,
    `*locale:* ${input.reportLocale}`,
    `*qualification:* ${qualification.tier} (${qualification.score}/100)`,
    `*お名前:* ${slackInline(payload.name)}`,
    payload.company ? `*会社名:* ${slackInline(payload.company)}` : null,
    `*メール:* ${slackInline(payload.email)}`,
    payload.phone ? `*電話:* ${slackInline(payload.phone)}` : null,
    payload.services.length
      ? `*興味のあるサービス:* ${payload.services.map(slackInline).join(", ")}`
      : null,
    payload.budget ? `*ご予算:* ${slackInline(payload.budget)}` : null,
    payload.companyWebsite
      ? `*会社URL:* ${slackInline(payload.companyWebsite)}`
      : null,
    payload.companyCountry
      ? `*本社国:* ${slackInline(payload.companyCountry)}`
      : null,
    payload.decisionAuthority ? `*決裁権:* ${payload.decisionAuthority}` : null,
    payload.approvalTimeline
      ? `*$12K承認時期:* ${payload.approvalTimeline}`
      : null,
    payload.desiredLaunch ? `*開始希望:* ${payload.desiredLaunch}` : null,
    `*ご相談内容:*\n${escapeSlackText(payload.message)}`,
  ]
    .filter(Boolean)
    .join("\n")
}

export function contactNotificationTitle(
  intent: ContactPayload["intent"],
  qualification: ContactQualification,
): string {
  return intent === JAPAN_ENTRY_INTENT
    ? `Japan Entry application — ${qualification.tier.toUpperCase()} ${qualification.score}`
    : "Website inquiry"
}
