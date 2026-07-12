import { describe, expect, it } from "vitest"
import {
  getFallbackAnswer,
  isSafeEnglishCommercialAnswer,
} from "@/lib/chat-commercial"

describe("chat commercial fallback", () => {
  it("returns the fixed Japan Entry price without legacy offers", () => {
    const answer = getFallbackAnswer("How much does it cost?", "en")

    expect(answer).toContain("$12,000")
    expect(answer).toContain("$995/month")
    expect(answer).toContain("Future-period cancellation follows the signed terms")
    expect(answer).not.toMatch(/\bcancellable\b|cancel anytime/i)
    expect(answer).not.toMatch(/free consult|¥|1,300|198,000/i)
  })

  it("states the verified launch timing and dependencies", () => {
    const answer = getFallbackAnswer("How long does launch take?", "en")

    expect(answer).toContain("14 business days")
    expect(answer).toContain("agreement")
    expect(answer).toContain("payment")
  })

  it("never repeats unverified company metrics", () => {
    const answer = getFallbackAnswer("Who is Paradigm?", "en")

    expect(answer).not.toMatch(/200\+ clients|98% retention|founded 2022/i)
    expect(answer).toContain("Tokyo-based")
  })

  it("rejects generated English answers with unverified prices or metrics", () => {
    expect(isSafeEnglishCommercialAnswer(
      "Setup is $12,000, then $0 for six months and $995 after that.",
    )).toBe(true)
    expect(isSafeEnglishCommercialAnswer("A starter package is $1,500.")).toBe(false)
    expect(isSafeEnglishCommercialAnswer("Trusted by 200+ clients.")).toBe(false)
    expect(isSafeEnglishCommercialAnswer("Month seven is $995/month, cancellable.")).toBe(false)
    expect(isSafeEnglishCommercialAnswer("Month seven is $995/month; cancel anytime.")).toBe(false)
    expect(isSafeEnglishCommercialAnswer(
      "Month seven is $995/month and can be cancelled for future periods under the signed terms.",
    )).toBe(true)
  })
})
