import { describe, expect, it } from "vitest"
import { buildOwnedLicensedMedia, buildPrivateProposalMedia } from "./demo-proposal-media"
import { sanitizeDemoMedia } from "./demo-public-surface"

describe("buildPrivateProposalMedia", () => {
  it("uses owned or licensed photos and excludes proposal-only assets", () => {
    const media = buildOwnedLicensedMedia({
      status: "proposal_safe",
      assets: [
        { kind: "image", usage: "owned", source: "https://paradigmjp.com/demos/cafe-sosomu/hero.jpg", width: 1920, height: 1080 },
        { kind: "image", usage: "proposal_only", source: "https://image.ekiten.jp/shop/1/photo.jpg" },
      ],
    }, "Cafe SOSOMU", "cafe-sosomu", "restaurant")

    expect(media).toHaveLength(1)
    expect(media[0]?.src).toBe("https://paradigmjp.com/demos/cafe-sosomu/hero.jpg")
    expect(media[0]?.width).toBe(1920)
  })

  it("uses reviewed HTTPS proposal photos and keeps generated fallbacks", () => {
    const media = buildPrivateProposalMedia({
      status: "proposal_safe",
      assets: [
        {
          kind: "image",
          usage: "proposal_only",
          source: "https://image.ekiten.jp/shop/6281715/photo.jpg?size=1to1_m",
        },
        {
          kind: "text",
          usage: "public_fact",
          source: "verified business fact",
        },
        {
          kind: "image",
          usage: "proposal_only",
          source: "http://blocked.example/photo.jpg",
        },
      ],
    }, "株式会社第一リフォーム", "株式会社第一リフォーム", "construction")

    expect(media).toHaveLength(1)
    expect(media[0]?.src).toBe("https://image.ekiten.jp/shop/6281715/photo.jpg")
    expect(media[0]?.fallbackSrc).toContain("/api/sales/demo-visuals/")
    expect(media[0]?.alt).toBe("株式会社第一リフォームの実績写真 1")
    expect(media[0]?.width).toBe(1200)
  })

  it("fails closed for blocked manifests", () => {
    expect(buildPrivateProposalMedia({ status: "blocked", assets: [] }, "店舗", "shop", "retail")).toEqual([])
  })

  it("normalizes portal derivatives before the hero quality gate", () => {
    const media = sanitizeDemoMedia([{
      src: "https://image.ekiten.jp/shop/6281715/photo.jpg?size=1to1_m",
      alt: "施工写真",
      kind: "image",
      width: 1200,
      height: 900,
    }], "株式会社第一リフォーム", ["仕事の現場"], "hero")

    expect(media).toHaveLength(1)
    expect(media[0]?.src).toBe("https://image.ekiten.jp/shop/6281715/photo.jpg")
  })
})
