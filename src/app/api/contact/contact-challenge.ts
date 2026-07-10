import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

export const CONTACT_CHALLENGE_MIN_AGE_MS = 1_500
export const CONTACT_CHALLENGE_MAX_AGE_MS = 30 * 60_000
const CONTACT_CHALLENGE_CLOCK_SKEW_MS = 5_000

export type ContactChallengeFailure =
  | "not_configured"
  | "missing"
  | "invalid"
  | "too_fast"
  | "expired"

export type ContactChallengeResult =
  | { ok: true; nonce: string; clientBinding: string; issuedAt: number }
  | { ok: false; reason: ContactChallengeFailure }

export interface ContactChallengeContext {
  clientIp: string
  submissionIdentity: string
}

function challengeSecret(): string | null {
  const value = process.env.CONTACT_FORM_CHALLENGE_SECRET?.trim()
  return value && value.length >= 32 ? value : null
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

function clientBinding(
  context: ContactChallengeContext,
  secret: string,
): string {
  return signature(
    `contact-binding-v1\0${context.clientIp}\0${context.submissionIdentity}`,
    secret,
  )
}

export function isValidContactSubmissionIdentity(value: string): boolean {
  return /^[A-Za-z0-9_-]{16,128}$/.test(value)
}

export function issueContactChallenge(
  context: ContactChallengeContext,
  now = Date.now(),
  nonce = randomBytes(18).toString("base64url"),
): string {
  const secret = challengeSecret()
  if (!secret) {
    throw new Error(
      "Contact challenge secret is not configured: set CONTACT_FORM_CHALLENGE_SECRET to at least 32 characters",
    )
  }
  if (!isValidContactSubmissionIdentity(context.submissionIdentity)) {
    throw new Error("Contact submission identity is invalid")
  }
  const binding = clientBinding(context, secret)
  const signedPayload = `contact-challenge-v1.${now}.${nonce}.${binding}`
  return `v1.${now}.${nonce}.${signature(signedPayload, secret)}`
}

export function verifyContactChallenge(
  token: string,
  context: ContactChallengeContext,
  now = Date.now(),
): ContactChallengeResult {
  const secret = challengeSecret()
  if (!secret) return { ok: false, reason: "not_configured" }
  if (!token) return { ok: false, reason: "missing" }
  if (!isValidContactSubmissionIdentity(context.submissionIdentity)) {
    return { ok: false, reason: "invalid" }
  }

  const parts = token.split(".")
  if (parts.length !== 4 || parts[0] !== "v1") {
    return { ok: false, reason: "invalid" }
  }
  const [, issuedAtRaw, nonce, providedSignature] = parts
  if (!/^\d{13}$/.test(issuedAtRaw) || !/^[A-Za-z0-9_-]{16,64}$/.test(nonce)) {
    return { ok: false, reason: "invalid" }
  }

  const issuedAt = Number(issuedAtRaw)
  const age = now - issuedAt
  if (
    !Number.isSafeInteger(issuedAt) ||
    age < -CONTACT_CHALLENGE_CLOCK_SKEW_MS
  ) {
    return { ok: false, reason: "invalid" }
  }

  const binding = clientBinding(context, secret)
  const signedPayload = `contact-challenge-v1.${issuedAtRaw}.${nonce}.${binding}`
  const expectedSignature = signature(signedPayload, secret)
  const provided = Buffer.from(providedSignature)
  const expected = Buffer.from(expectedSignature)
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return { ok: false, reason: "invalid" }
  }
  if (age < CONTACT_CHALLENGE_MIN_AGE_MS)
    return { ok: false, reason: "too_fast" }
  if (age > CONTACT_CHALLENGE_MAX_AGE_MS)
    return { ok: false, reason: "expired" }
  return { ok: true, nonce, clientBinding: binding, issuedAt }
}
