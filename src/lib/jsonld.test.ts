/**
 * lib/jsonld.test.ts — locale-aware JSON-LD builders unit tests
 *
 * 役割: getOrganizationJsonLd / getServicesJsonLd の locale 切替を検証。
 */

import { describe, it, expect } from "vitest"
import { getOrganizationJsonLd, getServicesJsonLd, BREADCRUMB_JSONLD, FAQ_JSONLD } from "./jsonld"

describe("getOrganizationJsonLd", () => {
  it("returns JP brand name for ja", () => {
    const o = getOrganizationJsonLd("ja")
    expect(o.name).toBe("Paradigm合同会社")
    expect(o["@type"]).toBe("Organization")
    expect(o.knowsAbout).toContain("Web制作")
  })

  it("returns EN brand name for en", () => {
    const o = getOrganizationJsonLd("en")
    expect(o.name).toBe("Paradigm LLC")
    expect(o.knowsAbout).toContain("Web Development")
  })

  it("defaults to ja when locale omitted", () => {
    const o = getOrganizationJsonLd()
    expect(o.name).toBe("Paradigm合同会社")
  })
})

describe("getServicesJsonLd", () => {
  it("emits 4 services", () => {
    const s = getServicesJsonLd("ja")
    expect(s.itemListElement).toHaveLength(4)
    expect(s.itemListElement[0].provider.name).toBe("Paradigm合同会社")
  })

  it("uses USD-equivalent JPY pricing for en (kept as JPY)", () => {
    const s = getServicesJsonLd("en")
    expect(s.itemListElement[0].offers.priceCurrency).toBe("JPY")
  })
})

describe("BREADCRUMB_JSONLD", () => {
  it("emits ListItem with sequential position", () => {
    const b = BREADCRUMB_JSONLD([
      { name: "Home", url: "https://example.com/" },
      { name: "About", url: "https://example.com/about" },
    ])
    expect(b.itemListElement).toHaveLength(2)
    expect(b.itemListElement[0].position).toBe(1)
    expect(b.itemListElement[1].position).toBe(2)
  })
})

describe("FAQ_JSONLD", () => {
  it("wraps Q/A in FAQPage shape", () => {
    const f = FAQ_JSONLD([{ q: "What?", a: "It." }])
    expect(f["@type"]).toBe("FAQPage")
    expect(f.mainEntity[0].name).toBe("What?")
    expect(f.mainEntity[0].acceptedAnswer.text).toBe("It.")
  })
})
