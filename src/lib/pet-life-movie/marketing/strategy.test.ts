import { describe, expect, it } from "vitest"
import { planPetMarketingPosts } from "./strategy"

const base = {
  campaignKey: "pet-life-movie-global-launch",
  destinationPath: "/pet-life-movie",
  mediaUrl: "https://paradigmjp.com/pet-life-movie/hero-family-v1.webp",
  runDate: "2026-08-03",
  scheduledFor: "2026-08-03T00:15:00.000Z",
} as const

describe("Pet Life Movie global marketing strategy", () => {
  it.each([
    ["apac", 3, ["JP", "AU"]],
    ["europe", 3, ["GB", "ES", "PT"]],
    ["americas", 4, ["US", "BR", "MX"]],
  ] as const)("plans a complete %s market window", (slot, count, markets) => {
    const posts = planPetMarketingPosts({ ...base, slot })
    expect(posts).toHaveLength(count)
    expect(new Set(posts.map((post) => post.market))).toEqual(new Set(markets))
    expect(new Set(posts.map((post) => post.postKey)).size).toBe(count)
    for (const post of posts) {
      const destination = new URL(post.destinationUrl)
      expect(destination.origin).toBe("https://paradigmjp.com")
      expect(destination.searchParams.get("utm_source")).toBe(post.platform)
      expect(destination.searchParams.get("utm_medium")).toBe("organic_social")
      expect(destination.searchParams.get("utm_campaign")).toBe("pet_life_movie_global_launch")
      expect(post.caption).toContain(post.destinationUrl)
      expect(post.mediaUrl).toMatch(/^https:\/\//)
    }
  })

  it("is deterministic and only marks audited direct connectors as eligible", () => {
    const first = planPetMarketingPosts({ ...base, slot: "americas" })
    const second = planPetMarketingPosts({ ...base, slot: "americas" })
    expect(second).toEqual(first)
    expect(first.filter((post) => post.directPublishingEligible).map((post) => post.platform)).toEqual(["instagram", "pinterest"])
    expect(first.filter((post) => !post.directPublishingEligible).map((post) => post.platform)).toEqual(["tiktok", "youtube"])
  })
})
