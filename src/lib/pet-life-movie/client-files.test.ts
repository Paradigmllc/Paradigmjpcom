import { describe, expect, it } from "vitest"
import { validatePetMovieFiles } from "./client-files"

describe("Pet Life Movie client file validation", () => {
  const photo = (name: string, overrides: Partial<{ type: string; size: number }> = {}) => ({ name, type: overrides.type ?? "image/jpeg", size: overrides.size ?? 1_024 })

  it("accepts five supported photos", () => {
    expect(validatePetMovieFiles(Array.from({ length: 5 }, (_, index) => photo(`${index}.jpg`)))).toBeNull()
  })

  it("rejects count, type, and size violations before upload", () => {
    expect(validatePetMovieFiles([photo("one.jpg")])).toContain("at least 5")
    expect(validatePetMovieFiles(Array.from({ length: 21 }, (_, index) => photo(`${index}.jpg`)), 1, 20)).toContain("no more than 20")
    expect(validatePetMovieFiles([photo("bad.svg", { type: "image/svg+xml" })], 1)).toContain("not a supported")
    expect(validatePetMovieFiles([photo("huge.jpg", { size: 21 * 1024 * 1024 })], 1)).toContain("20 MB")
  })
})
