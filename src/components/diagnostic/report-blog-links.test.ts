import { beforeEach, describe, expect, it, vi } from "vitest"
import type { BlogPost } from "@/lib/blog"

const getAllBlogPostsMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/blog-cms", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/blog-cms")>()
  return { ...actual, getAllBlogPosts: getAllBlogPostsMock }
})

import { getApprovedReportBlogLinks } from "./report-blog-links"

const APPROVED_POST: BlogPost = {
  slug: "measured-page-speed",
  title: "Core Web Vitals measured in production",
  excerpt: "A measurement guide.",
  content: "Measure before changing the site.",
  date: "2026-07-10",
  category: "Performance",
  tags: ["Core Web Vitals", "japan-entry-public"],
  readTime: "5 min",
}

describe("approved report blog links", () => {
  beforeEach(() => {
    getAllBlogPostsMock.mockReset()
  })

  it("returns no links when no approved public article exists", async () => {
    getAllBlogPostsMock.mockResolvedValue([])

    await expect(getApprovedReportBlogLinks("en")).resolves.toEqual({})
  })

  it("refuses an existing article when the publication marker is missing", async () => {
    getAllBlogPostsMock.mockResolvedValue([{ ...APPROVED_POST, tags: [] }])

    await expect(getApprovedReportBlogLinks("en")).resolves.toEqual({})
  })

  it("links to the actual approved article selected by topic, not a fixed slug", async () => {
    getAllBlogPostsMock.mockResolvedValue([APPROVED_POST])

    await expect(getApprovedReportBlogLinks("en")).resolves.toEqual({
      speed_critical: {
        title: APPROVED_POST.title,
        url: "/en/blog/measured-page-speed",
      },
    })
  })

  it("does not expose blog links for unsupported public locales", async () => {
    await expect(getApprovedReportBlogLinks("de")).resolves.toEqual({})
    expect(getAllBlogPostsMock).not.toHaveBeenCalled()
  })
})
