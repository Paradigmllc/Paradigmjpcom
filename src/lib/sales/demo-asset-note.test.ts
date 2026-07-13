import { describe, expect, it } from "vitest"
import { buildPremiumAssetNote } from "./demo-asset-note"
import type { DemoAssetReview } from "./demo-private-access"

const generatedReview: DemoAssetReview = {
  status: "consented",
  reviewedAt: "2026-07-13T00:00:00.000Z",
  assets: [1, 2, 3].map((index) => ({
    id: `generated-${index}`,
    kind: "image" as const,
    sourceUrl: `https://example.com/${index}.webp`,
    ownerLabel: "Paradigm",
    sourceAccount: "internal generation",
    useBasis: "generated" as const,
    officialSource: true,
    peopleVisible: false,
    watermarkVisible: false,
    alt: `提案用画像 ${index}`,
  })),
}

describe("premium asset note", () => {
  it("never labels generated proposal visuals as official photography", () => {
    const note = buildPremiumAssetNote(generatedReview, "consented")
    expect(note).toContain("提案用の生成イメージ")
    expect(note).not.toContain("公式素材")
  })

  it("labels consented non-generated visuals as rights-cleared", () => {
    const review = structuredClone(generatedReview)
    review.assets[0].useBasis = "consented"
    expect(buildPremiumAssetNote(review, "consented")).toContain("権利確認済み")
  })
})
