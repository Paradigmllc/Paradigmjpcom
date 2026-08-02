import { describe, expect, it } from "vitest"
import { createPetMovieCheckoutIdempotencyKey } from "./checkout"

describe("Pet Life Movie checkout attempts", () => {
  it("uses a fresh Stripe idempotency key for each checkout attempt", () => {
    const projectId = "00000000-0000-4000-8000-000000000001"
    const first = createPetMovieCheckoutIdempotencyKey(projectId, "mini")
    const second = createPetMovieCheckoutIdempotencyKey(projectId, "mini")

    expect(first).not.toBe(second)
    expect(first).toMatch(/^pet-movie-checkout-00000000-0000-4000-8000-000000000001-mini-[0-9a-f-]{36}$/)
  })

  it("can preserve one key across Stripe SDK retries inside the same attempt", () => {
    expect(createPetMovieCheckoutIdempotencyKey("project-1", "story", "attempt-1"))
      .toBe("pet-movie-checkout-project-1-story-attempt-1")
  })
})
