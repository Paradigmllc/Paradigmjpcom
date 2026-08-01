import { describe, expect, it } from "vitest"
import { JAPAN_ENTRY_MARKET_EVIDENCE } from "./japan-entry-market-evidence"

describe("Japan Entry public market evidence", () => {
  it("keeps every pressure claim dated and linked to an HTTPS primary source", () => {
    for (const item of Object.values(JAPAN_ENTRY_MARKET_EVIDENCE)) {
      expect(item.sourceUrl).toMatch(/^https:\/\//)
      expect(item.observedAt).toBeTruthy()
    }
  })

  it("uses official values without an unsupported global rank claim", () => {
    expect(JAPAN_ENTRY_MARKET_EVIDENCE.population.value).toBe("123.05M")
    expect(JAPAN_ENTRY_MARKET_EVIDENCE.ecommerce.value).toBe("¥26.1T")
    expect(JAPAN_ENTRY_MARKET_EVIDENCE.fx.value).toBe("¥158 / $1")
    expect(JSON.stringify(JAPAN_ENTRY_MARKET_EVIDENCE).toLowerCase()).not.toContain("third-largest")
  })
})
