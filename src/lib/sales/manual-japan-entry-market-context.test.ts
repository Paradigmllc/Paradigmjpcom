import { beforeEach, describe, expect, it, vi } from "vitest"

const sources = vi.hoisted(() => ({
  tranco: vi.fn(),
  radar: vi.fn(),
  commonCrawl: vi.fn(),
  sitemap: vi.fn(),
}))

vi.mock("./sources/tranco", () => ({ queryTrancoRank: sources.tranco }))
vi.mock("./sources/cloudflare-radar", () => ({ queryCloudflareRadar: sources.radar }))
vi.mock("./sources/commoncrawl", () => ({ queryCommonCrawl: sources.commonCrawl }))
vi.mock("./sources/sitemap", () => ({ analyzeSitemap: sources.sitemap }))

import { collectManualMarketProjection } from "./manual-japan-entry-market-context"
import type { ManualCompanyProfile } from "./manual-japan-entry-types"

const profile: ManualCompanyProfile = {
  companyName: "Example",
  countryCode: "US",
  isJapaneseCompany: false,
  smbStatus: "qualified",
  smbConfidence: 90,
  smbEvidence: ["Public evidence"],
  japanEntryFitStatus: "qualified",
  japanEntryFitConfidence: 90,
  japanEntryFitEvidence: ["Public evidence"],
  businessModel: "saas",
  industry: "Technology / IT",
  productContext: "Subscription analytics platform",
  observedFacts: ["Public evidence"],
}

beforeEach(() => {
  vi.clearAllMocks()
  sources.tranco.mockResolvedValue({ ok: false, domain: "example.com", rank: null })
  sources.radar.mockResolvedValue({ ok: false, domain: "example.com" })
  sources.commonCrawl.mockResolvedValue({ ok: false, domain: "example.com", pagesInIndex: null, lastCrawled: null })
  sources.sitemap.mockResolvedValue({ source: "sitemap", ok: false, data: null })
})

describe("manual market projection evidence gate", () => {
  it("falls back to a no-estimate cell when no public rank is observed", async () => {
    const result = await collectManualMarketProjection({ domain: "example.com", profile })
    expect(result.visibility.band).toBe("not-observed")
    expect(result.projection).toBeNull()
    expect(result.fallbackReason).toContain("推定なし文面")
  })

  it("builds a labeled projection only when public rank evidence exists", async () => {
    sources.tranco.mockResolvedValue({ ok: true, domain: "example.com", rank: 42_000 })
    const result = await collectManualMarketProjection({ domain: "example.com", profile })
    expect(result.visibility.band).toBe("top-100k")
    expect(result.projection).toMatchObject({ classification: "modeled-estimate" })
    expect(result.projection?.evidence.some((item) => item.classification === "estimated")).toBe(true)
    expect(result.fallbackReason).toBeNull()
  })
})
