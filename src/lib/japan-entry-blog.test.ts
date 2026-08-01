import { describe, expect, it } from "vitest"
import { JAPAN_ENTRY_BLOG_POSTS } from "./japan-entry-blog"

describe("Japan Entry editorial set", () => {
  it("contains distinct, publishable English articles", () => {
    const slugs = JAPAN_ENTRY_BLOG_POSTS.map((post) => post.slug)
    expect(new Set(slugs).size).toBe(JAPAN_ENTRY_BLOG_POSTS.length)
    expect(JAPAN_ENTRY_BLOG_POSTS.length).toBeGreaterThanOrEqual(12)

    for (const post of JAPAN_ENTRY_BLOG_POSTS) {
      expect(post.tags).toContain("japan-entry-public")
      expect(post.title.length).toBeGreaterThan(20)
      expect(post.excerpt.length).toBeGreaterThan(80)
      expect([...post.content].length).toBeGreaterThanOrEqual(2000)
      expect(post.content).toMatch(/^\|/m)
      expect(post.heroImage?.src).toMatch(/^\/japan-entry\/.+\.svg$/)
      expect(post.content).toContain("## ")
      expect(post.content.toLowerCase()).not.toContain("free consultation")
      expect(post.content).not.toContain("$1,500")
    }
  })

  it("keeps the stable 14-business-day article internally consistent", () => {
    const post = JAPAN_ENTRY_BLOG_POSTS.find((candidate) => candidate.slug === "japan-entry-21-business-day-readiness")
    expect(post?.title).toContain("14-Business-Day")
    expect(post?.content).toContain("Days 11–14")
    expect(post?.content).not.toContain("Days 16–21")
  })
})
