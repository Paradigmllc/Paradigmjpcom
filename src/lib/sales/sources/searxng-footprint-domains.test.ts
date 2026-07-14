import { beforeEach, describe, expect, it, vi } from "vitest"

const { fetchSearxngPageWithRetry } = vi.hoisted(() => ({ fetchSearxngPageWithRetry: vi.fn() }))
vi.mock("./searxng-source-helpers", () => ({ fetchSearxngPageWithRetry }))

import { fetchSearxngFootprintDomains } from "./searxng-footprint-domains"

describe("fetchSearxngFootprintDomains", () => {
  beforeEach(() => {
    vi.stubEnv("SEARXNG_BASE_URL", "http://searxng:8080")
    fetchSearxngPageWithRetry.mockReset()
  })

  it("keeps customer-facing domains and rejects hosted identities", async () => {
    fetchSearxngPageWithRetry.mockResolvedValue({
      results: [
        { url: "https://real-brand.com/contact", title: "Real Brand", content: "Powered by Shopify contact store", engine: "duckduckgo" },
        { url: "https://preview.myshopify.com/pages/contact", title: "Preview", content: "Shopify", engine: "bing" },
      ],
    })

    const result = await fetchSearxngFootprintDomains({ countryCode: "US", technology: "Shopify", limit: 10 })

    expect(result.ok).toBe(true)
    expect(result.domains).toEqual(["real-brand.com"])
    expect(result.evidenceByDomain["real-brand.com"]?.discovery_engine).toBe("duckduckgo")
  })

  it("fails closed when the internal service is unavailable", async () => {
    fetchSearxngPageWithRetry.mockRejectedValue(new Error("connection refused"))

    const result = await fetchSearxngFootprintDomains({ countryCode: "GB", technology: "Shopify", limit: 10 })

    expect(result.ok).toBe(false)
    expect(result.domains).toEqual([])
    expect(result.errors).toHaveLength(6)
  })
})
