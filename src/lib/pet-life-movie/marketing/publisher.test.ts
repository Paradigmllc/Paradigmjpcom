import { afterEach, describe, expect, it } from "vitest"
import { getPetMarketingConnectorStatuses, isDirectPetMarketingPlatform } from "./publisher"

const keys = [
  "PET_MOVIE_META_IG_USER_ID",
  "PET_MOVIE_META_IG_ACCESS_TOKEN",
  "PET_MOVIE_META_GRAPH_API_VERSION",
  "PET_MOVIE_PINTEREST_ACCESS_TOKEN",
  "PET_MOVIE_PINTEREST_BOARD_ID",
  "PET_MOVIE_TIKTOK_ACCESS_TOKEN",
  "PET_MOVIE_YOUTUBE_REFRESH_TOKEN",
] as const

const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]))

afterEach(() => {
  for (const key of keys) {
    const value = original[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe("Pet marketing connectors", () => {
  it("fails closed when brand-specific credentials are absent", () => {
    for (const key of keys) delete process.env[key]
    const connectors = getPetMarketingConnectorStatuses()
    expect(connectors.filter((connector) => connector.directPublishingSupported)).toHaveLength(2)
    expect(connectors.every((connector) => !connector.configured)).toBe(true)
  })

  it("requires the complete Instagram and Pinterest credential sets", () => {
    process.env.PET_MOVIE_META_IG_USER_ID = "ig-id"
    process.env.PET_MOVIE_META_IG_ACCESS_TOKEN = "ig-token"
    process.env.PET_MOVIE_META_GRAPH_API_VERSION = "v23.0"
    process.env.PET_MOVIE_PINTEREST_ACCESS_TOKEN = "pin-token"
    process.env.PET_MOVIE_PINTEREST_BOARD_ID = "board-id"
    const connectors = getPetMarketingConnectorStatuses()
    expect(connectors.find((connector) => connector.platform === "instagram")?.configured).toBe(true)
    expect(connectors.find((connector) => connector.platform === "pinterest")?.configured).toBe(true)
    expect(isDirectPetMarketingPlatform("instagram")).toBe(true)
    expect(isDirectPetMarketingPlatform("youtube")).toBe(false)
  })
})
