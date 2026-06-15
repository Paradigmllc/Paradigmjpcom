import { describe, expect, it } from "vitest"
import { parseCandidateCollectCommand } from "./agent-team-collector"

describe("agent team collector command parser", () => {
  it("routes country and stack list requests to lead candidate collection", () => {
    const parsed = parseCandidateCollectCommand("南アフリカ共和国のWooCommerceリスト全て収集して", {})

    expect(parsed).toEqual({
      countryCode: "ZA",
      technology: "WooCommerce",
      limit: 5000,
      verifyLimit: 5000,
      promote: true,
      minOpportunityScore: 0,
    })
  })

  it("detects Swiss CRM requests and optional promotion", () => {
    const parsed = parseCandidateCollectCommand("スイスのHubSpot CRM事業者を100件収集して営業DBにインポート", {})

    expect(parsed?.countryCode).toBe("CH")
    expect(parsed?.technology).toBe("HubSpot")
    expect(parsed?.limit).toBe(100)
    expect(parsed?.verifyLimit).toBe(100)
    expect(parsed?.promote).toBe(true)
    expect(parsed?.minOpportunityScore).toBe(50)
  })

  it("keeps explicit large batches instead of clipping at one thousand", () => {
    const parsed = parseCandidateCollectCommand("ZA\u306eWooCommerce\u30ea\u30b9\u30c85000\u4ef6\u53ce\u96c6\u3057\u3066", {})

    expect(parsed?.countryCode).toBe("ZA")
    expect(parsed?.technology).toBe("WooCommerce")
    expect(parsed?.limit).toBe(5000)
    expect(parsed?.verifyLimit).toBe(5000)
    expect(parsed?.promote).toBe(true)
    expect(parsed?.minOpportunityScore).toBe(0)
  })

  it("routes Egypt Shopify passive inventory requests", () => {
    const parsed = parseCandidateCollectCommand("OpenCode Egypt Shopify all 100 sites collect list", {})

    expect(parsed?.countryCode).toBe("EG")
    expect(parsed?.technology).toBe("Shopify")
    expect(parsed?.limit).toBe(100)
    expect(parsed?.minOpportunityScore).toBe(0)
  })

  it("allows candidate-only collection when explicitly requested", () => {
    const parsed = parseCandidateCollectCommand("スイスのHubSpotリスト全て収集して候補だけ保存", {})

    expect(parsed?.countryCode).toBe("CH")
    expect(parsed?.technology).toBe("HubSpot")
    expect(parsed?.promote).toBe(false)
    expect(parsed?.minOpportunityScore).toBe(0)
  })

  it("ignores plain existing-list requests without country", () => {
    expect(parseCandidateCollectCommand("東京の美容院リスト20件", {})).toBeNull()
  })
})
