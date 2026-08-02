import { describe, expect, it } from "vitest"
import { assessScheduledBaseSync } from "./base-sync-automation"

const ready = {
  baseAppConfigured: true,
  baseShopConnected: true,
  shopifyConfigured: true,
  syncRunning: false,
  linkedProductCount: 20,
}

describe("scheduled BASE sync safety", () => {
  it("allows a normal catalog delta", () => {
    expect(assessScheduledBaseSync({ ...ready, sourceCount: 18 })).toBeNull()
  })

  it("blocks missing connections and an empty source", () => {
    expect(assessScheduledBaseSync({ ...ready, baseShopConnected: false, sourceCount: null })).toContain("OAuth")
    expect(assessScheduledBaseSync({ ...ready, sourceCount: 0 })).toContain("0件")
  })

  it("blocks a catalog collapse", () => {
    expect(assessScheduledBaseSync({ ...ready, sourceCount: 9 })).toContain("急減")
  })

  it("blocks an abnormal catalog spike", () => {
    expect(assessScheduledBaseSync({ ...ready, linkedProductCount: 150, sourceCount: 301 })).toContain("異常増加")
  })

  it("allows the first non-empty import", () => {
    expect(assessScheduledBaseSync({ ...ready, linkedProductCount: 0, sourceCount: 500 })).toBeNull()
  })
})
