import { describe, expect, it } from "vitest"
import { createPetMovieProjectSchema, petMovieCheckoutSchema, petMovieUploadSchema } from "./schema"

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
    expect(petMovieCheckoutSchema.parse({ plan: "story", email: " Owner@Example.COM " }).email)
      .toBe("owner@example.com")
    expect(() => petMovieCheckoutSchema.parse({ plan: "story" })).toThrow()
  })
})

