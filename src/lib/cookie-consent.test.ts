import { describe, expect, it } from "vitest"
import {
  CONSENT_REASK_AFTER_DAYS,
  hasAnalyticsConsent,
  isConsentStillValid,
  parseStoredConsent,
} from "./cookie-consent"

describe("cookie consent storage", () => {
  it("accepts only the supported decision shape", () => {
    expect(
      parseStoredConsent(
        JSON.stringify({
          decision: "accept",
          decidedAt: "2026-07-10T00:00:00.000Z",
        }),
      ),
    ).toEqual({
      decision: "accept",
      decidedAt: "2026-07-10T00:00:00.000Z",
    })
    expect(parseStoredConsent(JSON.stringify({ decision: "maybe" }))).toBeNull()
  })

  it("expires decisions after the published re-prompt interval", () => {
    const decidedAt = Date.parse("2025-01-01T00:00:00.000Z")
    const stored = {
      decision: "decline" as const,
      decidedAt: new Date(decidedAt).toISOString(),
    }
    const validNow = decidedAt + (CONSENT_REASK_AFTER_DAYS - 1) * 86_400_000
    const expiredNow = decidedAt + CONSENT_REASK_AFTER_DAYS * 86_400_000

    expect(isConsentStillValid(stored, validNow)).toBe(true)
    expect(isConsentStillValid(stored, expiredNow)).toBe(false)
    expect(hasAnalyticsConsent({ ...stored, decision: "accept" }, validNow)).toBe(true)
    expect(hasAnalyticsConsent(stored, validNow)).toBe(false)
  })
})
