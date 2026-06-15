import { describe, expect, it } from "vitest"
import { parseZoneDomains, techFromCname, countrySignalsFromText } from "./passive-inventory-utils"

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
})
