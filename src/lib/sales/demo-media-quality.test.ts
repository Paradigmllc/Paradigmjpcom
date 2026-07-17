import { describe, expect, it } from "vitest"
import { filterPremiumMedia, isLikelyLowResolutionSource, isPremiumMediaUsable } from "./demo-media-quality"

describe("demo media quality gate", () => {
  const highQuality = { src: "/clinic.jpg", alt: "外観", kind: "image" as const, width: 1_920, height: 1_280 }

  it("rejects portal derivatives and missing dimensions", () => {
    expect(isLikelyLowResolutionSource("https://image.ekiten.jp/shop/1/photo.jpg?size=1to1_m")).toBe(true)
    expect(isPremiumMediaUsable({ ...highQuality, src: "https://image.ekiten.jp/shop/1/photo.jpg?size=1to1_m" }, "hero")).toBe(false)
    expect(isPremiumMediaUsable({ src: "/unknown.jpg", alt: "不明", kind: "image" }, "hero")).toBe(false)
  })

  it("requires a stricter canvas for hero media", () => {
    const cardImage = { ...highQuality, width: 960, height: 640 }
    expect(isPremiumMediaUsable(cardImage, "gallery")).toBe(true)
    expect(isPremiumMediaUsable(cardImage, "hero")).toBe(false)
  })

  it("keeps only safe media in deterministic order", () => {
    expect(filterPremiumMedia([highQuality, { ...highQuality, src: "/small.jpg", width: 640, height: 480 }], "gallery")).toEqual([highQuality])
  })
})
