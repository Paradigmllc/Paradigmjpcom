import { afterEach, describe, expect, it, vi } from "vitest"
import { collectManualEditorialBrief } from "./manual-work-editorial-brief"

function htmlResponse(url: string, html: string): Response {
  const response = new Response(html, { status: 200, headers: { "content-type": "text/html" } })
  Object.defineProperty(response, "url", { value: url })
  return response
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("manual work editorial brief", () => {
  it("collects a bounded set of first-party pages, evidence, and contact routes", async () => {
    const pages: Record<string, string> = {
      "https://northstar.example": `
        <html><head><title>Northstar Workspace</title><meta name="description" content="Modular desk systems for compact creative studios"></head>
        <body>
          <h1>Build a workspace that changes with the project</h1>
          <p>Northstar combines aluminium rails, cable control and reconfigurable storage.</p>
          <a href="/products">Products</a><a href="/pricing">Shop</a><a href="/about">Our story</a><a href="/contact">Wholesale and partnerships</a><a href="/news">News</a>
        </body></html>`,
      "https://northstar.example/products": `<html><head><title>Northstar Rail System</title></head><body><h1>Rail System</h1><p>The anodised aluminium rail supports shelves, trays and cable modules without permanent drilling.</p></body></html>`,
      "https://northstar.example/pricing": `<html><head><title>Northstar Shop</title></head><body><h1>Starter configurations</h1><p>Starter kits are available in 800 mm and 1200 mm widths.</p></body></html>`,
      "https://northstar.example/about": `<html><head><title>About Northstar</title></head><body><h1>Designed in Helsinki</h1><p>The team began with furniture for small urban studios.</p></body></html>`,
      "https://northstar.example/contact": `<html><head><title>Wholesale</title></head><body><h1>Retail and distribution</h1><p>We work with design retailers and workplace specialists.</p><form><input name="company"><input name="email" type="email"><textarea name="message"></textarea></form><a href="mailto:partnerships@northstar.example">Email partnerships</a></body></html>`,
      "https://northstar.example/news": `<html><head><title>News</title></head><body><p>New collection announcement.</p></body></html>`,
    }
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      const html = pages[url]
      return html ? htmlResponse(url, html) : new Response("not found", { status: 404 })
    })

    const brief = await collectManualEditorialBrief({
      domain: "northstar.example",
      companyName: "Northstar Workspace",
      countryCode: "FI",
      businessModel: "ecommerce",
      productNames: ["Northstar Rail System"],
      productContext: "Modular desk systems for compact creative studios",
    })

    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(5)
    expect(brief.pages[0]?.kind).toBe("home")
    expect(brief.pages.some((page) => page.kind === "product")).toBe(true)
    expect(brief.contactUrl).toBe("https://northstar.example/contact")
    expect(brief.contactFormDetected).toBe(true)
    expect(brief.publicEmail).toBe("partnerships@northstar.example")
    expect(brief.evidence.some((point) => point.statement.includes("anodised aluminium rail"))).toBe(true)
    expect(brief.evidence.every((point) => point.sourceUrl.startsWith("https://northstar.example"))).toBe(true)
  })

  it("detects an Airvida-style existing Japan business and corrects stale card fields", async () => {
    const pages: Record<string, string> = {
      "https://airvida.example": `
        <html><head><title>Airvida wearable air purifier</title><meta property="og:site_name" content="Airvida"></head>
        <body>
          <h1>Wearable air purifier series</h1>
          <p>Airvida is the family name of ible's wearable air purifier series.</p>
          <a href="/en/where-to-buy-jp/">Japan / 日 本</a>
          <a href="/en/about/">About ible and business contact</a>
          <a href="/en/product/airvida-l1/">Airvida L1 product</a>
          <a href="/en/support/">Local Support</a>
          <a href="/ja/">日本語</a>
        </body></html>`,
      "https://airvida.example/en/where-to-buy-jp": `
        <html><head><title>Airvida Japan stores</title></head><body>
          <h1>Store</h1><p>EDION AKIBA, Loft Shibuya and other authorized retailers in Japan.</p>
        </body></html>`,
      "https://airvida.example/en/about": `
        <html><head>
          <title>About ible</title>
          <script type="application/ld+json">{"@type":"Organization","name":"ible Technology Inc."}</script>
        </head><body>
          <h1>Business Contact</h1>
          <p>ible is an IoT and wearable device company founded in 2015 and based in Taiwan.</p>
          <form><input name="company"><input name="name"><input name="email" type="email"><textarea name="message"></textarea></form>
          <footer>© 2026 ible Technology Inc. All Rights Reserved.</footer>
        </body></html>`,
      "https://airvida.example/en/product/airvida-l1": `
        <html><head><title>Airvida L1</title><script type="application/ld+json">{"@type":"Product","name":"Airvida L1"}</script></head>
        <body><h1>Airvida L1 wearable air purifier</h1><p>A lightweight wearable air purifier designed for everyday mobility.</p></body></html>`,
      "https://airvida.example/en/support": `<html><head><title>Local Support</title></head><body><h1>Local Support</h1><p>Japan local support is available for Airvida customers.</p></body></html>`,
      "https://airvida.example/ja": `<html><head><title>Airvida 日本語</title></head><body><p>ウェアラブル空気清浄機の日本語ページです。</p></body></html>`,
    }
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      const url = raw.replace(/\/$/, "")
      const html = pages[url]
      return html ? htmlResponse(url, html) : new Response("not found", { status: 404 })
    })

    const brief = await collectManualEditorialBrief({
      domain: "airvida.example",
      companyName: "Airvida",
      countryCode: null,
      businessModel: "service",
      productNames: [],
      productContext: "Wearable air purifier",
    })

    expect(brief.companyName).toBe("ible Technology Inc.")
    expect(brief.countryCode).toBe("TW")
    expect(brief.countryConfidence).toBeGreaterThanOrEqual(60)
    expect(brief.businessModel).toBe("ecommerce")
    expect(brief.productNames).toContain("Airvida L1")
    expect(brief.contactFormDetected).toBe(true)
    expect(brief.contactUrl).toBe("https://airvida.example/en/about")
    expect(brief.japanPresence).toMatchObject({ existing: true, level: "sales" })
    expect(brief.japanPresence.urls).toContain("https://airvida.example/en/where-to-buy-jp/")
  })
})
