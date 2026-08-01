import { describe, expect, it } from "vitest"
import { getOpportunityBrand } from "./brands"

describe("Enter & Operate Japan commercial package", () => {
  it("keeps validation, launch and ongoing operation as one staged offer", () => {
    const offer = getOpportunityBrand("enter-and-operate-japan", "en")

    expect(offer.offers.map((item) => item.price)).toEqual([
      "$5,000",
      "$20,000 total",
      "$2,500/mo + 10%",
    ])
    expect(offer.offers[0]?.description).toContain("fully credited toward launch")
    expect(offer.inquiryTypes).toContain("Paid Market Validation")
  })

  it("publishes the same staged package in Japanese", () => {
    const offer = getOpportunityBrand("enter-and-operate-japan", "ja")

    expect(offer.offers[0]?.name).toBe("有料市場検証")
    expect(offer.offers[1]?.price).toBe("総額 $20,000")
    expect(offer.offers[2]?.price).toBe("$2,500/月 + 10%")
  })
})
