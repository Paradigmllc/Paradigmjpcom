import { describe, expect, it } from "vitest"
import { createPetMovieSecret, hashPetMovieSecret, petMovieSecretsMatch } from "./auth"

describe("Pet Life Movie secret handling", () => {
  it("creates high-entropy URL-safe secrets and stores only a hash", () => {
    const secret = createPetMovieSecret()
    expect(secret).toMatch(/^[A-Za-z0-9_-]{40,}$/)
    expect(hashPetMovieSecret(secret)).toMatch(/^[a-f0-9]{64}$/)
    expect(hashPetMovieSecret(secret)).not.toContain(secret)
  })

  it("compares the correct token without accepting a different token", () => {
    const secret = createPetMovieSecret()
    const expectedHash = hashPetMovieSecret(secret)
    expect(petMovieSecretsMatch(secret, expectedHash)).toBe(true)
    expect(petMovieSecretsMatch(createPetMovieSecret(), expectedHash)).toBe(false)
  })
})

