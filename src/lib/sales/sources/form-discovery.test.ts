/**
 * form-discovery.test.ts — URL ヘルパ + Layer 0/fallback の単体テスト
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import { normalizeOrigin, resolveHref, discoverFormUrl } from "./form-discovery"

afterEach(() => vi.unstubAllGlobals())

describe("URL helpers", () => {
  it("normalizeOrigin", () => {
    expect(normalizeOrigin("example.com")).toBe("https://example.com")
    expect(normalizeOrigin("https://a.com/path?q=1")).toBe("https://a.com")
    expect(normalizeOrigin("http://b.co.jp")).toBe("http://b.co.jp")
    expect(normalizeOrigin("not a url with spaces")).toBe(null)
  })

  it("resolveHref", () => {
    expect(resolveHref("https://a.com", "/contact")).toBe("https://a.com/contact")
    expect(resolveHref("https://a.com", "https://a.com/x")).toBe("https://a.com/x")
  })
})

describe("discoverFormUrl Layer 0 (homepage anchor)", () => {
  it("homepageHtml の contact anchor を検出 (fetch 不要)", async () => {
    const r = await discoverFormUrl({
      homeUrl: "example.com",
      homepageHtml: '<nav><a href="/contact">お問い合わせ</a></nav>',
    })
    expect(r.method).toBe("regex")
    expect(r.formUrl).toBe("https://example.com/contact")
    expect(r.confidence).toBeGreaterThan(0)
  })

  it("全 layer ミス時は origin fallback を返す", async () => {
    // sitemap も heuristic も 404 にする
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 404 })),
    )
    const r = await discoverFormUrl({
      homeUrl: "example.com",
      homepageHtml: "<div>no contact link</div>",
    })
    expect(r.method).toBe("fallback")
    expect(r.formUrl).toBe("https://example.com")
    expect(r.confidence).toBeLessThan(50)
  })
})
