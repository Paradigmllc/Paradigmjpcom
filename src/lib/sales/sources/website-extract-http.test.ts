import { afterEach, describe, expect, it, vi } from "vitest"
import { extractWithHTTP, targetUrl } from "./website-extract-http"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("targetUrl", () => {
  it("adds HTTPS only when a protocol is absent", () => {
    expect(targetUrl("example.com")).toBe("https://example.com")
    expect(targetUrl("http://example.com")).toBe("http://example.com")
    expect(targetUrl("https://example.com/path")).toBe("https://example.com/path")
  })
})

describe("extractWithHTTP", () => {
  it("keeps the structured-data and internal-link fallback behavior", async () => {
    const html = `<!doctype html>
      <html><head>
        <meta property="og:title" content="Example title" />
        <meta property="og:description" content="Example description" />
        <script type="application/ld+json">{"@type":"Organization","name":"Example"}</script>
      </head><body>
        <a href="/about">About</a>
        <a href="https://outside.example/about">Outside</a>
      </body></html>`
    const fetchMock = vi.fn().mockResolvedValue(new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }))
    vi.stubGlobal("fetch", fetchMock)

    const result = await extractWithHTTP("example.com")

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ParadigmBot/1.0)" },
      }),
    )
    expect(result?.structured).toMatchObject({
      organization: { "@type": "Organization", name: "Example" },
      ogTitle: "Example title",
      ogDescription: "Example description",
    })
    expect(result?.internalLinks).toEqual(["https://example.com/about"])
  })
})
