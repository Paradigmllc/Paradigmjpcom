import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  zone: vi.fn(),
  feed: vi.fn(),
}))

vi.mock("./czds-zone-files", () => ({ fetchZoneDomains: mocks.zone }))
vi.mock("./passive-domain-feeds", () => ({ fetchPassiveDomainFeeds: mocks.feed }))

import { fetchBulkDomainCorpus } from "./bulk-domain-corpus"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.zone.mockResolvedValue({ domains: [], sourceStats: [], failures: [], ok: false })
  mocks.feed.mockResolvedValue({ domains: [], sourceStats: [], failures: [], ok: false, total: 0 })
})

describe("bulk domain corpus", () => {
  it("fails closed when no approved secondary inventory is configured", async () => {
    const result = await fetchBulkDomainCorpus("*.example", 2)

    expect(result.domains).toEqual([])
    expect(result.ok).toBe(false)
    expect(result.failures[0]?.reason).toContain("approved passive feeds")
  })

  it("uses only zone and approved feed domains", async () => {
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

    expect(result.domains).toEqual(["zone.example", "feed.example"])
    expect(result.sourceStats.map((stat) => stat.source)).toEqual(["czds_local_zone", "passive_domain_feed_local"])
  })
})
