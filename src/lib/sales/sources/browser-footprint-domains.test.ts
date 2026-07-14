import { beforeEach, describe, expect, it, vi } from "vitest"

const { searchWithBrowser } = vi.hoisted(() => ({ searchWithBrowser: vi.fn() }))

vi.mock("./browser-search", () => ({ searchWithBrowser }))

import { fetchBrowserFootprintDomains } from "./browser-footprint-domains"

describe("fetchBrowserFootprintDomains", () => {
  beforeEach(() => {
    searchWithBrowser.mockReset()
  })

  it("deduplicates technology-footprint results and respects the limit", async () => {
    searchWithBrowser
      .mockResolvedValueOnce({ ok: true, domains: ["brand-one.com", "brand-two.com"], engine: "duckduckgo", total: 2 })
      .mockResolvedValueOnce({ ok: true, domains: ["brand-two.com", "brand-three.com"], engine: "brave", total: 2 })

    const result = await fetchBrowserFootprintDomains({ countryCode: "SG", technology: "Shopify", limit: 2 })

    expect(result.ok).toBe(true)
    expect(result.domains).toEqual(["brand-one.com", "brand-two.com"])
    expect(result.queries[0]).toContain('"Powered by Shopify"')
    expect(searchWithBrowser).toHaveBeenCalledTimes(1)
  })

  it("drops hosted platform identities before they can enter a run", async () => {
    searchWithBrowser.mockResolvedValue({
      ok: true,
      domains: ["internal-store.myshopify.com", "real-brand.com"],
      engine: "duckduckgo",
      total: 2,
    })

    const result = await fetchBrowserFootprintDomains({ countryCode: "US", technology: "Shopify", limit: 20 })

    expect(result.domains).toEqual(["real-brand.com"])
  })

  it("fails closed when the browser provider returns no domains", async () => {
    searchWithBrowser.mockResolvedValue({ ok: false, domains: [], engine: "duckduckgo", total: 0, error: "backend unavailable" })

    const result = await fetchBrowserFootprintDomains({ countryCode: "US", technology: "Shopify", limit: 20 })

    expect(result.ok).toBe(false)
    expect(result.domains).toEqual([])
    expect(result.errors).toHaveLength(6)
  })
})
