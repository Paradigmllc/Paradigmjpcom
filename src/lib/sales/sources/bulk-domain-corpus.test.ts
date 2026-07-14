import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  zone: vi.fn(),
  feed: vi.fn(),
  tranco: vi.fn(),
}))

vi.mock("./czds-zone-files", () => ({ fetchZoneDomains: mocks.zone }))
vi.mock("./passive-domain-feeds", () => ({ fetchPassiveDomainFeeds: mocks.feed }))
vi.mock("./tranco-top-domains", () => ({ fetchTrancoTopDomains: mocks.tranco }))

import { fetchBulkDomainCorpus } from "./bulk-domain-corpus"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.zone.mockResolvedValue({ domains: [], sourceStats: [], failures: [], ok: false })
  mocks.feed.mockResolvedValue({ domains: [], sourceStats: [], failures: [], ok: false, total: 0 })
  mocks.tranco.mockResolvedValue({ domains: ["one.example", "two.example"], total: 2, ok: true })
})

describe("bulk domain corpus", () => {
  it("uses a zero-config Tranco corpus without search or archive APIs", async () => {
    const result = await fetchBulkDomainCorpus("*.example", 2)

    expect(result.domains).toEqual(["one.example", "two.example"])
    expect(result.sourceStats.map((stat) => stat.source)).toEqual(["tranco_top_domains"])
    expect(result.sourceByDomain["one.example"]).toEqual(["tranco_top_domains"])
  })

  it("prioritizes zone and feed domains before filling from Tranco", async () => {
    mocks.zone.mockResolvedValue({
      domains: ["zone.example"],
      sourceStats: [{ source: "czds_local_zone", pattern: "example", fetched: 1, total: 1, ok: true }],
      failures: [],
      ok: true,
    })
    mocks.feed.mockResolvedValue({
      domains: ["feed.example"],
      sourceStats: [{ source: "passive_domain_feed_local", pattern: "*.example", fetched: 1, total: 1, ok: true }],
      failures: [],
      ok: true,
      total: 1,
    })

    const result = await fetchBulkDomainCorpus("*.example", 3)

    expect(result.domains).toEqual(["zone.example", "feed.example", "one.example"])
  })
})
