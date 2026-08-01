import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  dns: vi.fn(),
  crawl: vi.fn(),
}))

vi.mock("./japan-entry-score-service", () => ({ passesPublicDnsCheck: mocks.dns }))
vi.mock("./crawl4ai-page", () => ({ fetchPageWithCrawl4Ai: mocks.crawl }))

import { fetchHomepageQualityProfile } from "./lead-quality-gate"

afterEach(() => {
  vi.restoreAllMocks()
  mocks.dns.mockReset()
  mocks.crawl.mockReset()
})

describe("fetchHomepageQualityProfile browser fallback", () => {
  it("uses validated Crawl4AI HTML after a retryable direct-fetch block", async () => {
    mocks.dns.mockResolvedValue(true)
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("blocked", { status: 429 }))
    mocks.crawl.mockResolvedValue({
      url: "https://example.com/",
      html: "<html><head><title>Example Products</title></head><body>Our product portfolio</body></html>",
    })

    const result = await fetchHomepageQualityProfile("https://example.com", 1_000)

    expect(mocks.crawl).toHaveBeenCalledWith("https://example.com", 15_000)
    expect(mocks.dns).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({ url: "https://example.com/", title: "Example Products" })
  })

  it("does not send private or DNS-invalid destinations to the browser service", async () => {
    mocks.dns.mockResolvedValue(false)
    await expect(fetchHomepageQualityProfile("https://example.com", 1_000)).rejects.toThrow("public DNS safety check")
    expect(mocks.crawl).not.toHaveBeenCalled()
  })
})
