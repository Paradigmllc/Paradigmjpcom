import { describe, expect, it } from "vitest"
import {
  listRevenueSourceRegistry,
  summarizeRevenueSourceRegistry,
} from "./source-registry"

describe("revenue source registry", () => {
  it("keeps source slugs unique", () => {
    const sources = listRevenueSourceRegistry()
    const slugs = sources.map((source) => source.slug)

    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it("separates live sources from paid disabled policy sources", () => {
    const sources = listRevenueSourceRegistry()
    const summary = summarizeRevenueSourceRegistry(sources)

    expect(summary.byStatus.live).toBeGreaterThan(10)
    expect(summary.byStatus.disabled_by_policy).toBeGreaterThan(0)
    expect(sources.find((source) => source.slug === "google_places")?.implementationStatus).toBe("disabled_by_policy")
    expect(sources.find((source) => source.slug === "common_crawl_domains")?.scaleTier).toBe("bulk")
  })

  it("keeps browser search out of the bulk-ready bucket", () => {
    const sources = listRevenueSourceRegistry()
    const browserSearch = sources.find((source) => source.slug === "browser_search")
    const searxng = sources.find((source) => source.slug === "searxng")

    expect(browserSearch?.scaleTier).toBe("browser_expensive")
    expect(searxng?.scaleTier).toBe("browser_expensive")
  })
})
