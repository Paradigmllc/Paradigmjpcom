import { describe, expect, it } from "vitest"
import {
  opportunityInquirySchema,
  opportunityLeadSubject,
  validateInquiryType,
  type OpportunityInquiry,
} from "./inquiry"

const validInquiry = {
  brand: "source-from-japan",
  inquiryType: "Supplier Shortlist",
  name: "Alex Buyer",
  email: "alex@example.com",
  company: "Example Manufacturing",
  country: "United States",
  website: "https://example.com",
  budget: "5k-15k",
  timeline: "30-days",
  message: "We need a qualified shortlist of precision machining suppliers in Japan.",
  locale: "en",
  websiteConfirmation: "",
} satisfies OpportunityInquiry

describe("opportunity inquiry validation", () => {
  it("accepts a complete high-intent inquiry", () => {
    expect(opportunityInquirySchema.safeParse(validInquiry).success).toBe(true)
  })

  it("rejects invalid email and short requirements", () => {
    const result = opportunityInquirySchema.safeParse({ ...validInquiry, email: "invalid", message: "short" })
    expect(result.success).toBe(false)
  })

  it("rejects the honeypot field when populated", () => {
    const result = opportunityInquirySchema.safeParse({ ...validInquiry, websiteConfirmation: "spam" })
    expect(result.success).toBe(false)
  })

  it("keeps inquiry types scoped to the selected brand", () => {
    expect(validateInquiryType("source-from-japan", "Supplier Shortlist")).toBe(true)
    expect(validateInquiryType("capital-in-japan", "Supplier Shortlist")).toBe(false)
  })

  it("builds an operator-readable subject", () => {
    expect(opportunityLeadSubject(validInquiry)).toBe("Source from Japan: Supplier Shortlist")
  })
})
