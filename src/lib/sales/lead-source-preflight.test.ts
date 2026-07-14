import { describe, expect, it, vi } from "vitest"
import { assessLeadSourceWebsite } from "./lead-source-preflight"

const now = () => new Date("2026-07-15T00:00:00.000Z")
const publicDns = async () => [{ address: "8.8.8.8", family: 4 }]

function dnsError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code })
}

describe("assessLeadSourceWebsite", () => {
  it("marks a public HTTPS HTML homepage as eligible", async () => {
    const fetchUrl = vi.fn().mockResolvedValue(new Response("<html></html>", {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    }))

    const result = await assessLeadSourceWebsite({ domain: "store.example", website_url: "https://store.example" }, {
      resolveHost: publicDns,
      fetchUrl,
      now,
    })

    expect(result).toMatchObject({ status: "eligible", reason: "website_ready", checkedAt: "2026-07-15T00:00:00.000Z" })
    expect(result.evidence).toMatchObject({ httpStatus: 200, addressCount: 1 })
  })

  it("permanently rejects an NXDOMAIN without spending a candidate run", async () => {
    const fetchUrl = vi.fn()
    const result = await assessLeadSourceWebsite({ domain: "gone.example", website_url: "https://gone.example" }, {
      resolveHost: async () => { throw dnsError("ENOTFOUND") },
      fetchUrl,
      now,
    })

    expect(result).toMatchObject({ status: "rejected", reason: "dns_enotfound" })
    expect(fetchUrl).not.toHaveBeenCalled()
  })

  it("keeps transient DNS failures retryable after two bounded attempts", async () => {
    const resolveHost = vi.fn().mockRejectedValue(dnsError("EAI_AGAIN"))
    const result = await assessLeadSourceWebsite({ domain: "later.example", website_url: "https://later.example" }, {
      resolveHost,
      fetchUrl: vi.fn(),
      now,
    })

    expect(result).toMatchObject({ status: "retryable", reason: "dns_eai_again" })
    expect(resolveHost).toHaveBeenCalledTimes(2)
  })

  it("rejects private DNS answers before making an HTTP request", async () => {
    const fetchUrl = vi.fn()
    const result = await assessLeadSourceWebsite({ domain: "internal.example", website_url: "https://internal.example" }, {
      resolveHost: async () => [{ address: "127.0.0.1", family: 4 }],
      fetchUrl,
      now,
    })

    expect(result).toMatchObject({ status: "rejected", reason: "dns_private_or_reserved" })
    expect(fetchUrl).not.toHaveBeenCalled()
  })

  it("keeps rate limits and server failures retryable", async () => {
    const rateLimited = await assessLeadSourceWebsite({ domain: "busy.example", website_url: "https://busy.example" }, {
      resolveHost: publicDns,
      fetchUrl: vi.fn().mockResolvedValue(new Response(null, { status: 429 })),
      now,
    })
    const unavailable = await assessLeadSourceWebsite({ domain: "down.example", website_url: "https://down.example" }, {
      resolveHost: publicDns,
      fetchUrl: vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
      now,
    })

    expect(rateLimited).toMatchObject({ status: "retryable", reason: "http_429" })
    expect(unavailable).toMatchObject({ status: "retryable", reason: "http_503" })
  })

  it("rejects a successful non-HTML homepage", async () => {
    const result = await assessLeadSourceWebsite({ domain: "feed.example", website_url: "https://feed.example" }, {
      resolveHost: publicDns,
      fetchUrl: vi.fn().mockResolvedValue(new Response("{}", { status: 200, headers: { "content-type": "application/json" } })),
      now,
    })

    expect(result).toMatchObject({ status: "rejected", reason: "non_html_homepage" })
  })
})
