import { describe, expect, it } from "vitest"
import {
  JAPANESE_WORK_PUBLICATION_TAG,
  containsUnverifiedJapaneseMarketingClaim,
  isSafeEnglishJapanEntryHomepage,
  isSafeJapaneseHomepageBlock,
  isVerifiedJapaneseWork,
} from "./public-content-safety"

describe("Japanese public content safety", () => {
  it("requires an explicit verification marker for case studies", () => {
    expect(isVerifiedJapaneseWork([{ tag: "Web制作" }])).toBe(false)
    expect(
      isVerifiedJapaneseWork([{ tag: JAPANESE_WORK_PUBLICATION_TAG }]),
    ).toBe(true)
  })

  it.each([
    "Lighthouse 98+",
    "公開後3ヶ月で問い合わせが2倍",
    "依頼し放題・24-48時間納品",
    "成果保証プラン",
  ])("detects unverified public claims: %s", (copy) => {
    expect(containsUnverifiedJapaneseMarketingClaim(copy)).toBe(true)
  })

  it("rejects testimonial blocks even when they contain no number", () => {
    expect(isSafeJapaneseHomepageBlock({ blockType: "testimonials" })).toBe(false)
    expect(
      isSafeJapaneseHomepageBlock({ blockType: "section", title: "提供範囲" }),
    ).toBe(true)
  })

  it("accepts only a single commercially aligned English Japan Entry offer", () => {
    const safeBlocks = [
      {
        blockType: "pricing",
        tiers: [
          {
            price: "$12,000",
            features:
              "six months of managed operation are included for selected launch partners\nContinuation pricing is agreed separately after the included period; availability and scope are confirmed in writing",
          },
        ],
      },
      {
        blockType: "cta",
        title: "Month-one target: 20 qualified launches",
        subtitle:
          "Paradigm's internal operating target for month one — not a customer outcome guarantee.",
        primaryCta: { href: "/en/contact?intent=japan-entry" },
      },
    ]

    expect(isSafeEnglishJapanEntryHomepage(safeBlocks)).toBe(true)
    expect(
      isSafeEnglishJapanEntryHomepage([
        ...safeBlocks,
        { blockType: "section", title: "Book a free call" },
      ]),
    ).toBe(false)
    expect(
      isSafeEnglishJapanEntryHomepage([
        { ...safeBlocks[0], tiers: [{ price: "$3,000", features: "Pilot" }] },
        safeBlocks[1],
      ]),
    ).toBe(false)
  })
})
