import { afterEach, describe, expect, test, vi } from "vitest"
import {
  CONTACT_CHALLENGE_MAX_AGE_MS,
  CONTACT_CHALLENGE_MIN_AGE_MS,
  issueContactChallenge,
  verifyContactChallenge,
} from "./contact-challenge"

const NOW = 1_750_000_000_000
const NONCE = "fixed_nonce_for_contact_form"
const CONTEXT = {
  clientIp: "203.0.113.10",
  submissionIdentity: "contact-submission-123456",
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("contact form challenge", () => {
  test("accepts a valid signed challenge only after minimum human-fill time", () => {
    vi.stubEnv(
      "CONTACT_FORM_CHALLENGE_SECRET",
      "contact-form-secret-at-least-32-characters",
    )
    const token = issueContactChallenge(CONTEXT, NOW, NONCE)

    expect(
      verifyContactChallenge(
        token,
        CONTEXT,
        NOW + CONTACT_CHALLENGE_MIN_AGE_MS - 1,
      ),
    ).toEqual({
      ok: false,
      reason: "too_fast",
    })
    expect(
      verifyContactChallenge(
        token,
        CONTEXT,
        NOW + CONTACT_CHALLENGE_MIN_AGE_MS,
      ),
    ).toMatchObject({
      ok: true,
      nonce: NONCE,
      issuedAt: NOW,
    })
  })

  test("rejects expired and tampered challenges", () => {
    vi.stubEnv(
      "CONTACT_FORM_CHALLENGE_SECRET",
      "contact-form-secret-at-least-32-characters",
    )
    const token = issueContactChallenge(CONTEXT, NOW, NONCE)

    expect(
      verifyContactChallenge(
        token,
        CONTEXT,
        NOW + CONTACT_CHALLENGE_MAX_AGE_MS + 1,
      ),
    ).toEqual({
      ok: false,
      reason: "expired",
    })
    const tampered = `${token.slice(0, -1)}${token.endsWith("x") ? "y" : "x"}`
    expect(
      verifyContactChallenge(
        tampered,
        CONTEXT,
        NOW + CONTACT_CHALLENGE_MIN_AGE_MS,
      ),
    ).toEqual({ ok: false, reason: "invalid" })
  })

  test("binds a challenge to both client IP and submission identity", () => {
    vi.stubEnv(
      "CONTACT_FORM_CHALLENGE_SECRET",
      "contact-form-secret-at-least-32-characters",
    )
    const token = issueContactChallenge(CONTEXT, NOW, NONCE)

    expect(
      verifyContactChallenge(
        token,
        { ...CONTEXT, clientIp: "203.0.113.11" },
        NOW + CONTACT_CHALLENGE_MIN_AGE_MS,
      ),
    ).toEqual({ ok: false, reason: "invalid" })
    expect(
      verifyContactChallenge(
        token,
        { ...CONTEXT, submissionIdentity: "different-submission-123" },
        NOW + CONTACT_CHALLENGE_MIN_AGE_MS,
      ),
    ).toEqual({ ok: false, reason: "invalid" })
  })

  test("uses only the dedicated contact challenge secret", () => {
    vi.stubEnv("CONTACT_FORM_CHALLENGE_SECRET", "")
    vi.stubEnv(
      "TRIGGER_WEBHOOK_SECRET",
      "trigger-secret-at-least-16-characters",
    )
    vi.stubEnv("SALES_API_SECRET", "sales-secret-at-least-16-characters")

    expect(() => issueContactChallenge(CONTEXT, NOW, NONCE)).toThrow(
      "CONTACT_FORM_CHALLENGE_SECRET",
    )
  })

  test("fails closed when no server secret is configured", () => {
    vi.stubEnv("CONTACT_FORM_CHALLENGE_SECRET", "")

    expect(() => issueContactChallenge(CONTEXT, NOW, NONCE)).toThrow(
      "Contact challenge secret is not configured",
    )
    expect(verifyContactChallenge("token", CONTEXT, NOW)).toEqual({
      ok: false,
      reason: "not_configured",
    })
  })
})
