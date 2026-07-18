import { describe, expect, it } from "vitest"
import { buildPrivateProposalMedia } from "./demo-page-fetch"

describe("buildPrivateProposalMedia", () => {
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
    expect(media[0]?.src).toContain("image.ekiten.jp")
    expect(media[0]?.fallbackSrc).toContain("/api/sales/demo-visuals/")
    expect(media[0]?.alt).toBe("株式会社第一リフォームの実績写真 1")
    expect(media[0]?.width).toBe(1200)
  })

  it("fails closed for blocked manifests", () => {
    expect(buildPrivateProposalMedia({ status: "blocked", assets: [] }, "店舗", "shop", "retail")).toEqual([])
  })
})
