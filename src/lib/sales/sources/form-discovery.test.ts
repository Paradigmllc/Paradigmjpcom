import { afterEach, describe, expect, it, vi } from "vitest"
import { discoverFormUrl, normalizeOrigin, resolveHref } from "./form-discovery"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("form-discovery", () => {
  it("normalizes origins and relative links", () => {
    expect(normalizeOrigin("example.com/path")).toBe("https://example.com")
    expect(resolveHref("https://example.com", "/contact")).toBe("https://example.com/contact")
  })

  it("picks a contact form from homepage anchors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === "https://example.com") {
          return new Response('<a href="/contact">お問い合わせ</a>', {
            status: 200,
            headers: { "content-type": "text/html" },
          })
        }
        if (url === "https://example.com/contact") {
          return new Response('<form><input name="email" /><textarea name="message"></textarea></form>', {
            status: 200,
            headers: { "content-type": "text/html" },
          })
        }
        return new Response("", { status: 404 })
      }),
    )

    const result = await discoverFormUrl({ homeUrl: "example.com", region: "jp" })

    expect(result.formUrl).toBe("https://example.com/contact")
    expect(result.method).toBe("regex")
    expect(result.confidence).toBeGreaterThanOrEqual(80)
  })
})
