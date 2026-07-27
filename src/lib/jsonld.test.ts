/**
 * lib/jsonld.test.ts — locale-aware JSON-LD builders unit tests
 *
 * 役割: getOrganizationJsonLd / getServicesJsonLd の locale 切替を検証。
 */

import { describe, it, expect } from "vitest"
import {
  BREADCRUMB_JSONLD,
  FAQ_JSONLD,
  JAPAN_ENTRY_DESCRIPTION,
  JAPAN_ENTRY_TITLE,
  getJapanEntryApplicationJsonLd,
  getJapanEntryHomeJsonLd,
  getOrganizationJsonLd,
  getServicesJsonLd,
} from "./jsonld"

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
    expect(o.knowsAbout).toContain("Japan Country Partnership")
    expect(o).not.toHaveProperty("foundingDate")
    expect(o).not.toHaveProperty("email")
  })

  it("defaults to ja when locale omitted", () => {
    const o = getOrganizationJsonLd()
    expect(o.name).toBe("Paradigm合同会社")
  })
})

describe("getServicesJsonLd", () => {
  it("emits the domestic service catalogue for ja", () => {
    const s = getServicesJsonLd("ja")
    expect(s.itemListElement).toHaveLength(4)
    expect(s.itemListElement[0].name).toBe("Web制作")
    expect(s.itemListElement[0].provider.name).toBe("Paradigm合同会社")
  })

  it("emits the fixed USD Japan Market Setup offer for en", () => {
    const s = getServicesJsonLd("en")
    expect(s.itemListElement).toHaveLength(1)
    expect(s.itemListElement[0].name).toBe("Your Japan Country Partner | Paradigm")
    expect(s.itemListElement[0].offers).toMatchObject({
      priceCurrency: "USD",
      price: "13000",
    })
  })
})

describe("Japan Entry structured data", () => {
  it("positions Paradigm as the outsourced Japan country partner", () => {
    expect(JAPAN_ENTRY_TITLE).toBe("Your Japan Country Partner | Paradigm")
    for (const term of [
      "outsourced Japan team",
      "localization",
      "sales channels",
      "Japanese customer support",
      "local operations",
      "market execution",
      "Japan Market Setup",
    ]) {
      expect(JAPAN_ENTRY_DESCRIPTION).toContain(term)
    }
    expect(JAPAN_ENTRY_DESCRIPTION).not.toMatch(/20\s*%|20 percent|revenue[- ]share/i)
  })

  it("publishes one fixed Service offer and FAQPage on the homepage", () => {
    const data = getJapanEntryHomeJsonLd()
    expect(data["@graph"][0]).toMatchObject({
      "@type": "Service",
      offers: {
        "@type": "Offer",
        name: "Japan Market Setup",
        price: "13000",
        priceCurrency: "USD",
        priceSpecification: [
          expect.objectContaining({ price: "13000", priceCurrency: "USD" }),
        ],
      },
    })
    const faqPage = data["@graph"].find((node) => node["@type"] === "FAQPage")
    expect(faqPage).toBeDefined()
    if (!faqPage || !("mainEntity" in faqPage)) throw new Error("FAQPage schema is missing")
    expect(faqPage.mainEntity.length).toBeGreaterThanOrEqual(5)
    const faqText = JSON.stringify(faqPage)
    expect(faqText).toContain("Wise")
    expect(faqText).toContain("14 business days")
    expect(faqText).toContain("100% of the USD 13,000 setup fee is refunded")
  })

  it("publishes an intent-specific application page", () => {
    const data = getJapanEntryApplicationJsonLd()
    expect(data).toMatchObject({
      "@type": "ContactPage",
      inLanguage: "en",
      potentialAction: { "@type": "CommunicateAction" },
    })
    expect(data.url).toBe("https://paradigmjp.com/en/contact")
    expect(data.potentialAction.target.urlTemplate).toContain("intent=japan-entry")
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
