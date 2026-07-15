import { describe, expect, it } from "vitest"
import { parseCrawl4AiPage } from "./crawl4ai-page"

describe("parseCrawl4AiPage", () => {
  it("accepts only a successful HTML result", () => {
    expect(parseCrawl4AiPage({
      success: true,
      results: [{ success: true, url: "https://example.com/", html: "<html><body>Product</body></html>" }],
    }, "https://example.com")).toEqual({
      url: "https://example.com/",
      html: "<html><body>Product</body></html>",
    })
  })

  it("fails closed for unsuccessful or missing browser output", () => {
    expect(parseCrawl4AiPage({ success: true, results: [{ success: false, html: "blocked" }] }, "https://example.com")).toBeNull()
    expect(parseCrawl4AiPage({ success: false, results: [] }, "https://example.com")).toBeNull()
  })
})
