import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  scan: vi.fn(),
}))

vi.mock("@/lib/supabase", () => ({ getServiceSalesSupabase: () => null }))
vi.mock("./sources/passive-cname-scan", () => ({ scanCnameRecords: mocks.scan }))

import { processPassiveInventoryDomainBatch } from "./passive-inventory"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.scan.mockResolvedValue({
    ok: true,
    records: { "merchant.example.com": "shops.myshopify.com" },
    engine: "node_dns",
    checked: 1,
  })
})

describe("passive inventory qualification", () => {
  it("keeps a generic-TLD stack match for bounded active country verification", async () => {
    const result = await processPassiveInventoryDomainBatch({
      runId: null,
      countryCode: "US",
      technology: "Shopify",
      domains: ["merchant.example.com"],
      sourceLabel: "bulk_domain_corpus",
      limit: 10,
    })

    expect(result.domains).toEqual(["merchant.example.com"])
    expect(result.stackMatched).toBe(1)
    expect(result.geoMatched).toBe(0)
    expect(result.evidenceByDomain["merchant.example.com"]?.raw).toMatchObject({
      skip_active_verification: false,
    })
  })
})
