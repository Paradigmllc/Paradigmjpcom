import type { PetMoviePlan } from "./types"

export const PET_MOVIE_TERMS_VERSION = "2026-08-02"
export const PET_MOVIE_DELIVERY_BUSINESS_DAYS = 5

export const PET_MOVIE_PLANS: ReadonlyArray<{
  id: PetMoviePlan
  name: string
  priceUsd: number
  durationSeconds: number
  formats: readonly string[]
}> = [
  { id: "mini", name: "Mini", priceUsd: 19, durationSeconds: 30, formats: ["9:16"] },
  { id: "story", name: "Story", priceUsd: 39, durationSeconds: 60, formats: ["9:16", "16:9"] },
  { id: "cinema", name: "Cinema", priceUsd: 79, durationSeconds: 60, formats: ["9:16", "16:9", "1:1"] },
] as const
