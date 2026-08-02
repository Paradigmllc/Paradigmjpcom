import { describe, expect, it } from "vitest"
import { createPetMovieProjectSchema, petMovieCheckoutSchema, petMovieContributionUploadSchema, petMovieUploadSchema } from "./schema"

describe("Pet Life Movie input validation", () => {
  it("accepts the no-account MVP project shape", () => {
    const parsed = createPetMovieProjectSchema.parse({
      petName: "Mugi",
      species: "dog",
      occasion: "life",
      locale: "ja",
      mood: "warm",
      timeTogether: "12年間",
      memories: ["川沿いの散歩"],
      consentConfirmed: true,
    })
    expect(parsed.petName).toBe("Mugi")
  })

  it("rejects executable and oversized upload types", () => {
    expect(() => petMovieUploadSchema.parse({ files: [{ name: "bad.exe", type: "application/octet-stream", size: 20 }] })).toThrow()
    expect(() => petMovieUploadSchema.parse({ files: [{ name: "huge.jpg", type: "image/jpeg", size: 21 * 1024 * 1024 }] })).toThrow()
  })

  it("requires and normalizes the delivery email before checkout", () => {
    expect(petMovieCheckoutSchema.parse({ plan: "story", email: " Owner@Example.COM ", termsAccepted: true }).email)
      .toBe("owner@example.com")
    expect(() => petMovieCheckoutSchema.parse({ plan: "story", email: "owner@example.com", termsAccepted: false })).toThrow()
  })

  it("requires a real family memory and explicit contribution consent", () => {
    const files = [{ name: "family.jpg", type: "image/jpeg" as const, size: 1200 }]
    expect(() => petMovieContributionUploadSchema.parse({ files, memories: [], consentConfirmed: true })).toThrow()
    expect(() => petMovieContributionUploadSchema.parse({ files, memories: ["Morning walks"], consentConfirmed: false })).toThrow()
    expect(petMovieContributionUploadSchema.parse({ files, memories: ["Morning walks"], consentConfirmed: true }).memories).toEqual(["Morning walks"])
  })
})

