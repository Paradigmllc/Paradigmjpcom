import { describe, expect, it } from "vitest"
import { parseCandidateCollectCommand } from "./agent-team-collector"

describe("agent team collector command parser", () => {
  it("routes country and stack list requests to lead candidate collection", () => {
    const parsed = parseCandidateCollectCommand("南アフリカ共和国のWooCommerceリスト全て収集して", {})

    expect(parsed).toEqual({
      countryCode: "ZA",
      technology: "WooCommerce",
      limit: 1000,
      verifyLimit: 120,
      promote: false,
    })
  })

  it("detects Swiss CRM requests and optional promotion", () => {
    const parsed = parseCandidateCollectCommand("スイスのHubSpot CRM事業者を100件収集して営業DBにインポート", {})

    expect(parsed?.countryCode).toBe("CH")
    expect(parsed?.technology).toBe("HubSpot")
    expect(parsed?.limit).toBe(100)
    expect(parsed?.verifyLimit).toBe(50)
    expect(parsed?.promote).toBe(true)
  })

  it("ignores plain existing-list requests without country", () => {
    expect(parseCandidateCollectCommand("東京の美容院リスト20件", {})).toBeNull()
  })
})
