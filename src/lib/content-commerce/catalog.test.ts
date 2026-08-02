import { describe, expect, it } from "vitest"
import {
  hashPaymentReference,
  isSafeContentSlug,
  normalizeContentLocale,
} from "./catalog"

describe("content commerce catalog helpers", () => {
  it("normalizes the supported locales", () => {
    expect(normalizeContentLocale("ja")).toBe("ja")
    expect(normalizeContentLocale("en")).toBe("en")
    expect(normalizeContentLocale("fr")).toBe("en")
  })

  it("allows canonical API slugs and rejects path traversal", () => {
    expect(isSafeContentSlug("japan-market-entry-decision-packet")).toBe(true)
    expect(isSafeContentSlug("../private")).toBe(false)
    expect(isSafeContentSlug("UpperCase")).toBe(false)
  })

  it("stores only a deterministic digest of payment responses", () => {
    const digest = hashPaymentReference("payment-response")
    expect(digest).toHaveLength(64)
    expect(digest).toBe(hashPaymentReference("payment-response"))
    expect(digest).not.toContain("payment-response")
  })
})
