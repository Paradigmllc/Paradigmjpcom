import { afterEach, describe, expect, it, vi } from "vitest"
import { getSocialConnectorStatuses } from "./social-publisher"
import { tokyoDateString } from "./social-pipeline"

afterEach(() => vi.unstubAllEnvs())

describe("SERICIA social automation policy", () => {
  it("uses the Tokyo business date at the UTC boundary", () => {
    expect(tokyoDateString(new Date("2026-08-01T15:30:00.000Z"))).toBe("2026-08-02")
  })

  it("keeps draft generation available while direct connectors are absent", () => {
    vi.stubEnv("META_IG_USER_ID", "")
    vi.stubEnv("META_IG_ACCESS_TOKEN", "")
    vi.stubEnv("META_GRAPH_API_VERSION", "")
    vi.stubEnv("PINTEREST_ACCESS_TOKEN", "")
    vi.stubEnv("PINTEREST_BOARD_ID", "")
    const connectors = getSocialConnectorStatuses()
    expect(connectors.find((item) => item.platform === "instagram")).toMatchObject({ configured: false, directPublishingSupported: true })
    expect(connectors.find((item) => item.platform === "pinterest")).toMatchObject({ configured: false, directPublishingSupported: true })
  })

  it("requires the complete credential set before enabling direct publication", () => {
    vi.stubEnv("META_IG_USER_ID", "ig-user")
    vi.stubEnv("META_IG_ACCESS_TOKEN", "secret")
    vi.stubEnv("META_GRAPH_API_VERSION", "v1")
    vi.stubEnv("PINTEREST_ACCESS_TOKEN", "secret")
    vi.stubEnv("PINTEREST_BOARD_ID", "board")
    const connectors = getSocialConnectorStatuses()
    expect(connectors.find((item) => item.platform === "instagram")?.configured).toBe(true)
    expect(connectors.find((item) => item.platform === "pinterest")?.configured).toBe(true)
  })
})
