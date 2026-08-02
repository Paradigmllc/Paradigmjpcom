import { describe, expect, it } from "vitest"
import { petMarketingAttributionSchema, petMarketingCampaignStatusSchema, petMarketingRunSchema } from "./schema"

describe("Pet marketing input validation", () => {
  it("accepts a minimal privacy-safe attribution event", () => {
    const parsed = petMarketingAttributionSchema.parse({
      eventName: "hero_cta",
      anonymousId: "d05014b7-b44a-44dd-bf85-b7cabb2533fe",
      locale: "en",
      path: "/en/pet-life-movie?utm_source=instagram",
      utmSource: "instagram",
    })
    expect(parsed.eventName).toBe("hero_cta")
  })

  it("rejects unsupported events, paths, slots, and campaign IDs", () => {
    expect(() => petMarketingAttributionSchema.parse({ eventName: "email", anonymousId: "bad", locale: "en", path: "https://bad.example" })).toThrow()
    expect(() => petMarketingRunSchema.parse({ slot: "night", runDate: "2026-08-03" })).toThrow()
    expect(() => petMarketingCampaignStatusSchema.parse({ campaignId: "1", status: "active" })).toThrow()
  })
})
