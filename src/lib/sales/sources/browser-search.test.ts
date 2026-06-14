import { afterEach, describe, expect, it, vi } from "vitest"
import { extractDomains, getBrowserSearchBackendStatus } from "./browser-search"

describe("browser search backend status", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("normalizes FLARESOLVERR_API_URL to the /v1 endpoint", () => {
    vi.stubEnv("FLARESOLVERR_API_URL", "http://flaresolverr:8191")
    vi.stubEnv("FLARESOLVERR_URL", "")
    vi.stubEnv("STEEL_BASE_URL", "")

    const status = getBrowserSearchBackendStatus()

    expect(status.configured).toBe(true)
    expect(status.providers).toEqual(["flaresolverr"])
    expect(status.flaresolverrUrl).toBe("http://flaresolverr:8191/v1")
  })

  it("fails closed when no browser backend is configured", () => {
    vi.stubEnv("FLARESOLVERR_API_URL", "")
    vi.stubEnv("FLARESOLVERR_URL", "")
    vi.stubEnv("STEEL_BASE_URL", "")

    const status = getBrowserSearchBackendStatus()

    expect(status.configured).toBe(false)
    expect(status.error).toContain("FLARESOLVERR_URL or STEEL_BASE_URL")
  })

  it("extracts result links but rejects browser search provider links", () => {
    const html = `
      <a href="/url?q=https%3A%2F%2Fexample-shop.jp%2Fcontact&sa=U">Example Shop</a>
      <a href="https://account.brave.com/sign-in">Brave account</a>
      <a href="https://search.brave.com/search?q=shopify">Brave search</a>
      <a href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Fsalon-example.jp%2Fabout">Salon</a>
    `

    expect(extractDomains(html)).toEqual(["example-shop.jp", "salon-example.jp"])
  })
})
