import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { discoverFormUrl, normalizeOrigin, resolveHref } from "./form-discovery"
import { isAllowedFormUrlForOrigin } from "./external-form-discovery"

beforeEach(() => {
  vi.stubEnv("CRAWL4AI_BASE_URL", "")
  vi.stubEnv("STEEL_BASE_URL", "")
  vi.stubEnv("CRAWLEE_WORKER_URL", "")
  vi.stubEnv("OUTREACH_WORKER_URL", "")
})

afterEach(() => {
  vi.unstubAllEnvs()
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
          return new Response('<h1>Contact us</h1><form><input type="email" name="email" /><textarea name="message"></textarea><button type="submit">Send</button></form>', {
            status: 200,
            headers: { "content-type": "text/html" },
          })
        }
        return new Response("", { status: 404 })
      }),
    )

    const result = await discoverFormUrl({ homeUrl: "example.com", region: "jp" })

    expect(result.formUrl).toBe("https://example.com/contact")
    expect(result.method).toBe("dom")
    expect(result.verification).toBe("form")
    expect(result.confidence).toBeGreaterThanOrEqual(80)
  })

  it("verifies a same-domain source seed before running broader discovery", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === "https://example.com/contact-sales") {
        return new Response('<form><input type="email" name="email" /><textarea name="message"></textarea><button type="submit">Send</button></form>', {
          status: 200,
          headers: { "content-type": "text/html" },
        })
      }
      return new Response("", { status: 404 })
    }))

    const result = await discoverFormUrl({
      homeUrl: "example.com",
      region: "global",
      seedUrls: ["https://example.com/contact-sales", "https://unrelated.example.net/contact"],
    })

    expect(result).toMatchObject({
      formUrl: "https://example.com/contact-sales",
      method: "source",
      verification: "form",
      confidence: 96,
    })
  })

  it("allows same-domain and trusted hosted-form URLs, but rejects unrelated external domains", () => {
    expect(isAllowedFormUrlForOrigin("https://example.com", "https://example.com/contact")).toBe(true)
    expect(isAllowedFormUrlForOrigin("https://example.com", "https://support.example.com/contact")).toBe(true)
    expect(isAllowedFormUrlForOrigin("https://www.example.com", "https://example.com/contact")).toBe(true)
    expect(isAllowedFormUrlForOrigin("https://example.com", "https://docs.google.com/forms/d/e/abc/viewform")).toBe(true)
    expect(isAllowedFormUrlForOrigin("https://example.com", "https://evil.example.net/contact")).toBe(false)
  })

  it("uses Crawl4AI discovery when cheap homepage and sitemap checks do not find a form", async () => {
    vi.stubEnv("CRAWL4AI_BASE_URL", "https://crawl4.example")
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === "https://example.com") {
          return new Response("<html><body>no contact anchor</body></html>", {
            status: 200,
            headers: { "content-type": "text/html" },
          })
        }
        if (url === "https://example.com/sitemap.xml") return new Response("", { status: 404 })
        if (url === "https://crawl4.example/discover-form") {
          return new Response(JSON.stringify({ form_url: "https://example.com/contact-us" }), { status: 200 })
        }
        if (url === "https://example.com/contact-us") {
          return new Response('<h1>Contact us</h1><form><input type="email" name="email" /><textarea name="message"></textarea><button type="submit">Send</button></form>', { status: 200, headers: { "content-type": "text/html" } })
        }
        return new Response("", { status: 404 })
      }),
    )

    const result = await discoverFormUrl({ homeUrl: "example.com", region: "jp" })

    expect(result.formUrl).toBe("https://example.com/contact-us")
    expect(result.method).toBe("crawl4ai")
    expect(result.verification).toBe("form")
  })

  it("ignores unrelated external Crawl4AI form URLs and continues to local heuristics", async () => {
    vi.stubEnv("CRAWL4AI_BASE_URL", "https://crawl4.example")
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url === "https://example.com") {
          return new Response("<html><body>no contact anchor</body></html>", {
            status: 200,
            headers: { "content-type": "text/html" },
          })
        }
        if (url === "https://example.com/sitemap.xml") return new Response("", { status: 404 })
        if (url === "https://crawl4.example/discover-form") {
          return new Response(JSON.stringify({ form_url: "https://evil.example.net/contact" }), { status: 200 })
        }
        if (url === "https://example.com/contact") {
          return new Response('<h1>Contact us</h1><form><input type="email" name="email"><textarea name="message"></textarea><button type="submit">Send</button></form>', {
            status: 200,
            headers: { "content-type": "text/html" },
          })
        }
        return new Response("", { status: 404 })
      }),
    )

    const result = await discoverFormUrl({ homeUrl: "example.com", region: "jp" })

    expect(result.formUrl).toBe("https://example.com/contact")
    expect(result.method).toBe("heuristic")
    expect(result.verification).toBe("form")
  })

  it("does not classify a contact page without an actual form as form-qualified", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === "https://example.com") return new Response('<a href="/contact">Contact</a>', { status: 200, headers: { "content-type": "text/html" } })
      if (url === "https://example.com/contact") return new Response("Contact our sales team by phone.", { status: 200, headers: { "content-type": "text/html" } })
      return new Response("", { status: 404 })
    }))

    const result = await discoverFormUrl({ homeUrl: "example.com", region: "global", enableLlm: false })

    expect(result.formUrl).toBe("https://example.com/contact")
    expect(result.verification).toBe("page")
    expect(result.confidence).toBeLessThan(80)
  })

  it("continues past a contact-only page and finds an actual form on another common path", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === "https://example.com") return new Response('<a href="/contact">Contact</a>', { status: 200, headers: { "content-type": "text/html" } })
      if (url === "https://example.com/contact") return new Response("Contact our sales team.", { status: 200, headers: { "content-type": "text/html" } })
      if (url === "https://example.com/request-a-demo") return new Response('<h1>Request a demo</h1><form><input type="email" name="email" /><textarea name="message"></textarea><button type="submit">Send</button></form>', { status: 200, headers: { "content-type": "text/html" } })
      return new Response("", { status: 404 })
    }))

    const result = await discoverFormUrl({ homeUrl: "example.com", region: "global", enableLlm: false })

    expect(result.formUrl).toBe("https://example.com/request-a-demo")
    expect(result.verification).toBe("form")
  })
})
