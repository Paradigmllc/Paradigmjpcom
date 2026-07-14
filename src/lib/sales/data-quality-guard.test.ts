import { describe, expect, it } from "vitest"
import { isCustomerFacingBusinessDomain } from "./data-quality-guard"

describe("isCustomerFacingBusinessDomain", () => {
  it.each([
    "store.myshopify.com",
    "brand.webflow.io",
    "brand.wixsite.com",
    "preview.vercel.app",
  ])("rejects hosted platform identity %s", (domain) => {
    expect(isCustomerFacingBusinessDomain(domain)).toBe(false)
  })

  it.each(["real-brand.com", "merchant.co.uk", "shop.example.com"])(
    "accepts customer-facing business domain %s",
    (domain) => {
      expect(isCustomerFacingBusinessDomain(domain)).toBe(true)
    },
  )
})
