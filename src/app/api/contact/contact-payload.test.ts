import { describe, expect, test } from "vitest"
import {
  JAPAN_ENTRY_INTENT,
  parseContactPayload,
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
}

describe("Japan Entry contact payload", () => {
  test("parses and validates a qualified application", () => {
    const payload = parseContactPayload(validJapanEntry)

    expect(payload).not.toBeNull()
    expect(payload?.email).toBe("alex@example.com")
    expect(payload?.services).toEqual(["Japan Entry Package"])
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
})
