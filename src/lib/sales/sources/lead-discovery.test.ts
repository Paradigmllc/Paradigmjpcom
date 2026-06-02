import { describe, expect, it } from "vitest"
import { discoverLeadCandidates } from "./lead-discovery"

describe("discoverLeadCandidates", () => {
  it("returns missing configuration as a non-throwing result for SearxNG", async () => {
    const old = process.env.SEARXNG_BASE_URL
    delete process.env.SEARXNG_BASE_URL
    const result = await discoverLeadCandidates({ query: "shopify contact", source: "searxng" })
    process.env.SEARXNG_BASE_URL = old

    expect(result.ok).toBe(false)
    expect(result.source).toBe("searxng")
    expect(result.error).toContain("SEARXNG_BASE_URL")
    expect(result.candidates).toHaveLength(0)
  })
})
