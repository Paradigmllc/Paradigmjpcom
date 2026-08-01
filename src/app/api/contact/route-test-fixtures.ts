import { NextRequest } from "next/server"

export const SUBMISSION_ID = "submission-1234567890"
export const LEAD_ID = "11111111-1111-4111-8111-111111111111"
export const OUTBOX_ID = "22222222-2222-4222-8222-222222222222"
export const CLAIM_TOKEN = "33333333-3333-4333-8333-333333333333"

export const persistedLeadResult = {
  id: LEAD_ID,
  created: true,
  meta: { contact_form: { notification_status: "pending" } },
  outboxId: OUTBOX_ID,
  notificationClaimed: true,
  notificationClaimToken: CLAIM_TOKEN,
  notificationStatus: "processing",
}

export const verifiedChallenge = {
  ok: true,
  nonce: "contact_nonce_1234567890",
  clientBinding: "client-binding-hash",
  issuedAt: 1_750_000_000_000,
}

export const validPayload = {
  name: "Alex Founder",
  company: "Acme Software",
  email: "alex@example.com",
  message: "We are launching our B2B SaaS in Japan this month.",
  services: ["Japan Entry Package"],
  locale: "en",
  intent: "japan-entry",
  companyWebsite: "https://example.com",
  companyCountry: "Australia",
  decisionAuthority: "final-decision-maker",
  approvalTimeline: "within-7-days",
  desiredLaunch: "this-month",
  paymentMethod: "credit-card",
  setupFeeAcknowledged: true,
  idempotencyKey: SUBMISSION_ID,
  utmSource: "linkedin",
  utmCampaign: "japan-entry-founders",
  landingPage: "https://paradigmjp.com/en/contact?intent=japan-entry",
  ctaSource: "hero-apply",
  formChallenge: "signed-challenge",
  honeypot: "",
}

export function contactRequest(
  payload: Record<string, unknown> = validPayload,
  locale = "en",
): NextRequest {
  return new NextRequest("https://paradigmjp.com/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Contact-Locale": locale,
      "X-Contact-Submission-Id": String(
        payload.idempotencyKey ?? SUBMISSION_ID,
      ),
    },
    body: JSON.stringify(payload),
  })
}
