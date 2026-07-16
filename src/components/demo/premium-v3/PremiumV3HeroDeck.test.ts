import { describe, expect, it } from "vitest"
import { uniqueHeroMedia } from "./PremiumV3HeroDeck"

describe("uniqueHeroMedia", () => {
  it("removes resized duplicates before building the hero deck", () => {
    const media = [
      { src: "https://image.ekiten.jp/shop/1/photo.jpg?1to1_m", alt: "一", kind: "image" as const },
      { src: "https://image.ekiten.jp/shop/1/photo.jpg?1to1_l", alt: "同じ写真", kind: "image" as const },
      { src: "/scene-2.jpg", alt: "二", kind: "image" as const },
    ]

    expect(uniqueHeroMedia(media)).toHaveLength(2)
    expect(uniqueHeroMedia(media)[0]?.alt).toBe("一")
  })

  it("caps the hero payload while preserving editorial order", () => {
    const media = Array.from({ length: 7 }, (_, index) => ({ src: `/scene-${index}.jpg`, alt: `${index}`, kind: "image" as const }))

    expect(uniqueHeroMedia(media, 5).map((item) => item.alt)).toEqual(["0", "1", "2", "3", "4"])
  })
})
