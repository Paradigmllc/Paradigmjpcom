import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  passive: vi.fn(),
  corpus: vi.fn(),
}))

vi.mock("./passive-inventory", () => ({
  fetchPassiveInventoryDomains: mocks.passive,
  passivePatterns: () => ["*.us", "*.com"],
}))
vi.mock("./sources/bulk-domain-corpus", () => ({ fetchBulkDomainCorpus: mocks.corpus }))

import { fetchLeadCandidateDomains } from "./lead-candidate-domain-sources"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.passive.mockResolvedValue({
    ok: false,
    domains: [],
    sourceByDomain: {},
    evidenceByDomain: {},
    sourceStats: [],
    failures: [],
    configuration: {},
  })
  mocks.corpus
    .mockResolvedValueOnce({
      ok: true,
      domains: ["store-one.us"],
      sourceByDomain: { "store-one.us": ["tranco_top_domains"] },
      sourceStats: [{ source: "tranco_top_domains", pattern: "*.us", fetched: 1, total: 5597, ok: true }],
      failures: [],
    })
    .mockResolvedValueOnce({
      ok: true,
      domains: ["store-two.com"],
      sourceByDomain: { "store-two.com": ["tranco_top_domains"] },
      sourceStats: [{ source: "tranco_top_domains", pattern: "*.com", fetched: 1, total: 600000, ok: true }],
      failures: [],
    })
})

describe("passive domain factory", () => {
  it("builds the candidate corpus without search engines, proxies, or paid query warehouses", async () => {
    const result = await fetchLeadCandidateDomains("US", 2, { technology: "Shopify" })

    expect(result.domains).toEqual(["store-one.us", "store-two.com"])
    expect(result.sourceStats.map((item) => item.source)).toEqual([
      "tranco_top_domains",
      "tranco_top_domains",
    ])
    expect(result.sourceStats.some((item) => /search|searx|browser|http_archive/i.test(item.source))).toBe(false)
    expect(mocks.corpus).toHaveBeenCalledTimes(2)
  })
})
