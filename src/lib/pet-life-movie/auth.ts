import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

const TOKEN_BYTES = 32

export function createPetMovieSecret(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url")
}

export function hashPetMovieSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex")
}

export function petMovieSecretsMatch(secret: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashPetMovieSecret(secret), "hex")
  const expected = Buffer.from(expectedHash, "hex")
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function readProjectToken(request: Request): string | null {
  const token = request.headers.get("x-pet-movie-token")?.trim()
  return token && token.length >= 32 ? token : null
}

export function createShareSlug(): string {
  return randomBytes(18).toString("base64url")
}

