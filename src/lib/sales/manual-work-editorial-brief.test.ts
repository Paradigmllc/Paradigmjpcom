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
      "https://northstar.example/contact": `<html><head><title>Wholesale</title></head><body><h1>Retail and distribution</h1><p>We work with design retailers and workplace specialists.</p><a href="mailto:partnerships@northstar.example">Email partnerships</a></body></html>`,
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
    expect(brief.publicEmail).toBe("partnerships@northstar.example")
    expect(brief.evidence.some((point) => point.statement.includes("anodised aluminium rail"))).toBe(true)
    expect(brief.evidence.every((point) => point.sourceUrl.startsWith("https://northstar.example"))).toBe(true)
  })
})
