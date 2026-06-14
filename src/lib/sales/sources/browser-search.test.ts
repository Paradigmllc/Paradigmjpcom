import { afterEach, describe, expect, it, vi } from "vitest"
import { getBrowserSearchBackendStatus } from "./browser-search"

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
})
