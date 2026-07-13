import { describe, expect, it } from "vitest"
import { extractVerifiedPublicFacts } from "./demo-deepseek-enhancer"

describe("extractVerifiedPublicFacts", () => {
  it("serializes only scalar verified facts", () => {
    const result = extractVerifiedPublicFacts({
      public_facts: {
        address: "東京都世田谷区桜2丁目10-7",
        specialty: "フレンチトーストとドリップコーヒー",
        nested: { unsupported: true },
      },
    })

    expect(result).toContain("address: 東京都世田谷区桜2丁目10-7")
    expect(result).toContain("specialty: フレンチトーストとドリップコーヒー")
    expect(result).not.toContain("unsupported")
  })

  it("returns an explicit empty marker when facts are unavailable", () => {
    expect(extractVerifiedPublicFacts(null)).toBe("（確認済み公開情報なし）")
  })
})
