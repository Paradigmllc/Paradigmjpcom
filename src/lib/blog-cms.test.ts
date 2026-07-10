import { describe, expect, it } from "vitest"
import type { BlogPost } from "./blog"
import {
  ENGLISH_BLOG_PUBLICATION_TAG,
  JAPANESE_BLOG_PUBLICATION_TAG,
  isPublicEnglishBlogPost,
  isPublicJapaneseBlogPost,
} from "./blog-cms"

const SAFE_POST: BlogPost = {
  slug: "japan-entry-readiness",
  title: "Japan Entry readiness for fast-decision SMBs",
  excerpt: "How to prepare the owner, inputs, and approval path.",
  content: "The published offer uses a fixed scope and a conditional launch target.",
  date: "2026-07-10",
  category: "Japan Entry",
  tags: [ENGLISH_BLOG_PUBLICATION_TAG],
  readTime: "5 min",
}

describe("English public blog gate", () => {
  it("requires an explicit publication marker", () => {
    expect(isPublicEnglishBlogPost(SAFE_POST)).toBe(true)
    expect(isPublicEnglishBlogPost({ ...SAFE_POST, tags: [] })).toBe(false)
  })

  it.each([
    "Book a free consultation",
    "Ask for a free quote",
    "Paradigm supports 12 languages",
    "Starter plan from ¥300,000",
  ])("blocks legacy sales copy: %s", (legacyCopy) => {
    expect(
      isPublicEnglishBlogPost({ ...SAFE_POST, content: legacyCopy }),
    ).toBe(false)
  })
})

describe("Japanese public blog gate", () => {
  it("keeps legacy and unreviewed CMS posts out of the public site", () => {
    expect(isPublicJapaneseBlogPost({ ...SAFE_POST, tags: [] })).toBe(false)
    expect(
      isPublicJapaneseBlogPost({
        ...SAFE_POST,
        tags: [JAPANESE_BLOG_PUBLICATION_TAG],
      }),
    ).toBe(true)
  })
})
