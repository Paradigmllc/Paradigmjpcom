import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { parseZoneDomains, techFromCname, countrySignalsFromText } from "./passive-inventory-utils"
import { fetchPassiveDomainFeeds } from "./sources/passive-domain-feeds"
import { detectTechFromEvidence } from "./sources/wappalyzer"

describe("passive inventory utilities", () => {
  it("parses CZDS-style zone rows into domains", () => {
    const domains = parseZoneDomains("example NS ns1.example.net.\nshop.example.eg. 3600 IN NS ns.example.\n$ORIGIN eg.\n", "eg", 10)

    expect(domains).toContain("example.eg")
    expect(domains).toContain("shop.example.eg")
  })

  it("detects Shopify from passive CNAME targets", () => {
    const tech = techFromCname("shops.myshopify.com.")

    expect(tech.map((item) => item.name)).toContain("Shopify")
  })

  it("extracts Egypt country signals from archived text", () => {
    const signals = countrySignalsFromText("EG", "Visit our Cairo store. Pay in EGP or call +20 10 0000 0000.")

    expect(signals.some((signal) => signal.signalType === "phone")).toBe(true)
    expect(Math.max(...signals.map((signal) => signal.confidence))).toBeGreaterThanOrEqual(90)
  })

  it("detects non-CNAME stacks from archived HTML evidence", () => {
    const tech = detectTechFromEvidence({
      html: '<html><head><script src="/wp-content/plugins/woocommerce/assets/js/frontend/cart-fragments.min.js"></script></head></html>',
    })

    expect(tech.map((item) => item.name)).toContain("WordPress")
    expect(tech.map((item) => item.name)).toContain("WooCommerce")
  })

  it("loads local passive domain feeds without active website search", async () => {
    const previous = process.env.PASSIVE_DOMAIN_FEED_DIR
    const dir = await mkdtemp(path.join(tmpdir(), "passive-feed-"))
    process.env.PASSIVE_DOMAIN_FEED_DIR = dir
    await writeFile(path.join(dir, "domains.csv"), "1,store.example.eg\n2,shop.example.com\n", "utf8")

    try {
      const result = await fetchPassiveDomainFeeds("*.eg", 10)

      expect(result.ok).toBe(true)
      expect(result.domains).toEqual(["store.example.eg"])
      expect(result.sourceStats[0]?.source).toBe("passive_domain_feed_local")
    } finally {
      if (previous === undefined) delete process.env.PASSIVE_DOMAIN_FEED_DIR
      else process.env.PASSIVE_DOMAIN_FEED_DIR = previous
    }
  })
})
