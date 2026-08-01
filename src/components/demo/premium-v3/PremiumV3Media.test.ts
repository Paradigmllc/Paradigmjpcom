import { describe, expect, it } from "vitest"
import { normalizeDemoMediaUrl } from "./PremiumV3Media"

describe("normalizeDemoMediaUrl", () => {
  it("uses the original reviewed Ekiten image instead of its square thumbnail", () => {
    expect(normalizeDemoMediaUrl("https://image.ekiten.jp/shop/7078039/photo.jpg?1to1_m"))
      .toBe("https://image.ekiten.jp/shop/7078039/photo.jpg")
  })

  it("preserves signed queries and sources from other hosts", () => {
    expect(normalizeDemoMediaUrl("https://image.ekiten.jp/shop/photo.jpg?token=signed"))
      .toBe("https://image.ekiten.jp/shop/photo.jpg?token=signed")
    expect(normalizeDemoMediaUrl("https://example.com/photo.jpg?1to1_m"))
      .toBe("https://example.com/photo.jpg?1to1_m")
  })
})
