import { afterEach, describe, expect, it, vi } from "vitest"
import { collectFastManualWorkEvidence } from "./manual-work-fast-evidence"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("fast manual work evidence", () => {
  it("uses one direct homepage request and does not crawl secondary paths", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(`
      <html>
        <head>
          <title>Northstar Desk | Official Store</title>
          <meta name="description" content="Premium compact desk accessories for modern workspaces">
          <meta property="og:site_name" content="Northstar Desk">
        </head>
        <body>
          <h1>Build a better compact workspace</h1>
          <p>Shop modular desk organizers and cable management accessories.</p>
          <button>Add to cart</button>
        </body>
      </html>
    `, {
      status: 200,
      headers: { "content-type": "text/html" },
    }))

    const result = await collectFastManualWorkEvidence("northstar.example")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith("https://northstar.example", expect.objectContaining({ redirect: "follow" }))
    expect(result.companyName).toBe("Northstar Desk")
    expect(result.businessModel).toBe("ecommerce")
    expect(result.evidenceMode).toBe("fast_direct_html")
    expect(result.audit.pages_checked).toHaveLength(1)
  })

  it("fails closed when the homepage has no grounded product context", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html><head><title>Home</title></head><body></body></html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    }))

    await expect(collectFastManualWorkEvidence("empty.example"))
      .rejects.toThrow("enough grounded product context")
  })
})
