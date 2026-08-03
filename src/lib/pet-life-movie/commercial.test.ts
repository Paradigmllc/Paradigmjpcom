import { describe, expect, it } from "vitest"
import { petMoviePlan, PET_MOVIE_PLANS } from "./commercial"

describe("Pet Life Movie commercial quality floor", () => {
  it("keeps every paid shot at four seconds or less at the minimum photo count", () => {
    for (const plan of PET_MOVIE_PLANS) {
      expect(plan.durationSeconds / plan.minimumPhotos).toBeLessThanOrEqual(10 / 3)
      expect(plan.idealPhotos).toBeGreaterThanOrEqual(plan.minimumPhotos)
    }
  })

  it("requires denser source coverage for sixty-second films", () => {
    expect(petMoviePlan("mini").minimumPhotos).toBe(10)
    expect(petMoviePlan("story").minimumPhotos).toBe(18)
    expect(petMoviePlan("cinema").minimumPhotos).toBe(18)
  })
})
