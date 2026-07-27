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
        blockType: "hero",
        title: "Your Japan Country Partner",
        subtitle:
          "The initial paid engagement is Japan Market Setup. Paradigm becomes your outsourced Japan team.",
        primaryCta: {
          label: "Apply for a Japan Partnership — $13K",
          href: "/en/contact?intent=japan-entry",
        },
        secondaryCta: {
          label: "See the partnership model",
          href: "#launch-partner-value",
        },
      },
      {
        blockType: "pricing",
        tiers: [
          {
            price: "$13,000",
            features:
              "Standard managed operation: $2,000/month\nSelected launch partners: $2,000/month × 6 months = $12,000 value included\nMonth 7 onward: $2,000/month under the signed terms; availability and scope are confirmed in writing",
          },
        ],
      },
      {
        blockType: "cta",
        title: "Limited founding-partner capacity",
        subtitle:
          "Availability and scope are confirmed in writing before kickoff.",
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
