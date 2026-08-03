import type { PetMoviePlan } from "./types"

export const PET_MOVIE_TERMS_VERSION = "2026-08-02"
export const PET_MOVIE_DELIVERY_BUSINESS_DAYS = 5

export const PET_MOVIE_PLANS: ReadonlyArray<{
  id: PetMoviePlan
  name: string
  priceUsd: number
  durationSeconds: number
  minimumPhotos: number
  idealPhotos: number
  formats: readonly string[]
}> = [
  { id: "mini", name: "Mini", priceUsd: 19, durationSeconds: 30, minimumPhotos: 10, idealPhotos: 12, formats: ["9:16"] },
  { id: "story", name: "Story", priceUsd: 39, durationSeconds: 60, minimumPhotos: 18, idealPhotos: 20, formats: ["9:16", "16:9"] },
  { id: "cinema", name: "Cinema", priceUsd: 79, durationSeconds: 60, minimumPhotos: 18, idealPhotos: 20, formats: ["9:16", "16:9", "1:1"] },
] as const

export function petMoviePlan(planId: PetMoviePlan) {
  const plan = PET_MOVIE_PLANS.find((candidate) => candidate.id === planId)
  if (!plan) throw new Error(`Unknown Pet Life Movie plan: ${planId}`)
  return plan
}
