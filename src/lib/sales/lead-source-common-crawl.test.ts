import { afterEach, describe, expect, it, vi } from "vitest"
import { commonCrawlCacheObjectKey, fetchCommonCrawlDomainSignal, fetchCommonCrawlIntersection } from "./lead-source-common-crawl"

function query(filter: string): string {
  const params = new URLSearchParams({ url: "*.co.uk", output: "json", collapse: "urlkey", fl: "url,timestamp,digest", pageSize: "100" })
  params.append("filter", "status:200")
  params.append("filter", "mime:text/html")
  params.append("filter", filter)
  return `https://index.commoncrawl.org/CC-MAIN-2026-25-index?${params.toString()}`
}

describe("fetchCommonCrawlIntersection", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL
  })

  it("keeps only domains with both contact and offer-path evidence", async () => {
    const responses = [
      [
        { url: "https://alpha.co.uk/contact", timestamp: "20260601000000", digest: "A" },
        { url: "https://contact-only.co.uk/contact", timestamp: "20260601000000", digest: "B" },
      ],
      [
        { url: "https://alpha.co.uk/pricing", timestamp: "20260602000000", digest: "C" },
        { url: "https://offer-only.co.uk/pricing", timestamp: "20260602000000", digest: "D" },
      ],
    ]
    let index = 0
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      responses[index++].map((row) => JSON.stringify(row)).join("\n"),
      { status: 200, headers: { "content-type": "application/x-ndjson" } },
    )))

    const result = await fetchCommonCrawlIntersection({
      contactQueryUrl: query("url:contact"),
      offerQueryUrl: query("url:pricing"),
      signal: "saas",
      maxRecords: 5_000,
    })

    expect(result.rawCount).toBe(3)
    expect(result.rows).toEqual([expect.objectContaining({
      external_id: "alpha.co.uk:saas",
      company_name: "Alpha",
      website_url: "https://alpha.co.uk",
      contact_page_url: "https://alpha.co.uk/contact",
      offer_page_url: "https://alpha.co.uk/pricing",
    })])
  })

  it("rejects unpinned or non-official index queries", async () => {
    await expect(fetchCommonCrawlIntersection({
      contactQueryUrl: "https://example.com/index?output=json&limit=1",
      offerQueryUrl: query("url:pricing"),
      signal: "saas",
      maxRecords: 5_000,
    })).rejects.toThrow("official HTTPS index host")
  })

  it("collects bounded domain signals across pinned pages", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: URL | RequestInfo) => {
      const page = new URL(String(url)).searchParams.get("page")
      const row = page === "0"
        ? { url: "https://alpha.co.uk/contact", timestamp: "20260601000000", digest: "A" }
        : { url: "https://beta.co.uk/contact-us", timestamp: "20260602000000", digest: "B" }
      return new Response(JSON.stringify(row), { status: 200 })
    }))

    const result = await fetchCommonCrawlDomainSignal({
      queryUrl: query("url:contact"),
      signal: "contact",
      pages: [0, 1],
      maxRecords: 5_000,
    })

    expect(result.rows).toEqual([
      expect.objectContaining({ website_url: "https://alpha.co.uk", contact_page_url: "https://alpha.co.uk/contact" }),
      expect.objectContaining({ website_url: "https://beta.co.uk", contact_page_url: "https://beta.co.uk/contact-us" }),
    ])
  })

  it("ignores malformed JSONL rows without discarding valid evidence", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response([
      JSON.stringify({ url: "https://valid.co.uk/contact", timestamp: "20260601000000", digest: "A" }),
      '{"url":"https://broken.co.uk/contact",',
    ].join("\n"), { status: 200 })))

    const result = await fetchCommonCrawlDomainSignal({
      queryUrl: query("url:contact"),
      signal: "contact",
      pages: [8],
      maxRecords: 5_000,
    })

    expect(result.rows).toEqual([
      expect.objectContaining({ website_url: "https://valid.co.uk", contact_page_url: "https://valid.co.uk/contact" }),
    ])
  })

  it("retries transient index failures", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("gateway timeout", { status: 504 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        url: "https://recovered.co.uk/contact",
        timestamp: "20260601000000",
        digest: "A",
      }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const result = await fetchCommonCrawlDomainSignal({
      queryUrl: query("url:contact"),
      signal: "contact",
      pages: [9],
      maxRecords: 5_000,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.rows).toEqual([expect.objectContaining({ website_url: "https://recovered.co.uk" })])
  })

  it("keeps successful page evidence when another page is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: URL | RequestInfo) => {
      const page = new URL(String(url)).searchParams.get("page")
      return page === "10"
        ? new Response(JSON.stringify({ url: "https://partial.co.uk/contact", timestamp: "20260601000000", digest: "A" }), { status: 200 })
        : new Response("bad request", { status: 400 })
    }))

    const result = await fetchCommonCrawlDomainSignal({
      queryUrl: query("url:contact"),
      signal: "contact",
      pages: [10, 11],
      maxRecords: 5_000,
    })

    expect(result.rows).toEqual([expect.objectContaining({ website_url: "https://partial.co.uk" })])
  })

  it("uses a deterministic R2 cache before the unreliable direct index", async () => {
    const queryUrl = query("url:shop")
    process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL = "https://cache.example.com"
    const fetchMock = vi.fn(async (url: URL | RequestInfo) => String(url).startsWith("https://cache.example.com/")
      ? new Response(JSON.stringify({ url: "https://cached-shop.co.uk/shop", timestamp: "20260601000000", digest: "CACHE" }), { status: 200 })
      : Promise.reject(new TypeError("fetch failed")))
    vi.stubGlobal("fetch", fetchMock)

    const result = await fetchCommonCrawlDomainSignal({
      queryUrl,
      signal: "commerce",
      pages: [37],
      maxRecords: 5_000,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      `https://cache.example.com/${commonCrawlCacheObjectKey(queryUrl)}`,
      expect.objectContaining({ redirect: "error" }),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.rows).toEqual([expect.objectContaining({
      website_url: "https://cached-shop.co.uk",
      offer_page_url: "https://cached-shop.co.uk/shop",
    })])
  })
})
