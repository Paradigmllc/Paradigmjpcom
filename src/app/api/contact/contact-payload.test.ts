import { describe, expect, test } from "vitest"
import {
  JAPAN_ENTRY_INTENT,
  normalizeCompanyCountry,
  parseContactPayload,
  scoreContactQualification,
  validateContactPayload,
} from "./contact-payload"

const validJapanEntry = {
  name: "Alex Founder",
  company: "Acme Software",
  email: "ALEX@EXAMPLE.COM",
  message: "We want to launch our subscription product in Japan this month.",
  services: ["Japan Entry Package"],
  locale: "en",
  intent: JAPAN_ENTRY_INTENT,
  companyWebsite: "https://example.com",
  companyCountry: "Australia",
  decisionAuthority: "final-decision-maker",
  approvalTimeline: "within-7-days",
  desiredLaunch: "this-month",
  setupFeeAcknowledged: true,
  idempotencyKey: "contact-submission-123456",
}

describe("Japan Entry contact payload", () => {
  test("parses and validates a qualified application", () => {
    const payload = parseContactPayload(validJapanEntry)

    expect(payload).not.toBeNull()
    expect(payload?.email).toBe("alex@example.com")
    expect(payload?.services).toEqual(["Japan Entry Package"])
    expect(payload && scoreContactQualification(payload)).toMatchObject({
      score: 100,
      priority: 100,
      tier: "hot",
    })
    expect(payload && validateContactPayload(payload)).toBeNull()
  })

  test("requires explicit acknowledgement of the fixed setup fee", () => {
    const payload = parseContactPayload({
      ...validJapanEntry,
      setupFeeAcknowledged: false,
    })

    expect(payload).not.toBeNull()
    expect(payload && validateContactPayload(payload)).toBe(
      "Confirm the fixed $12,000 setup fee before applying.",
    )
  })

  test("rejects unsupported decision-speed values", () => {
    const payload = parseContactPayload({
      ...validJapanEntry,
      approvalTimeline: "someday",
    })

    expect(payload).not.toBeNull()
    expect(payload && validateContactPayload(payload)).toBe(
      "Select the $12,000 approval timeline.",
    )
  })

  test("rejects non-http company URLs", () => {
    const payload = parseContactPayload({
      ...validJapanEntry,
      companyWebsite: "javascript:alert(1)",
    })

    expect(payload).not.toBeNull()
    expect(payload && validateContactPayload(payload)).toBe(
      "Company, headquarters country, and a valid company website are required.",
    )
  })

  test("keeps the existing general inquiry flow valid", () => {
    const payload = parseContactPayload({
      name: "山田太郎",
      email: "taro@example.jp",
      message: "Web制作について相談したいです。",
      locale: "ja",
    })

    expect(payload).not.toBeNull()
    expect(payload?.intent).toBe("general")
    expect(payload && validateContactPayload(payload)).toBeNull()
  })

  test("canonicalizes every English request to Japan Entry on the server", () => {
    const payload = parseContactPayload({
      ...validJapanEntry,
      locale: "en-US",
      intent: "general",
    })

    expect(payload?.intent).toBe(JAPAN_ENTRY_INTENT)
    expect(payload && validateContactPayload(payload)).toBeNull()
  })

  test("ranks slow multi-approval applications below fast decision-makers", () => {
    const fast = parseContactPayload(validJapanEntry)
    const slow = parseContactPayload({
      ...validJapanEntry,
      decisionAuthority: "not-final",
      approvalTimeline: "procurement-required",
      desiredLaunch: "later",
    })

    expect(fast).not.toBeNull()
    expect(slow).not.toBeNull()
    if (!fast || !slow) throw new Error("Expected valid parsed payloads")
    expect(scoreContactQualification(slow)).toMatchObject({
      score: 15,
      priority: 58,
      tier: "nurture",
      disqualifiers: [
        "not_final_decision_maker",
        "approval_exceeds_7_days",
        "launch_not_near_term",
      ],
    })
    expect(scoreContactQualification(fast).priority).toBeGreaterThan(
      scoreContactQualification(slow).priority,
    )
  })

  test("never promotes a non-final or slow decision-maker through additive points", () => {
    const notFinal = parseContactPayload({
      ...validJapanEntry,
      decisionAuthority: "not-final",
    })
    const slowApproval = parseContactPayload({
      ...validJapanEntry,
      approvalTimeline: "within-30-days",
    })
    const lateLaunch = parseContactPayload({
      ...validJapanEntry,
      desiredLaunch: "later",
    })

    if (!notFinal || !slowApproval || !lateLaunch) {
      throw new Error("Expected parsed applications")
    }
    expect(scoreContactQualification(notFinal)).toMatchObject({
      score: 39,
      priority: 59,
      tier: "nurture",
    })
    expect(scoreContactQualification(slowApproval)).toMatchObject({
      score: 49,
      priority: 59,
      tier: "nurture",
    })
    expect(scoreContactQualification(lateLaunch)).toMatchObject({
      score: 49,
      priority: 59,
      tier: "nurture",
    })
  })

  test("uses the entered headquarters country instead of locale defaults", () => {
    expect(normalizeCompanyCountry("Australia", "US")).toBe("AU")
    expect(normalizeCompanyCountry("United Kingdom", "US")).toBe("GB")
    expect(normalizeCompanyCountry("", "CA")).toBe("CA")
  })

  test("sanitizes and bounds attribution fields", () => {
    const payload = parseContactPayload({
      ...validJapanEntry,
      utmSource: `\0newsletter${"x".repeat(300)}`,
      ctaSource: "hero-apply",
      landingPage: "https://paradigmjp.com/en/contact?intent=japan-entry",
      referrer: "javascript:alert(1)",
    })

    expect(payload?.utmSource.startsWith("newsletter")).toBe(true)
    expect(payload?.utmSource).toHaveLength(200)
    expect(payload?.ctaSource).toBe("hero-apply")
    expect(payload?.referrer).toBe("")
  })
})
