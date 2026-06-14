import { describe, expect, it } from "vitest"
import { buildSearxngSearchUrl, normalizeSearxngResults, scoreSearxngCandidate } from "./searxng-normalize"

describe("SearxNG lead source normalization", () => {
  it("builds a JSON search URL while preserving a mounted base path", () => {
    const url = buildSearxngSearchUrl("https://search.example.com/searxng", {
      query: '"powered by shopify" "contact"',
      engines: ["google", "bing"],
      categories: ["general"],
      language: "en",
      safesearch: 1,
      page: 2,
      timeRange: "month",
    })

    expect(url).toContain("https://search.example.com/searxng/search")
    expect(url).toContain("format=json")
    expect(url).toContain("pageno=2")
    expect(url).toContain("engines=google%2Cbing")
    expect(url).toContain("time_range=month")
  })

  it("deduplicates domains and rejects search or social platforms", () => {
    const rows = normalizeSearxngResults(
      [
        {
          url: "https://example-shop.com/pages/contact",
          title: "Example Shop - Contact",
          content: "Powered by Shopify. Contact us in Los Angeles.",
          engine: "google",
        },
        {
          url: "https://example-shop.com/about",
          title: "Example Shop - About",
          content: "Same company duplicate.",
          engine: "bing",
        },
        {
          url: "https://www.linkedin.com/company/example-shop",
          title: "LinkedIn",
          content: "Directory profile.",
          engine: "google",
        },
      ],
      '"powered by shopify" "Los Angeles"',
    )

    expect(rows).toHaveLength(3)
    expect(rows[0].status).toBe("ready")
    expect(rows[1].status).toBe("duplicate")
    expect(rows[2].status).toBe("rejected")
  })

  it("rejects tool vendor and search-result pages before import", () => {
    const rows = normalizeSearxngResults(
      [
        {
          url: "https://shopify.com/blog/contact-page",
          title: "How to build a contact page",
          content: "Shopify guide for store owners.",
          engine: "duckduckgo",
        },
        {
          url: "https://www.google.com/search?q=wordpress+tokyo",
          title: "Search results",
          content: "Search results page.",
          engine: "duckduckgo",
        },
        {
          url: "https://salon-example.jp/contact",
          title: "Salon Example - Contact",
          content: "Official salon website. Contact us for reservations and services.",
          engine: "duckduckgo",
        },
      ],
      "salon contact wordpress tokyo",
    )

    expect(rows[0].status).toBe("rejected")
    expect(rows[1].status).toBe("rejected")
    expect(rows[2].status).toBe("ready")
  })

  it("scores ecommerce and contact evidence above generic snippets", () => {
    const strong = scoreSearxngCandidate(
      {
        domain: "example-shop.com",
        title: "Example Shopify Store",
        snippet: "Powered by Shopify. Contact us for ecommerce products and service.",
      },
      "shopify ecommerce contact",
    )
    const weak = scoreSearxngCandidate(
      {
        domain: "example.com",
        title: "Example",
        snippet: "A short generic snippet.",
      },
      "shopify ecommerce contact",
    )

    expect(strong).toBeGreaterThan(weak)
    expect(strong).toBeGreaterThanOrEqual(70)
  })
})
