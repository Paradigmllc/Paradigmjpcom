import { describe, expect, it } from "vitest"
import { normalizeGeneratedManualCtaType } from "./manual-japan-entry-generated-cta-type"

describe("normalizeGeneratedManualCtaType", () => {
  it.each([
    ["founder_or_international_growth_forward", "founder_forward"],
    ["route-to-founder", "founder_forward"],
    ["appropriate_owner_routing", "right_person"],
    ["correct person", "right_person"],
    ["permission_to_share_analysis", "permission_to_send"],
    ["send-brief-permission", "permission_to_send"],
  ])("normalizes a safe model alias %s", (value, expected) => {
    expect(normalizeGeneratedManualCtaType(value)).toBe(expected)
  })

  it("leaves an unknown meaning invalid for strict schema rejection", () => {
    expect(normalizeGeneratedManualCtaType("book_a_call")).toBe("book_a_call")
  })
})
