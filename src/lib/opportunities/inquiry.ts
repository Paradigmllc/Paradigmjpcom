import { z } from "zod"
import { OPPORTUNITY_BRAND_SLUGS, getOpportunityBrand, type OpportunityBrandSlug } from "./brands"

export const opportunityInquirySchema = z.object({
  brand: z.enum(OPPORTUNITY_BRAND_SLUGS),
  inquiryType: z.string().trim().min(2).max(100),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  company: z.string().trim().min(2).max(180),
  country: z.string().trim().min(2).max(100),
  website: z.union([z.literal(""), z.string().trim().url().max(500)]).optional().default(""),
  budget: z.enum(["under-5k", "5k-15k", "15k-50k", "50k-plus", "not-sure"]),
  timeline: z.enum(["now", "30-days", "90-days", "researching"]),
  message: z.string().trim().min(20).max(3_000),
  locale: z.string().trim().min(2).max(12).default("en"),
  turnstileToken: z.string().max(2_048).nullable().optional(),
  websiteConfirmation: z.string().max(0).optional().default(""),
})

export type OpportunityInquiry = z.infer<typeof opportunityInquirySchema>

export function validateInquiryType(brand: OpportunityBrandSlug, inquiryType: string): boolean {
  const allowed = getOpportunityBrand(brand, "en").inquiryTypes
  return allowed.includes(inquiryType)
}

export function opportunityLeadSubject(input: Pick<OpportunityInquiry, "brand" | "inquiryType">): string {
  const brand = getOpportunityBrand(input.brand, "en")
  return `${brand.name}: ${input.inquiryType}`
}

export function opportunityLeadNotes(input: OpportunityInquiry, requestMeta: { ip: string; userAgent: string | null }): string {
  return JSON.stringify({
    opportunity: {
      brand: input.brand,
      inquiry_type: input.inquiryType,
      country: input.country,
      website: input.website || null,
      budget: input.budget,
      timeline: input.timeline,
      locale: input.locale,
      submitted_at: new Date().toISOString(),
    },
    request: {
      ip: requestMeta.ip,
      user_agent: requestMeta.userAgent?.slice(0, 300) ?? null,
    },
  })
}
