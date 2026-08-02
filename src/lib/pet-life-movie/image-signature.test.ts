import { describe, expect, it } from "vitest"
import { matchesR2ImageSignature } from "@/lib/sales/r2-storage"

describe("Pet Life Movie image signature validation", () => {
  it("accepts matching JPEG, PNG, WebP, and HEIC signatures", () => {
    expect(matchesR2ImageSignature("image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff, 0x00]))).toBe(true)
    expect(matchesR2ImageSignature("image/png", Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true)
    expect(matchesR2ImageSignature("image/webp", new TextEncoder().encode("RIFF0000WEBP"))).toBe(true)
    expect(matchesR2ImageSignature("image/heic", new TextEncoder().encode("0000ftypheic"))).toBe(true)
  })

  it("rejects a script disguised with an image content type", () => {
    expect(matchesR2ImageSignature("image/jpeg", new TextEncoder().encode("<script>alert(1)</script>"))).toBe(false)
  })
})
