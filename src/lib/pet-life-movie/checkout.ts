import { randomUUID } from "node:crypto"
import type { PetMoviePlan } from "./types"

export function createPetMovieCheckoutIdempotencyKey(
  projectId: string,
  plan: PetMoviePlan,
  attemptId: string = randomUUID(),
): string {
  return `pet-movie-checkout-${projectId}-${plan}-${attemptId}`
}
