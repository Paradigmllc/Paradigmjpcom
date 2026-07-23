import { describe, expect, it } from "vitest"
import { manualProductDecisionSubject } from "./manual-japan-entry-product-subject"

describe("manualProductDecisionSubject", () => {
  it("drops an ungrounded outcome clause from an inferred product subject", () => {
    expect(manualProductDecisionSubject({
      rendering: "fraud-review workflow giving teams a direct route to adoption",
      companyName: "Example",
      productNames: [],
    })).toBe("fraud-review workflow")
  })

  it("retains distinctive Salesfire evidence without copying the full source phrase", () => {
    const subject = manualProductDecisionSubject({
      rendering: "analysis of customer preferences, behavioural trends, and purchase history",
      companyName: "Salesfire",
      productNames: [],
    })

    expect(subject).toBe("analysis of customer preferences")
  })

  it("reduces a short exact product phrase to distinctive words", () => {
    expect(manualProductDecisionSubject({
      rendering: "Wearable Air Purifier",
      companyName: "Airvida",
      productNames: [],
    })).toBe("Wearable Purifier")
    expect(manualProductDecisionSubject({
      rendering: "AI-powered customer feedback platform",
      companyName: "Canny",
      productNames: [],
    })).toBe("customer feedback")
  })

  it("keeps both grounded objects in a screenshot-conversion subject", () => {
    expect(manualProductDecisionSubject({
      rendering: "AI-powered conversion from screenshots and videos to clean, production-ready code",
      companyName: "Screenshot to Code",
      productNames: [],
    })).toBe("conversion from screenshots and videos")
  })
})
