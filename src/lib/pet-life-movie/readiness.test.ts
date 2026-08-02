import { afterEach, describe, expect, it } from "vitest"
import { getPetMovieMarketReadiness } from "./readiness"

const names = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "STRIPE_PRICE_PET_MOVIE_MINI",
  "STRIPE_PRICE_PET_MOVIE_STORY",
  "STRIPE_PRICE_PET_MOVIE_CINEMA",
  "VIDEO_FACTORY_INTERNAL_URL",
] as const

afterEach(() => names.forEach((name) => delete process.env[name]))

describe("Pet Life Movie market readiness", () => {
  it("fails closed until payment, email, prices, and rendering are configured", () => {
    expect(getPetMovieMarketReadiness().checkoutEnabled).toBe(false)
    for (const name of names) process.env[name] = "configured"
    expect(getPetMovieMarketReadiness()).toMatchObject({ checkoutEnabled: true, rendererEnabled: true, missing: [] })
  })
})
